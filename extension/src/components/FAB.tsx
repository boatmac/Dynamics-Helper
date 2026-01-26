import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageReader, ScrapedData } from '../utils/pageReader';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';

// Non-blocking Result Popover Component
const ResultPopover: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    content: string; 
    filePath?: string;
}> = ({ isOpen, onClose, content, filePath }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '90px', // Align with top of FAB roughly
            right: '100px', // Push to the left of the FAB
            width: '400px',
            maxWidth: 'calc(100vw - 120px)',
            maxHeight: '600px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2147483647,
            pointerEvents: 'auto', // CRITICAL: Re-enable clicks since parent container has pointer-events: none
            border: '1px solid #e5e7eb',
            fontFamily: "'Segoe UI', system-ui, sans-serif"
        }}>
            {/* Header */}
            <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #f3f4f6', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#f9fafb',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
            }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>🤖 Copilot Analysis</h3>
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
                    <ReactMarkdown>{content}</ReactMarkdown>
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
    const [analysisResult, setAnalysisResult] = useState<{ content: string; path?: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [prefs, setPrefs] = useState({
        primaryColor: "#2563eb",
        buttonText: "DH",
        offsetBottom: 24,
        offsetRight: 24
    });

    // Menu Logic
    const { currentItems, canGoBack, navigateTo, navigateBack } = useMenuLogic();

    useEffect(() => {
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
        try {
            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { action: "ping", requestId: crypto.randomUUID() }
            });
            alert(JSON.stringify(response, null, 2));
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleAnalyze = async () => {
        if (!scrapedData?.errorText) return;

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
                        setAnalysisResult({
                            content: analysisData.markdown || JSON.stringify(analysisData, null, 2),
                            path: analysisData.saved_to
                        });
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
            const url = await resolveDynamicUrl(item.url);
            if (url) window.open(url, item.target || '_blank');
            setIsOpen(false);
        } else if (item.type === 'markdown') {
            alert(item.content);
            setIsOpen(false);
        }
    };

    return (
        <div className="dh-container">
            {/* Analysis Result Popover */}
            <ResultPopover 
                isOpen={!!analysisResult} 
                onClose={() => setAnalysisResult(null)} 
                content={analysisResult?.content || ""}
                filePath={analysisResult?.path}
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
                        <div style={{ marginBottom: '8px', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
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
                                        ticketTitle: '', // Clear individual fields so we don't re-template on next render
                                        productCategory: '',
                                        errorText: e.target.value 
                                    }));
                                }}
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
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
