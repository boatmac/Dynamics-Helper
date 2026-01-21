import React, { useState, useEffect } from 'react';
import { PageReader, ScrapedData } from '../utils/pageReader';

const FAB: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [nativeResponse, setNativeResponse] = useState<string>("");
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

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

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {isOpen && (
                <div className="mb-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold text-gray-800">Dynamics Helper</h3>
                    </div>

                    {/* Scraped Data Section */}
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <h4 className="text-xs font-semibold text-blue-800 uppercase mb-1">Detected Error</h4>
                        {scrapedData ? (
                            <p className="text-xs text-gray-700 line-clamp-3 font-mono">
                                {scrapedData.errorText}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No error selected or detected.</p>
                        )}
                        <div className="mt-2 flex justify-end">
                            <button 
                                onClick={() => {
                                    const data = PageReader.scanForErrors();
                                    setScrapedData(data);
                                }}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Re-scan
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handlePing}
                            className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition-colors"
                        >
                            Ping Host
                        </button>
                        <button 
                            onClick={handleAnalyze}
                            disabled={!scrapedData}
                            className={`flex-1 px-3 py-1 rounded text-white text-sm transition-colors ${
                                scrapedData ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
                            }`}
                        >
                            Analyze Error
                        </button>
                    </div>

                    {nativeResponse && (
                        <div className="mt-2">
                            <h4 className="text-xs font-semibold text-gray-500 mb-1">Host Response:</h4>
                            <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                                {nativeResponse}
                            </pre>
                        </div>
                    )}
                </div>
            )}
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
                {isOpen ? (
                    <span className="text-xl font-bold">×</span>
                ) : (
                    <span className="text-xl font-bold">DH</span>
                )}
            </button>
        </div>
    );
};

export default FAB;
