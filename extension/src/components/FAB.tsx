import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageReader, ScrapedData } from '../utils/pageReader';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';
import { trackEvent, trackException } from '../utils/telemetry';
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

// Non-blocking Result Popover Component
const ResultPopover: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title?: string;
    content: string; 
    filePath?: string;
    duration?: string;
}> = ({ isOpen, onClose, title, content, filePath, duration }) => {
    // State for position and dragging
    const [position, setPosition] = useState({ x: Math.max(0, window.innerWidth - 550), y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Handle Dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only trigger drag if clicking the header background, not buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '450px',
            height: '600px', // Fixed initial height to support resize
            minWidth: '320px',
            minHeight: '200px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2147483647,
            pointerEvents: 'auto',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            resize: 'both',
            overflow: 'hidden' // Required for resize handle
        }}>
            {/* Header - Draggable Area */}
            <div 
                onMouseDown={handleMouseDown}
                style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid #F1F5F9', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: '#F8FAFC',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none'
                }}
            >
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title || '🤖 Copilot Analysis'}
                </h3>
                <button 
                    onClick={onClose} 
                    style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        color: '#64748B',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Close"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content Area */}
            <div style={{ 
                padding: '20px', 
                overflowY: 'auto', 
                flex: 1, 
                fontSize: '14px', 
                lineHeight: '1.6', 
                color: '#334155',
            }}>
                {content ? (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5em', fontWeight: '700', margin: '0.67em 0', color: '#0F172A' }} {...props} />,
                            h2: ({node, ...props}) => <h2 style={{ fontSize: '1.25em', fontWeight: '600', margin: '0.5em 0', color: '#1E293B' }} {...props} />,
                            h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1em', fontWeight: '600', margin: '0.5em 0', color: '#334155' }} {...props} />,
                            code: ({node, inline, className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline ? (
                                    <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', overflowX: 'auto', margin: '12px 0' }}>
                                        <code style={{ fontFamily: 'monospace', fontSize: '13px' }} {...props}>
                                            {children}
                                        </code>
                                    </div>
                                ) : (
                                    <code style={{ background: '#F1F5F9', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            a: ({node, ...props}) => <a style={{ color: '#0D9488', textDecoration: 'underline' }} {...props} />,
                            ul: ({node, ...props}) => <ul style={{ paddingLeft: '1.5em', margin: '1em 0' }} {...props} />,
                            li: ({node, ...props}) => <li style={{ marginBottom: '0.5em' }} {...props} />,
                            blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #E2E8F0', paddingLeft: '1em', margin: '1em 0', color: '#64748B' }} {...props} />
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                         <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                         <p>No analysis content received.</p>
                    </div>
                )}
            </div>

            {/* Footer with Path */}
            {(filePath || duration) && (
                <div style={{ 
                    padding: '12px 20px', 
                    background: '#F8FAFC', 
                    borderTop: '1px solid #F1F5F9', 
                    fontSize: '12px', 
                    color: '#64748B',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {duration && (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Activity size={12} />
                            <span>Analysis took: <b>{duration}</b></span>
                        </div>
                    )}
                    
                    {filePath && (
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Folder size={12} /> Saved report:
                            </div>
                            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', background: '#FFFFFF', padding: '6px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                {filePath}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FAB: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
    const [resultPopover, setResultPopover] = useState<{ 
        isOpen: boolean;
        title: string;
        content: string; 
        path?: string;
        duration?: string;
    }>({ isOpen: false, title: '', content: '' });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Status Bubble State
    const [statusBubble, setStatusBubble] = useState<{ 
        visible: boolean; 
        text: string; 
        type: 'default' | 'success' | 'error';
    }>({ visible: false, text: '', type: 'default' });
    const statusTimeoutRef = React.useRef<any>(null);
    
    // Concurrency Control
    const latestRequestId = React.useRef<string | null>(null);

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
    
    const [prefs, setPrefs] = useState({
        primaryColor: "#0D9488",
        buttonText: "DH",
        offsetBottom: 24,
        offsetRight: 24,
        userPrompt: "",
        autoAnalyzeMode: 'disabled',
        enableStatusBubble: true
    });
    
    // UI States
    const [isContextExpanded, setIsContextExpanded] = useState(false);
    // Track if auto-analysis has been attempted for the current data to prevent loops/timing issues
    const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

    // Duration Logic
    const [lastDuration, setLastDuration] = useState<string | null>(null);

    // Menu Logic
    const { currentItems, canGoBack, navigateTo, navigateBack } = useMenuLogic();

    // Load preferences on mount and listen for changes
    useEffect(() => {
        const loadPrefs = () => {
             chrome.storage.local.get("dh_prefs", (result) => {
                if (result.dh_prefs && typeof result.dh_prefs === 'object') {
                    setPrefs(prev => ({ ...prev, ...(result.dh_prefs as object) }));
                }
            });
        };

        loadPrefs();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes.dh_prefs) {
                 const newPrefs = changes.dh_prefs.newValue;
                 if (newPrefs && typeof newPrefs === 'object') {
                     setPrefs(prev => ({ ...prev, ...(newPrefs as object) }));
                 }
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // Helper to check if text is already a formatted template
    const isFormattedTemplate = (text: string) => {
        return text.startsWith('## Ticket ID') || text.startsWith('## Case Number');
    };

    // Helper to construct the standardized context template
    const constructTemplate = (data: ScrapedData, userPrompt: string = "") => {
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

        if (userPrompt) {
            parts.push(`## User Prompt\n\n${userPrompt}`);
        }

        return parts.join('\n\n');
    };

    // Auto-scan when opening
    useEffect(() => {
        // Initial scan on mount (even if closed) to support auto-analyze without opening
        const initialData = PageReader.scanForErrors();
        if (initialData) {
             setScrapedData(initialData);
        }

        if (isOpen) {
            const freshData = PageReader.scanForErrors();
            
            if (freshData) {
                // Determine if this is "new" data worth replacing the current state for
                // We check if we have no data, or if key identifiers (Case Number/Title) changed
                // This handles SPA navigation where the user moves to a new ticket without refreshing the page
                // We compare against the current scrapedData state
                const isNewContext = !scrapedData || 
                                     (freshData.caseNumber && freshData.caseNumber !== scrapedData.caseNumber) ||
                                     (freshData.ticketTitle && freshData.ticketTitle !== scrapedData.ticketTitle);

                if (isNewContext) {
                    setScrapedData(freshData);
                    setHasAutoAnalyzed(false); // Reset to allow auto-analysis for the new context
                    setErrorMsg(null);
                }
            }
        }
    }, [isOpen]); 

    // Polling for context changes in background (every 2s) to support auto-analyze without opening menu
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (isAnalyzing || isOpen) return; // Don't poll if busy or menu open (menu has its own logic)

            const freshData = PageReader.scanForErrors();
            if (freshData) {
                 setScrapedData(prev => {
                     // Check for significant change
                     // We need to update if *any* content changed (e.g. description loaded later), 
                     // so that the Auto-Analyze effect can re-evaluate with the better data.
                     const isDataDifferent = !prev || 
                                     freshData.caseNumber !== prev.caseNumber ||
                                     freshData.ticketTitle !== prev.ticketTitle ||
                                     freshData.description !== prev.description ||
                                     freshData.errorText !== prev.errorText;
                     
                     if (isDataDifferent) {
                         console.log("[DH] Background Poll: Data changed/enriched", freshData);
                         
                         // Determine if this is a WHOLE NEW ticket context
                         const isIdentityChange = !prev || 
                                                  (freshData.caseNumber && freshData.caseNumber !== prev.caseNumber) ||
                                                  (freshData.ticketTitle && freshData.ticketTitle !== prev.ticketTitle);

                         if (isIdentityChange) {
                             console.log("[DH] New Context Detected (Identity Change)");
                             setHasAutoAnalyzed(false); // Reset to allow auto-analysis for the new context
                             // If context changed, any pending analysis for previous context is invalid
                             latestRequestId.current = null;
                             // Hide any ongoing status bubble immediately
                             setStatusBubble(prev => ({ ...prev, visible: false }));
                         } else {
                             // Same identity, but maybe description loaded?
                             // We update the data, which triggers the Auto-Analyze effect again.
                             // If hasAutoAnalyzed was false (because check failed previously), it might succeed now.
                             // If it was true, it stays true (no double analysis).
                             console.log("[DH] Context Enriched (Same Identity)");
                         }
                         return freshData;
                     }
                     return prev;
                 });
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [isAnalyzing, isOpen]);

    // Separate effect for Auto Analyze to ensure state (prefs, scrapedData) is current
    useEffect(() => {
        if (!scrapedData || hasAutoAnalyzed) return;

        // --- Auto Analyze Logic ---
        if (prefs.autoAnalyzeMode === 'always') {
            // Check if we have valid data to analyze
            // For auto-analyze, we construct the template if needed to ensure length check passes
            // We use the helper to get the "full" text that would be analyzed
            const fullText = constructTemplate(scrapedData, prefs.userPrompt);
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
                    // Immediate feedback: Set analyzing state so UI reflects it instantly
                    setIsAnalyzing(true);
                    showStatusBubble("Analyzing...", 'default', 0); // Show analyzing status persistently until done
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
                // Immediate feedback: Set analyzing state so UI reflects it instantly
                setIsAnalyzing(true);
                showStatusBubble("Analyzing Critical Case...", 'default', 0);
                setTimeout(() => handleAnalyze(scrapedData), 100); // Reduced delay
            }
        }
    }, [isOpen, scrapedData, prefs.autoAnalyzeMode, prefs.userPrompt, hasAutoAnalyzed]);

    const handleRefreshContext = () => {
        const data = PageReader.scanForErrors();
        
        // Ensure data is not null before processing
        if (data) {
             // Force the text update by resetting the "edited" state implicitly
            setScrapedData(data);
            setHasAutoAnalyzed(false); // Reset so auto-analyze can run again if enabled
            setErrorMsg(null);
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
            setResultPopover({
                isOpen: true,
                title: '⚡ Ping Result',
                content: "```json\n" + JSON.stringify(response, null, 2) + "\n```"
            });
            // Also close menu to show result clearly? Optional.
            // setIsOpen(false); 
        } catch (e: any) {
            setResultPopover({
                isOpen: true,
                title: '❌ Ping Error',
                content: `Error: ${e.message}`
            });
        }
    };

    const handleAnalyze = async (dataToAnalyze: ScrapedData | null = null) => {
        // Use provided data or fall back to state
        const targetData = dataToAnalyze || scrapedData;

        if (!targetData) return;
        // Check if we have enough info to analyze (either error text OR title)
        const hasContent = targetData.errorText || targetData.description || targetData.ticketTitle;
        if (!hasContent) return;

        trackEvent('Analyze Clicked', { 
            hasContext: !!targetData.source,
            product: targetData.productCategory || 'Unknown'
        });

        setIsAnalyzing(true);
        setErrorMsg(null);
        const startTime = Date.now();
        
        // Safety timeout to prevent infinite "Analyzing..." state
        const timeoutId = setTimeout(() => {
            setIsAnalyzing(prev => {
                if (prev) {
                    setErrorMsg("Analysis timed out. Please try again.");
                    showStatusBubble("Analysis timed out", 'error', 5000);
                    trackEvent('Analyze Timeout');
                    return false;
                }
                return prev;
            });
        }, 310000); // 310 seconds timeout

        try {
            // Construct payload
            // If the errorText ALREADY looks like our full markdown template (starts with ## Ticket ID or ## Case Number), use it as is.
            // Otherwise (Auto-Analyze or fresh scan), construct the template.
            let fullContext = "";
            if (targetData.errorText && (targetData.errorText.startsWith('## Ticket ID') || targetData.errorText.startsWith('## Case Number'))) {
                fullContext = targetData.errorText;
            } else {
                fullContext = constructTemplate(targetData, prefs.userPrompt);
            }

            // Only show bubble if we initiated manually and it wasn't already shown by auto-analyze logic
            if (!statusBubble.visible) {
                 showStatusBubble("Analyzing...", 'default', 0);
            }

            const requestId = crypto.randomUUID();
            latestRequestId.current = requestId;

            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { 
                    action: "analyze_error", 
                    payload: {
                        text: fullContext,
                        context: targetData.source || "Unknown Context",
                        timestamp: new Date().toLocaleString()
                    },
                    requestId: requestId 
                }
            });
            
            // Check if context switched while we were waiting
            if (latestRequestId.current !== requestId) {
                console.log("Ignoring outdated analysis result");
                return;
            }

            clearTimeout(timeoutId); // Clear timeout on response
            
            // Format response to be user friendly
            if (response.status === 'success') {
                const nativeResp = response.data;
                
                // Check Native Host wrapper status
                if (nativeResp && nativeResp.status === 'success') {
                    const analysisData = nativeResp.data;
                    
                    // Check Analysis function result
                    if (analysisData && !analysisData.error) {
                        setErrorMsg(null); // Clear any potential timeout errors if we recovered
                        const duration = (Date.now() - startTime) / 1000;
                        trackEvent('Analyze Success', { durationSeconds: duration });
                        setLastDuration(`${duration.toFixed(1)}s`);
                        showStatusBubble(`Analysis Complete (${duration.toFixed(1)}s)`, 'success', 3000);

                        setResultPopover({
                            isOpen: true,
                            title: '🤖 Copilot Analysis',
                            content: analysisData.markdown || JSON.stringify(analysisData, null, 2),
                            path: analysisData.saved_to,
                            duration: `${duration.toFixed(1)}s`
                        });
                        setIsOpen(false); // Close menu to show result
                    } else {
                        const errMsg = analysisData?.error || "Unknown analysis error";
                        setErrorMsg(`Analysis Error: ${errMsg}`);
                        showStatusBubble("Analysis Failed", 'error', 4000);
                        trackEvent('Analyze Failed', { error: errMsg });
                    }
                } else {
                    const hostError = nativeResp?.message || nativeResp?.error || "Unknown native host error";
                    setErrorMsg(`Host Error: ${hostError}`);
                    showStatusBubble("Host Error", 'error', 4000);
                    trackEvent('Analyze Host Error', { error: hostError });
                }
            } else {
                setErrorMsg(`Error: ${response.message || 'Unknown error'}`);
                showStatusBubble("Communication Error", 'error', 4000);
            }
        } catch (e: any) {
            setErrorMsg(`Error: ${e.message}`);
            showStatusBubble("Error", 'error', 4000);
            trackEvent('Analyze Exception', { error: e.message });
        } finally {
            setIsAnalyzing(false);
            // Don't clear bubble here immediately if success/error, let the timeout handle it. 
            // If manual cancel or something else, we might need to check.
        }
    };

    const handleOpenOptions = () => {
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
        setIsOpen(false);
    };

    const handleItemClick = async (item: MenuItem) => {
        if (item.type === 'folder') {
            navigateTo(item);
        } else if (item.type === 'link' && item.url) {
            trackEvent('Bookmark Link Clicked', { label: item.label, url: item.url });
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
            } catch (e) {
                console.error("Failed to open link:", e);
            }
            setIsOpen(false);
        } else if (item.type === 'markdown') {
            trackEvent('Bookmark Note Clicked', { label: item.label });
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
        <div className="dh-container">
            {/* Analysis Result Popover */}
            <ResultPopover 
                isOpen={resultPopover.isOpen} 
                onClose={() => setResultPopover(prev => ({ ...prev, isOpen: false }))} 
                title={resultPopover.title}
                content={resultPopover.content}
                filePath={resultPopover.path}
            />

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
                                    title="Back"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            <h3 className="dh-title">Dynamics Helper</h3>
                        </div>
                        <button onClick={handleOpenOptions} title="Settings" className="dh-settings-btn">
                            <Settings size={16} />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
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
                                <div>No items found</div>
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
                                    <span>Case Context</span>
                                    {isContextExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRefreshContext(); }}
                                    title="Refresh Context (Re-scan page)"
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
                                                    // Check if we already have the formatted text in errorText (from previous edits)
                                                    // AND it starts with our known header (a weak check but simple)
                                                    if (scrapedData.errorText && (scrapedData.errorText.startsWith('## Ticket ID') || scrapedData.errorText.startsWith('## Case Number'))) {
                                                        return scrapedData.errorText;
                                                    }
                                                    // Use the shared helper
                                                    return constructTemplate(scrapedData, prefs.userPrompt);
                                                })()
                                                : ''
                                        }
                                        onChange={(e) => {
                                            const newVal = e.target.value;
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
                                        placeholder="Context will appear here..."
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="dh-actions-row">
                             <button 
                                onClick={handlePing}
                                className="dh-action-btn dh-btn-secondary"
                            >
                                <Activity size={14} /> Ping
                            </button>
                            
                            {/* Analyze Button with Smart Tooltip/Status */}
                            <div className="relative group flex-1">
                                <button 
                                    onClick={() => handleAnalyze()}
                                    disabled={!scrapedData?.errorText || isAnalyzing}
                                    className="dh-action-btn dh-btn-primary w-full"
                                >
                                    <Zap size={14} fill={isAnalyzing ? "none" : "currentColor"} />
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                                </button>
                                
                                {/* Info Tooltip - Always show "Analyzing..." tooltip if busy, otherwise show last run */}
                                {(isAnalyzing || lastDuration) && (
                                     <div className={cn(
                                         "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-white text-[10px] rounded shadow-sm whitespace-nowrap transition-opacity pointer-events-none z-50",
                                         isAnalyzing ? "bg-amber-600 opacity-100" : "bg-slate-800 opacity-0 group-hover:opacity-100"
                                     )}>
                                         {isAnalyzing ? "Auto-Analysis In Progress..." : `Last run: ${lastDuration}`}
                                     </div>
                                )}
                            </div>
                        </div>
                        {errorMsg && (
                            <div className="dh-error-msg">
                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{errorMsg}</span>
                            </div>
                        )}
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
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{prefs.buttonText}</span>
                )}
            </button>
        </div>
    );
};

export default FAB;

