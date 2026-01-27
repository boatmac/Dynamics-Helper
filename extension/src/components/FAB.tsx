import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageReader, ScrapedData } from '../utils/pageReader';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';
import { trackEvent, trackException } from '../utils/telemetry';

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
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        
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
            width: '400px',
            height: '500px', // Fixed initial height to support resize
            minWidth: '300px',
            minHeight: '200px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2147483647,
            pointerEvents: 'auto',
            border: '1px solid #e5e7eb',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            resize: 'both',
            overflow: 'hidden' // Required for resize handle
        }}>
            {/* Header - Draggable Area */}
            <div 
                onMouseDown={handleMouseDown}
                style={{ 
                    padding: '12px 16px', 
                    borderBottom: '1px solid #f3f4f6', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: '#f9fafb',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none'
                }}
            >
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>{title || '🤖 Copilot Analysis'}</h3>
                <button 
                    onClick={onClose} 
                    style={{ 
                        border: 'none', 
                        background: 'none', 
                        cursor: 'pointer', 
                        fontSize: '18px', 
                        color: '#6b7280',
                        padding: '4px',
                        lineHeight: 1
                    }}
                    title="Close"
                >
                    ×
                </button>
            </div>

            {/* Content Area */}
            <div style={{ 
                padding: '16px', 
                overflowY: 'auto', 
                flex: 1, 
                fontSize: '13px', 
                lineHeight: '1.6', 
                color: '#374151',
                // whiteSpace: 'pre-wrap' // Removed since ReactMarkdown handles this
            }}>
                {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                ) : (
                    "No analysis content received."
                )}
            </div>

            {/* Footer with Path */}
            {filePath && (
                <div style={{ 
                    padding: '10px 16px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #f3f4f6', 
                    fontSize: '11px', 
                    color: '#64748b',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px'
                }}>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>Saved report:</div>
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{filePath}</div>
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
        primaryColor: "#2563eb",
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {canGoBack && (
                                <button 
                                    onClick={navigateBack}
                                    className="dh-item"
                                    data-type="back"
                                    title="Back"
                                    style={{ padding: '0', border: 'none', margin: '0', width: 'auto' }}
                                >
                                </button>
                            )}
                            <h3 className="dh-title">Dynamics Helper</h3>
                        </div>
                        <button onClick={handleOpenOptions} title="Settings" className="dh-settings-btn">
                            ⚙️
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
                                    {item.type === 'folder' ? '📁' : item.type === 'link' ? '🔗' : '📝'}
                                </span>
                                <span className="dh-item-label">{item.label}</span>
                            </button>
                        ))}
                        
                        {currentItems.length === 0 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                                No items found
                            </div>
                        )}
                    </div>

                    {/* AI Tools Footer */}
                    <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 4px 4px 4px', marginTop: '4px' }}>
                        {/* Context Preview Box */}
                        <div style={{ marginBottom: '8px', border: '1px solid #fecaca', borderRadius: '4px', overflow: 'hidden' }}>
                            {/* Header / Toggle */}
                            <div 
                                onClick={() => setIsContextExpanded(!isContextExpanded)}
                                style={{
                                    padding: '6px 8px',
                                    background: '#fef2f2',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#991b1b',
                                    fontWeight: '600'
                                }}
                            >
                                <span>Case Context</span>
                                <span>{isContextExpanded ? '▼' : '▶'}</span>
                            </div>

                            {/* Collapsible Content */}
                            {isContextExpanded && (
                                <div style={{ padding: '8px', background: '#fff' }}>
                                    <textarea
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
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            fontSize: '11px',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            color: '#374151',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                        placeholder="Context will appear here..."
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                             <button 
                                onClick={handlePing}
                                style={{ 
                                    flex: 1, 
                                    padding: '4px 8px', 
                                    background: '#fff', 
                                    border: '1px solid #d1d5db', 
                                    color: '#4b5563', 
                                    fontSize: '11px', 
                                    borderRadius: '4px',
                                    cursor: 'pointer' 
                                }}
                            >
                                Ping
                            </button>
                            <button 
                                onClick={handleAnalyze}
                                disabled={!scrapedData?.errorText || isAnalyzing}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    color: '#fff',
                                    background: isAnalyzing ? '#9ca3af' : (scrapedData?.errorText ? '#2563eb' : '#d1d5db'),
                                    cursor: (!isAnalyzing && scrapedData?.errorText) ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                            </button>
                        </div>
                        {errorMsg && (
                            <div style={{ marginTop: '8px', padding: '8px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '10px' }}>
                                {errorMsg}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="dh-btn"
                style={{ backgroundColor: prefs.primaryColor }}
            >
                {isOpen ? (
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>×</span>
                ) : (
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{prefs.buttonText}</span>
                )}
            </button>
        </div>
    );
};

export default FAB;
