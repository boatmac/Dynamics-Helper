import React, { useState, useEffect } from 'react';
import { PageReader, ScrapedData } from '../utils/pageReader';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';

const FAB: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [nativeResponse, setNativeResponse] = useState<string>("");
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
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
        }
    }, [isOpen]);

    const handlePing = async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { action: "ping", requestId: crypto.randomUUID() }
            });
            setNativeResponse(JSON.stringify(response, null, 2));
        } catch (e: any) {
            setNativeResponse(`Error: ${e.message}`);
        }
    };

    const handleAnalyze = async () => {
        if (!scrapedData?.errorText) return;

        setNativeResponse("Analyzing...");
        try {
            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { 
                    action: "analyze_error", 
                    payload: {
                        text: scrapedData.errorText,
                        context: scrapedData.source || "Unknown Context"
                    },
                    requestId: crypto.randomUUID() 
                }
            });
            setNativeResponse(JSON.stringify(response, null, 2));
        } catch (e: any) {
            setNativeResponse(`Error: ${e.message}`);
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
            // TODO: Show markdown modal (simplified alert for now)
            alert(item.content);
            setIsOpen(false);
        }
    };

    return (
        <div className="dh-container">
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
                        {scrapedData && scrapedData.errorText && (
                            <div style={{ marginBottom: '8px', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
                                <p style={{ margin: '0', fontSize: '10px', color: '#991b1b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                                    {scrapedData.errorText}
                                </p>
                            </div>
                        )}
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
                                disabled={!scrapedData?.errorText}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    color: '#fff',
                                    background: scrapedData?.errorText ? '#2563eb' : '#d1d5db',
                                    cursor: scrapedData?.errorText ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Analyze
                            </button>
                        </div>
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
