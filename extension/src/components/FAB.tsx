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
    AlertCircle
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
}> = ({ isOpen, onClose, title, content, filePath }) => {
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
            {filePath && (
                <div style={{ 
                    padding: '12px 20px', 
                    background: '#F8FAFC', 
                    borderTop: '1px solid #F1F5F9', 
                    fontSize: '12px', 
                    color: '#64748B',
                }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Folder size={12} /> Saved report:
                    </div>
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', background: '#FFFFFF', padding: '6px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        {filePath}
                    </div>
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
        path?: string 
    }>({ isOpen: false, title: '', content: '' });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [prefs, setPrefs] = useState({
        primaryColor: "#0D9488",
        buttonText: "DH",
        offsetBottom: 24,
        offsetRight: 24
    });
    
    // UI States
    const [isContextExpanded, setIsContextExpanded] = useState(false);

    // Menu Logic
    const { currentItems, canGoBack, navigateTo, navigateBack } = useMenuLogic();

    useEffect(() => {
        // Track when the FAB component (and thus the extension) loads
        // Wait 1 second to ensure the extension is fully loaded
        setTimeout(() => {
            trackEvent('Extension Loaded', { url: window.location.href });
        }, 1000);

        // Load preferences
        if (chrome?.storage?.local) {
            chrome.storage.local.get("dh_prefs", (result) => {
                if (result.dh_prefs) {
                    setPrefs(prev => ({ ...prev, ...(result.dh_prefs || {}) }));
                }
            });
            
            // Listen for changes
            const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
                if (area === "local" && changes.dh_prefs) {
                    const newValue = changes.dh_prefs.newValue || {};
                    setPrefs(prev => ({ ...prev, ...newValue }));
                }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => chrome.storage.onChanged.removeListener(listener);
        }
    }, []);

    // Auto-scan when opening
    useEffect(() => {
        if (isOpen) {
            const data = PageReader.scanForErrors();
            setScrapedData(data);
            setErrorMsg(null); // Clear previous errors
        }
    }, [isOpen]);

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

    const handleAnalyze = async () => {
        if (!scrapedData?.errorText) return;

        trackEvent('Analyze Clicked', { 
            hasContext: !!scrapedData.source,
            product: scrapedData.productCategory || 'Unknown'
        });

        setIsAnalyzing(true);
        setErrorMsg(null);
        
        try {
            // Construct a richer payload
            const fullContext = `
Title: ${scrapedData.ticketTitle || 'N/A'}
Product: ${scrapedData.productCategory || 'N/A'}
Description/Error: ${scrapedData.errorText}
            `.trim();

            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { 
                    action: "analyze_error", 
                    payload: {
                        text: fullContext,
                        context: scrapedData.source || "Unknown Context",
                        timestamp: new Date().toLocaleString()
                    },
                    requestId: crypto.randomUUID() 
                }
            });
            
            // Format response to be user friendly
            if (response.status === 'success') {
                const nativeResp = response.data;
                
                // Check Native Host wrapper status
                if (nativeResp && nativeResp.status === 'success') {
                    const analysisData = nativeResp.data;
                    
                    // Check Analysis function result
                    if (analysisData && !analysisData.error) {
                        setResultPopover({
                            isOpen: true,
                            title: '🤖 Copilot Analysis',
                            content: analysisData.markdown || JSON.stringify(analysisData, null, 2),
                            path: analysisData.saved_to
                        });
                        setIsOpen(false); // Close menu to show result
                    } else {
                        const errMsg = analysisData?.error || "Unknown analysis error";
                        setErrorMsg(`Analysis Error: ${errMsg}`);
                    }
                } else {
                    const hostError = nativeResp?.message || nativeResp?.error || "Unknown native host error";
                    setErrorMsg(`Host Error: ${hostError}`);
                }
            } else {
                setErrorMsg(`Error: ${response.message || 'Unknown error'}`);
            }
        } catch (e: any) {
            setErrorMsg(`Error: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
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
            const url = await resolveDynamicUrl(item.url);
            if (url) window.open(url, item.target || '_blank');
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
                                onClick={() => setIsContextExpanded(!isContextExpanded)}
                                className="dh-context-header"
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={14} color={scrapedData?.errorText ? '#0D9488' : '#94A3B8'} />
                                    Case Context
                                </span>
                                {isContextExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
                                                    // If so, just return it. Otherwise, build the initial format.
                                                    if (scrapedData.errorText && scrapedData.errorText.startsWith('## Case Title')) {
                                                        return scrapedData.errorText;
                                                    }

                                                    return [
                                                        `## Case Number\n\n${scrapedData.caseNumber || '<Captured Case Number>'}`,
                                                        `## Case Title\n\n${scrapedData.ticketTitle || '<Captured Title>'}`,
                                                        `## SAP\n\n${scrapedData.productCategory || '<Captured Support Area Path>'}`,
                                                        `## Description\n\n${scrapedData.errorText || '<Captured textarea value>'}`
                                                    ].join('\n\n');
                                                })()
                                                : ''
                                        }
                                        onChange={(e) => {
                                            setScrapedData(prev => ({ 
                                                ...(prev || {}), 
                                                ticketTitle: '', 
                                                productCategory: '',
                                                errorText: e.target.value 
                                            }));
                                        }}
                                        placeholder="Context will appear here..."
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                             <button 
                                onClick={handlePing}
                                className="dh-action-btn dh-btn-secondary"
                            >
                                <Activity size={14} /> Ping
                            </button>
                            <button 
                                onClick={handleAnalyze}
                                disabled={!scrapedData?.errorText || isAnalyzing}
                                className="dh-action-btn dh-btn-primary"
                            >
                                <Zap size={14} fill={isAnalyzing ? "none" : "currentColor"} />
                                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                            </button>
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

