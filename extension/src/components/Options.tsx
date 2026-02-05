import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
    Settings, 
    Save, 
    RotateCcw, 
    Upload, 
    Download, 
    Maximize2, 
    Minimize2, 
    Plus, 
    Folder, 
    Link as LinkIcon, 
    FileText, 
    Edit2, 
    Trash2, 
    MoreHorizontal,
    FolderOpen,
    Type,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface MenuItem {
    type: 'folder' | 'link' | 'markdown' | 'back' | 'unknown';
    label: string;
    url?: string;
    content?: string;
    children?: MenuItem[];
    target?: string;
    icon?: string;
    collapsed?: boolean;
}

interface Preferences {
    buttonText: string;
    primaryColor: string;
    offsetBottom: number;
    offsetRight: number;
    systemInstructions?: string;
    userPrompt?: string;
    rootPath?: string;
    skillDirectories?: string;
    autoAnalyzeMode?: 'disabled' | 'critical' | 'always' | 'new_cases';
    enableStatusBubble?: boolean;
}

const DEFAULT_PREFS: Preferences = {
    buttonText: "DH",
    primaryColor: "#0D9488", // Teal-600 to match design system
    offsetBottom: 24,
    offsetRight: 24,
    systemInstructions: "",
    userPrompt: "",
    rootPath: "",
    skillDirectories: "~/.copilot/skills",
    autoAnalyzeMode: 'disabled',
    enableStatusBubble: true
};

// --- Helpers ---
async function loadItems(): Promise<MenuItem[]> {
    // 1. Try local storage
    try {
        if (chrome?.storage?.local) {
            const obj = await new Promise<{ dh_items?: MenuItem[] }>((resolve) => {
                chrome.storage.local.get("dh_items", (items) => resolve(items as { dh_items?: MenuItem[] }));
            });
            if (Array.isArray(obj.dh_items) && obj.dh_items.length > 0) return obj.dh_items;
        }
    } catch (_) { }

    // 2. Fallback to items.json (packaged)
    try {
        const url = chrome.runtime.getURL("items.json");
        const res = await fetch(url);
        if (res.ok) {
            const text = await res.text();
            if (text.trim().startsWith("<")) {
                throw new Error("Received HTML instead of JSON");
            }
            const data = JSON.parse(text);
            return Array.isArray(data) ? data : (data.items || []);
        }
    } catch (e) {
        console.warn("[DH] Failed to load items.json", e);
    }
    return [];
}

const ItemEditor: React.FC<{
    item: MenuItem;
    onSave: (newItem: MenuItem) => void;
    onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
    const [draft, setDraft] = useState<MenuItem>({ ...item });

    const handleChange = (field: keyof MenuItem, value: any) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 mb-3 animate-fade-in-up shadow-sm">
            <h4 className="font-bold text-sm mb-3 text-slate-800 flex items-center gap-2">
                <Edit2 size={14} /> Edit Item
            </h4>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Label</label>
                        <input 
                            className="w-full border border-slate-300 p-2 text-sm rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            value={draft.label} 
                            onChange={e => handleChange('label', e.target.value)} 
                            placeholder="Menu Label"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Type</label>
                        <select 
                            className="w-full border border-slate-300 p-2 text-sm rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                            value={draft.type} 
                            onChange={e => handleChange('type', e.target.value)}
                        >
                            <option value="link">Link</option>
                            <option value="folder">Folder</option>
                            <option value="markdown">Markdown Note</option>
                        </select>
                    </div>
                </div>

                {draft.type === 'link' && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">URL</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400"><LinkIcon size={14} /></span>
                            <input 
                                className="w-full border border-slate-300 pl-9 p-2 text-sm rounded-md focus:ring-2 focus:ring-teal-500 outline-none font-mono text-slate-600"
                                value={draft.url || ''} 
                                onChange={e => handleChange('url', e.target.value)} 
                                placeholder="https://..."
                                            />
                        </div>
                    </div>
                )}

                {draft.type === 'markdown' && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Content</label>
                        <textarea 
                            className="w-full border border-slate-300 p-2 text-sm rounded-md h-24 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-slate-600"
                            value={draft.content || ''} 
                            onChange={e => handleChange('content', e.target.value)} 
                            placeholder="# Markdown content here..."
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button onClick={onCancel} className="text-xs px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 font-medium">Cancel</button>
                    <button onClick={() => onSave(draft)} className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm font-medium">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- DND Constants ---
const ItemType = {
    ITEM: 'ITEM',
};

interface DragItem {
    path: number[];
    type: string;
}

interface DraggableItemProps {
    item: MenuItem;
    index: number;
    path: number[];
    moveItem: (dragPath: number[], hoverPath: number[], placement: 'before' | 'after' | 'inside') => void;
    renderList: (list: MenuItem[], pathPrefix: number[]) => React.ReactNode;
    setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    setEditingItemPath: React.Dispatch<React.SetStateAction<number[] | null>>;
    editingItemPath: number[] | null;
    updateItemAt: (path: number[], newItem: MenuItem, list: MenuItem[]) => MenuItem[];
    deleteItemAt: (path: number[], list: MenuItem[]) => MenuItem[];
    addItemAt: (path: number[] | null, newItem: MenuItem, list: MenuItem[]) => MenuItem[];
    selectedPath: number[] | null;
    setSelectedPath: (path: number[] | null) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
    item, 
    index, 
    path, 
    moveItem, 
    renderList, 
    setItems, 
    setEditingItemPath, 
    editingItemPath, 
    updateItemAt, 
    deleteItemAt, 
    addItemAt,
    selectedPath,
    setSelectedPath
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const currentPath = [...path, index];
    const isEditing = editingItemPath && editingItemPath.join('.') === currentPath.join('.');
    const isSelected = selectedPath && selectedPath.join('.') === currentPath.join('.');

    // Visual State for Drag
    const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | 'inside' | null>(null);

    // Drag Logic
    const [{ isDragging }, drag] = useDrag({
        type: ItemType.ITEM,
        item: { path: currentPath, type: item.type },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Helper to determine position
    const getHoverPosition = (hoverBoundingRect: DOMRect, clientOffset: { x: number, y: number }, itemType: string) => {
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const isFolder = itemType === 'folder';
        // 35% Top, 30% Middle, 35% Bottom
        const threshold = hoverBoundingRect.height * (isFolder ? 0.35 : 0.5);
        
        if (hoverClientY < threshold) return 'top';
        if (hoverClientY > (hoverBoundingRect.height - threshold)) return 'bottom';
        if (isFolder) return 'inside';
        return 'bottom'; // Fallback for non-folders middle -> bottom
    };

    // Drop Logic
    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: ItemType.ITEM,
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
        hover: (draggedItem, monitor) => {
            if (!ref.current || !monitor.isOver({ shallow: true })) {
                if (dragPosition !== null) setDragPosition(null);
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) return;

            // Prevent self-drop feedback
            if (draggedItem.path.join('.') === currentPath.join('.')) {
                 setDragPosition(null);
                 return;
            }

            const newPos = getHoverPosition(hoverBoundingRect, clientOffset, item.type);
            if (newPos !== dragPosition) {
                setDragPosition(newPos);
            }
        },
        drop: (draggedItem, monitor) => {
             if (monitor.didDrop()) return; 

             // Prevent dropping on self or children
             const isChild = (parent: number[], child: number[]) => {
                 if (child.length <= parent.length) return false;
                 return parent.every((val, i) => child[i] === val);
             };
             if (draggedItem.path.join('.') === currentPath.join('.') || isChild(draggedItem.path, currentPath)) {
                 return;
             }

             if (!ref.current) return;
             const hoverBoundingRect = ref.current.getBoundingClientRect();
             const clientOffset = monitor.getClientOffset();
             if (!clientOffset) return;

             const pos = getHoverPosition(hoverBoundingRect, clientOffset, item.type);

             if (pos === 'inside') {
                 moveItem(draggedItem.path, currentPath, 'inside');
             } else if (pos === 'top') {
                 moveItem(draggedItem.path, currentPath, 'before');
             } else {
                 moveItem(draggedItem.path, currentPath, 'after');
             }
             setDragPosition(null);
        }
    });

    // Reset drag position when not over
    useEffect(() => {
        if (!isOver) {
            setDragPosition(null);
        }
    }, [isOver]);

    drag(drop(ref));

    const opacity = isDragging ? 0.4 : 1;
    
    // Dynamic Styles based on dragPosition
    let containerClass = "group rounded-lg transition-all duration-200 relative ";
    if (isOver && canDrop) {
        if (dragPosition === 'inside') {
            containerClass += "bg-teal-50 ring-2 ring-teal-400 ring-inset";
        } else {
            // No background change for insert, just the line (handled below)
            // But we might want a subtle highlight to show it's active
            containerClass += "bg-slate-50"; 
        }
    } else if (isSelected) {
        containerClass += "bg-teal-50 ring-1 ring-teal-200";
    } else {
        containerClass += "hover:bg-slate-50";
    }

    return (
        <li className="mb-1">
            <div ref={ref} className={containerClass} style={{ opacity }}>
             {/* Insert Indicators */}
             {isOver && canDrop && dragPosition === 'top' && (
                 <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 shadow-sm z-20 rounded-full pointer-events-none transform -translate-y-[2px]"></div>
             )}
             {isOver && canDrop && dragPosition === 'bottom' && (
                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-sm z-20 rounded-full pointer-events-none transform translate-y-[2px]"></div>
             )}

             {isEditing ? (
                <ItemEditor 
                    item={item} 
                    onSave={(newItem) => {
                        setItems(prev => updateItemAt(currentPath, newItem, prev));
                        setEditingItemPath(null);
                    }}
                    onCancel={() => setEditingItemPath(null)}
                />
            ) : (
                <div 
                    className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-200 cursor-grab active:cursor-grabbing"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling
                        if (item.type === 'folder') {
                            setSelectedPath(isSelected ? null : currentPath);
                        } else {
                            setSelectedPath(null);
                        }
                    }}
                >
                    <div 
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={(e) => {
                             e.stopPropagation();
                             if (item.type === 'folder') {
                                 // Toggle collapse
                                 const newItem = { ...item, collapsed: !item.collapsed };
                                 setItems(prev => updateItemAt(currentPath, newItem, prev));
                                 // Also select it
                                 setSelectedPath(currentPath);
                             } else {
                                 setSelectedPath(null);
                             }
                        }}
                    >
                        <span className={cn("p-1.5 rounded-md", item.type === 'folder' ? "bg-amber-100 text-amber-600" : item.type === 'link' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600")}>
                            {item.type === 'folder' ? (item.collapsed ? <Folder size={16} /> : <FolderOpen size={16} />) : item.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                        </span>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-700 text-sm truncate">{item.label}</span>
                            {item.type === 'link' && item.url && <span className="text-xs text-slate-400 truncate font-mono">{item.url}</span>}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'folder' && (
                            <button 
                                onClick={(e) => {
                                     e.stopPropagation();
                                     const newItem: MenuItem = { type: 'link', label: 'New Link', url: 'https://' };
                                     setItems(prev => addItemAt(currentPath, newItem, prev));
                                }}
                                className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Add Child"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingItemPath(currentPath);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this item?")) {
                                    setItems(prev => deleteItemAt(currentPath, prev));
                                }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}
            </div>
            
            {/* Children */}
            {item.children && item.children.length > 0 && !item.collapsed && (
                <div className="ml-5 pl-2 border-l-2 border-slate-100 mt-1 space-y-1">
                    {renderList(item.children, currentPath)}
                </div>
            )}
        </li>
    );
};

// --- Empty Drop Zone Component ---
const EmptyDropZone: React.FC<{
    moveItem: (dragPath: number[], hoverPath: number[], placement: 'before' | 'after' | 'inside') => void;
    itemsLength: number;
}> = ({ moveItem, itemsLength }) => {
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemType.ITEM,
        drop: (draggedItem: DragItem) => {
            // Drop at the end of the root list
            moveItem(draggedItem.path, [itemsLength], 'before');
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    return (
        <div 
            ref={drop as any} 
            className={cn(
                "h-16 mt-2 rounded-lg border-2 border-dashed flex items-center justify-center transition-all",
                isOver && canDrop ? "border-teal-400 bg-teal-50 text-teal-600" : "border-transparent text-transparent hover:border-slate-200 hover:text-slate-400"
            )}
        >
            <span className="text-xs font-medium">Drop to move to root end</span>
        </div>
    );
};

// --- Main Options Component ---
const Options: React.FC = () => {
    // State
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [status, setStatus] = useState<string>("");
    const [hostVersion, setHostVersion] = useState<string>("");
    const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Editor State
    const [editingItemPath, setEditingItemPath] = useState<number[] | null>(null); // path of indices
    const [selectedPath, setSelectedPath] = useState<number[] | null>(null); // path of currently selected folder

    // Initial Load
    useEffect(() => {
        // Load Prefs
        chrome.storage.local.get("dh_prefs", (result) => {
            if (result.dh_prefs) {
                // Auto-migrate old default blue to new teal if user hasn't changed it
                const loadedPrefs = result.dh_prefs as Preferences; // Cast to Preferences type
                if (loadedPrefs.primaryColor === "#2563eb") { // Old default blue
                    loadedPrefs.primaryColor = "#0D9488"; // New default teal
                }
                setPrefs({ ...DEFAULT_PREFS, ...loadedPrefs });
            }

            // Sync with Native Host (Source of Truth for backend config)
            chrome.runtime.sendMessage({ action: "get_host_config" }, (response) => {
                if (chrome.runtime.lastError) {
                     console.warn("Could not sync with host:", chrome.runtime.lastError.message);
                     return;
                }
                
                if (response && response.status === "success" && response.data) {
                    const hostConfig = response.data;
                    console.log("[Options] Synced config from Host:", hostConfig);

                    if (hostConfig.host_version) {
                        setHostVersion(hostConfig.host_version);
                    }

                    setPrefs(prev => {
                        const newPrefs = { ...prev };
                        let changed = false;

                        // 1. Root Path
                        if (hostConfig.root_path && hostConfig.root_path !== prev.rootPath) {
                            newPrefs.rootPath = hostConfig.root_path;
                            changed = true;
                        }

                        // 2. Skill Directories (Array -> CSV String)
                        if (Array.isArray(hostConfig.skill_directories)) {
                            // Expand user home ~ for display? No, keep it as is or normalized.
                            // The host resolves them, but returns the resolved paths? 
                            // Actually _get_session_config returns resolved paths.
                            // For UI, we might want to keep the raw string if possible, but we only get resolved.
                            // Let's just join them.
                            const skillsStr = hostConfig.skill_directories.join(", ");
                            if (skillsStr !== prev.skillDirectories) {
                                newPrefs.skillDirectories = skillsStr;
                                changed = true;
                            }
                        }

                        // 3. System Instructions
                        // Host returns { mode: 'append', content: '...' }
                        if (hostConfig.system_message && hostConfig.system_message.content) {
                            if (hostConfig.system_message.content !== prev.systemInstructions) {
                                newPrefs.systemInstructions = hostConfig.system_message.content;
                                changed = true;
                            }
                        }

                        // 4. Extension Preferences (Synced from Host)
                        if (hostConfig.extension_preferences) {
                            const extPrefs = hostConfig.extension_preferences;
                            
                            if (extPrefs.auto_analyze_mode && extPrefs.auto_analyze_mode !== prev.autoAnalyzeMode) {
                                newPrefs.autoAnalyzeMode = extPrefs.auto_analyze_mode;
                                changed = true;
                            }
                            if (extPrefs.user_prompt !== undefined && extPrefs.user_prompt !== prev.userPrompt) {
                                newPrefs.userPrompt = extPrefs.user_prompt;
                                changed = true;
                            }
                            if (extPrefs.enable_status_bubble !== undefined && extPrefs.enable_status_bubble !== prev.enableStatusBubble) {
                                newPrefs.enableStatusBubble = extPrefs.enable_status_bubble;
                                changed = true;
                            }
                        }

                        return changed ? newPrefs : prev;
                    });
                }
            });
        });

        // Load Items and ensure collapsed by default
        loadItems().then(loadedItems => {
            const collapseFolders = (list: MenuItem[]): MenuItem[] => {
                return list.map(item => {
                    if (item.type === 'folder') {
                        return {
                            ...item,
                            // Default to collapsed if undefined, or force collapsed if desired? 
                            // User request: "make it collapsed by default". 
                            // I'll default to true if it's not explicitly false (or maybe just force it true on initial load for cleaner look).
                            // Let's set it to true if undefined.
                            collapsed: item.collapsed ?? true, 
                            children: item.children ? collapseFolders(item.children) : []
                        };
                    }
                    return item;
                });
            };
            setItems(collapseFolders(loadedItems));
        });
    }, []);

    // --- Prefs Handlers ---
    const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPrefs(prev => ({
            ...prev,
            [name]: name.startsWith('offset') ? Number(value) : value
        }));
    };

    const handleSave = () => {
        chrome.storage.local.set({ dh_prefs: prefs, dh_items: items }, () => {
            // Also notify the Host via Service Worker if instructions changed
             // We use a fire-and-forget message pattern here
             if (prefs.systemInstructions !== undefined) {
                 chrome.runtime.sendMessage({
                     action: "update_host_config",
                     payload: {
                         system_instructions: prefs.systemInstructions,
                        config: {
                            root_path: prefs.rootPath,
                            skill_directories: prefs.skillDirectories ? prefs.skillDirectories.split(',').map(s => s.trim()).filter(Boolean) : [],
                            extension_preferences: {
                                auto_analyze_mode: prefs.autoAnalyzeMode,
                                user_prompt: prefs.userPrompt,
                                enable_status_bubble: prefs.enableStatusBubble
                            }
                        }
                     }
                 }, (response) => {
                     // Check for runtime errors (like if host isn't connected yet)
                     if (chrome.runtime.lastError) {
                         console.warn("Could not update host immediately:", chrome.runtime.lastError.message);
                         // This is fine, the host loads the file on startup anyway
                     } else {
                         console.log("Host config updated response:", response);
                     }
                 });
             }

            setStatus("Settings saved successfully!");
            setTimeout(() => setStatus(""), 2000);
        });
    };

    const handleReset = () => {
        if (confirm("Reset everything to default? This will clear your custom bookmarks.")) {
            setPrefs(DEFAULT_PREFS);
            chrome.storage.local.remove(["dh_prefs", "dh_items"], () => {
                loadItems().then(setItems);
                setStatus("Reset complete.");
            });
        }
    };

    // Listen for updates
    useEffect(() => {
        const handleRuntimeMsg = (message: any) => {
            if (message.type === "NATIVE_UPDATE_AVAILABLE") {
                console.log("[Options] Received update available:", message.payload);
                setUpdateAvailable(message.payload);
            }
            
            if (message.type === "NATIVE_UPDATE_NOT_AVAILABLE") {
                setStatus("You are up to date!");
                setTimeout(() => setStatus(""), 3000);
            }

            if (message.type === "NATIVE_UPDATE_ERROR") {
                setStatus(`Check failed: ${message.payload.error}`);
                setTimeout(() => setStatus(""), 5000);
            }
        };

        chrome.runtime.onMessage.addListener(handleRuntimeMsg);
        
        // Trigger check on load (fire and forget, legacy hosts might ignore 'check_updates')
        chrome.runtime.sendMessage({ 
            type: "NATIVE_MSG", 
            payload: { action: "check_updates" } 
        });

        return () => chrome.runtime.onMessage.removeListener(handleRuntimeMsg);
    }, []);

    // Check persistent storage for pending updates on mount
    useEffect(() => {
        chrome.storage.local.get("pending_update", (data) => {
            const pending = data.pending_update as {version: string, url: string} | undefined;
            if (pending && pending.version && pending.url) {
                console.log("[Options] Found pending update in storage:", pending);
                setUpdateAvailable(pending);
            }
        });
    }, []);

    const handleUpdate = () => {
        if (!updateAvailable) return;
        if (!confirm(`Update to version ${updateAvailable.version}? This will restart the extension.`)) return;

        setIsUpdating(true);
        setStatus("Downloading update...");

        chrome.runtime.sendMessage({
            type: "NATIVE_MSG",
            payload: { 
                action: "perform_update", 
                payload: { url: updateAvailable.url } 
            }
        }, (response) => {
            setIsUpdating(false);
            if (chrome.runtime.lastError) {
                setStatus("Error: " + chrome.runtime.lastError.message);
                return;
            }
            
            if (response && response.status === "success") {
                setStatus("Update success! Restarting...");
                setTimeout(() => {
                    chrome.runtime.reload();
                }, 1000);
            } else {
                setStatus("Update failed: " + (response?.error || "Unknown error"));
            }
        });
    };

    const handleCheckUpdates = () => {
        setStatus("Checking for updates...");
        chrome.runtime.sendMessage({ 
            type: "NATIVE_MSG", 
            payload: { action: "check_updates" } 
        });
        
        // Safety timeout (15s) in case host doesn't respond
        setTimeout(() => {
            setStatus(prev => prev === "Checking for updates..." ? "Check timed out." : prev);
            setTimeout(() => setStatus(prev => prev === "Check timed out." ? "" : prev), 3000);
        }, 15000);
    };

    // --- Item Handlers (Recursive) ---
    // Helper to get item at path
    const getItemAt = (path: number[], list: MenuItem[]): MenuItem | null => {
        let current = list[path[0]];
        for (let i = 1; i < path.length; i++) {
            if (!current || !current.children) return null;
            current = current.children[path[i]];
        }
        return current;
    };

    const getSelectedFolderName = () => {
        if (!selectedPath) return null;
        const item = getItemAt(selectedPath, items);
        return item && item.type === 'folder' ? item.label : null;
    };

    // Helper to update item at path
    const updateItemAt = (path: number[], newItem: MenuItem, list: MenuItem[]): MenuItem[] => {
        const newList = [...list];
        if (path.length === 1) {
            newList[path[0]] = newItem;
            return newList;
        }
        const [head, ...tail] = path;
        if (newList[head] && newList[head].children) {
            newList[head] = {
                ...newList[head],
                children: updateItemAt(tail, newItem, newList[head].children!)
            };
        }
        return newList;
    };

    // Helper to add item
    const addItemAt = (path: number[] | null, newItem: MenuItem, list: MenuItem[]): MenuItem[] => {
        if (!path || path.length === 0) {
            return [...list, newItem];
        }
        // Add to the folder at path
        const traverse = (p: number[], currentList: MenuItem[]): MenuItem[] => {
             if (p.length === 0) return [...currentList, newItem];
             const [h, ...t] = p;
             return currentList.map((item, idx) => {
                 if (idx === h) {
                     // If we are at the target folder (end of path), add to its children
                     if (t.length === 0) {
                         // Ensure children exists and push
                         return { ...item, children: [...(item.children || []), newItem], collapsed: false }; // Auto expand when adding
                     }
                     return { ...item, children: traverse(t, item.children || []) };
                 }
                 return item;
             });
        };
        return traverse(path, list);
    };

    // Helper to delete
    const deleteItemAt = (path: number[], list: MenuItem[]): MenuItem[] => {
        if (path.length === 1) {
            return list.filter((_, i) => i !== path[0]);
        }
        const [head, ...tail] = path;
        return list.map((item, i) => {
            if (i === head) {
                return { ...item, children: deleteItemAt(tail, item.children || []) };
            }
            return item;
        });
    };

    // Move Item Logic
    const moveItem = (dragPath: number[], hoverPath: number[], placement: 'before' | 'after' | 'inside') => {
        if (dragPath.join('.') === hoverPath.join('.')) return;

        // 1. Get the item to move
        const itemToMove = getItemAt(dragPath, items);
        if (!itemToMove) return;

        // 2. Remove it from old location
        let newItems = [...items];
        
        // Deep clone first to avoid mutation issues
        const cloneDeep = (items: MenuItem[]) => JSON.parse(JSON.stringify(items));
        newItems = cloneDeep(items);
        
        // Remove function that returns the removed item
        const removeOp = (path: number[], currentList: MenuItem[]): { list: MenuItem[], removed: MenuItem | null } => {
            if (path.length === 1) {
                const removed = currentList[path[0]];
                const list = currentList.filter((_, i) => i !== path[0]);
                return { list, removed };
            }
            const [h, ...t] = path;
            const res = removeOp(t, currentList[h].children || []);
            const list = currentList.map((item, i) => i === h ? { ...item, children: res.list } : item);
            return { list, removed: res.removed };
        };
        
        const { list: itemsAfterRemoval, removed } = removeOp(dragPath, newItems);
        if (!removed) return;
        
        // 3. Insert at new location
        let finalInsertPath = [...hoverPath];
        
        // Adjust indices if we removed an item from the same parent and it was before the target
        // Only if the paths share the same parent prefix
        const dragParentPath = dragPath.slice(0, -1);
        const hoverParentPath = hoverPath.slice(0, -1);
        
        const sameParent = dragParentPath.join('.') === hoverParentPath.join('.');
        
        if (sameParent) {
            const dragIndex = dragPath[dragPath.length - 1];
            const hoverIndex = hoverPath[hoverPath.length - 1];
            
            // If we removed an item before the target, the target index shifts down by 1
            if (dragIndex < hoverIndex) {
                 finalInsertPath[finalInsertPath.length - 1]--;
            }
        }
        
        // Insert function
        const insertOp = (path: number[], item: MenuItem, currentList: MenuItem[], place: 'before' | 'after' | 'inside'): MenuItem[] => {
             // If insert at root
             if (path.length === 1) {
                 const idx = path[0];
                 const res = [...currentList];
                 
                 if (place === 'inside') {
                     // Insert inside the item at idx
                     const target = res[idx];
                     if (target.type === 'folder') {
                         target.children = [...(target.children || []), item];
                         target.collapsed = false; // Expand
                     }
                 } else if (place === 'before') {
                     // Insert before the item at idx
                     res.splice(idx, 0, item);
                 } else if (place === 'after') {
                     // Insert after the item at idx
                     res.splice(idx + 1, 0, item);
                 }
                 return res;
             }
             
             const [h, ...t] = path;
             return currentList.map((itm, i) => {
                 if (i === h) {
                     return { ...itm, children: insertOp(t, item, itm.children || [], place) };
                 }
                 return itm;
             });
        };
        
        const finalItems = insertOp(finalInsertPath, removed, itemsAfterRemoval, placement);
        setItems(finalItems);
    };

    // Bulk Actions
    const collapseAll = (collapse: boolean) => {
        const traverse = (list: MenuItem[]): MenuItem[] => {
            return list.map(item => {
                if (item.type === 'folder') {
                    return {
                        ...item,
                        collapsed: collapse,
                        children: traverse(item.children || [])
                    };
                }
                return item;
            });
        };
        setItems(prev => traverse(prev));
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const json = JSON.parse(text);
                const newItems = Array.isArray(json) ? json : (json.items || []);
                setItems(newItems);
                setStatus("Imported successfully!");
                setTimeout(() => setStatus(""), 2000);
            } catch (err) {
                alert("Failed to parse JSON");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    const handleExport = () => {
        const text = JSON.stringify(items, null, 2);
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dh_bookmarks_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Render List
    const renderList = (list: MenuItem[], pathPrefix: number[] = []) => {
        return (
            <ul className="space-y-1">
                {list.map((item, idx) => (
                    <DraggableItem 
                        key={idx} 
                        item={item}
                        index={idx}
                        path={pathPrefix}
                        moveItem={moveItem}
                        renderList={renderList}
                        setItems={setItems}
                        setEditingItemPath={setEditingItemPath}
                        editingItemPath={editingItemPath}
                        updateItemAt={updateItemAt}
                        deleteItemAt={deleteItemAt}
                        addItemAt={addItemAt}
                        selectedPath={selectedPath}
                        setSelectedPath={setSelectedPath}
                    />
                ))}
            </ul>
        );
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-slate-50 py-10 px-6 font-[family-name:var(--font-jakarta)]">
                <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap'); :root { --font-jakarta: 'Plus Jakarta Sans', sans-serif; } body { font-family: var(--font-jakarta); }`}} />
                
                <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {prefs.buttonText.slice(0, 2)}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dynamics Helper</h1>
                                <div className="flex gap-3 text-xs text-slate-500 font-medium uppercase tracking-wider items-center">
                                    <span>Extension v{chrome.runtime.getManifest().version}</span>
                                    {hostVersion && <span>• Host v{hostVersion}</span>}
                                    <button 
                                        onClick={handleCheckUpdates} 
                                        className="ml-1 p-1 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors" 
                                        title="Check for updates"
                                    >
                                        <RefreshCw size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {updateAvailable && (
                                <button 
                                    onClick={handleUpdate} 
                                    disabled={isUpdating}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors animate-pulse"
                                >
                                    {isUpdating ? <RotateCcw size={16} className="animate-spin" /> : <Download size={16} />}
                                    {isUpdating ? "Updating..." : "Update Now"}
                                </button>
                            )}
                             <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-sm font-medium transition-colors">
                                <RotateCcw size={16} /> Reset
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg shadow-sm hover:bg-teal-700 text-sm transition-colors ring-offset-2 focus:ring-2 ring-teal-500">
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className="bg-emerald-50 text-emerald-700 text-center py-3 font-medium text-sm border-b border-emerald-100 flex items-center justify-center gap-2 animate-fade-in-down">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            {status}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* Sidebar: Visual Settings */}
                        <div className="lg:col-span-5 p-8 border-r border-slate-100 bg-slate-50/30">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Settings size={14} /> Appearance
                            </h2>
                            
                            <div className="space-y-8">
                                {/* Preview */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</label>
                                    <div className="flex items-center justify-center h-32 bg-white border border-dashed border-slate-300 rounded-xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-slate-50 pattern-grid-lg opacity-20"></div>
                                        <div 
                                            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-lg transform group-hover:scale-110 transition-transform duration-300"
                                            style={{ backgroundColor: prefs.primaryColor, boxShadow: `0 10px 15px -3px ${prefs.primaryColor}40` }}
                                        >
                                            {prefs.buttonText}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Button Label</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400"><Type size={14} /></span>
                                            <input
                                                type="text"
                                                name="buttonText"
                                                value={prefs.buttonText}
                                                onChange={handlePrefChange}
                                                maxLength={3}
                                                className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                                                placeholder="DH"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brand Color</label>
                                        <div className="flex gap-2">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-sm border border-slate-200 shrink-0 hover:scale-105 transition-transform">
                                                <input
                                                    type="color"
                                                    name="primaryColor"
                                                    value={prefs.primaryColor}
                                                    onChange={handlePrefChange}
                                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                name="primaryColor"
                                                value={prefs.primaryColor}
                                                onChange={handlePrefChange}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none uppercase font-mono text-sm text-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bottom Offset (px)</label>
                                            <input
                                                type="number"
                                                name="offsetBottom"
                                                value={prefs.offsetBottom}
                                                onChange={handlePrefChange}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Right Offset (px)</label>
                                            <input
                                                type="number"
                                                name="offsetRight"
                                                value={prefs.offsetRight}
                                                onChange={handlePrefChange}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-200">
                                         <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Maximize2 size={14} /> Copilot AI Settings
                                        </h2>
                                        
                                        {/* 1. Automatic Analyze with Status Bubble */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Automatic Analyze</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                Choose when to automatically trigger the AI analysis upon opening the menu.
                                            </p>
                                            <select
                                                name="autoAnalyzeMode"
                                                value={prefs.autoAnalyzeMode || 'disabled'}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, autoAnalyzeMode: e.target.value as any }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                            >
                                                <option value="disabled">Disabled (Manual trigger only)</option>
                                                <option value="critical">New Critical Case Only</option>
                                                <option value="new_cases">New Cases</option>
                                                <option value="always">Always (On every scan)</option>
                                            </select>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="enableStatusBubble"
                                                checked={prefs.enableStatusBubble !== false}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, enableStatusBubble: e.target.checked }))}
                                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                            />
                                            <label htmlFor="enableStatusBubble" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                                                Show Status Bubble during analysis
                                            </label>
                                        </div>

                                        {/* 2. Workbench Directory */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Workbench Directory</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                Local directory for case files (e.g., C:\MyCases).
                                            </p>
                                            <input
                                                type="text"
                                                value={prefs.rootPath || ""}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, rootPath: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono"
                                                placeholder="C:\MyCases"
                                            />
                                        </div>

                                        {/* 3. Skills Directory */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Skills Directory</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                Comma-separated list of directories containing custom skills (e.g., ~/.copilot/skills).
                                            </p>
                                            <input
                                                type="text"
                                                value={prefs.skillDirectories || ""}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, skillDirectories: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono"
                                                placeholder="~/.copilot/skills"
                                            />
                                        </div>

                                        {/* 4. System Instructions */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">System Instructions (Prompt)</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                These instructions are appended to the Copilot System Prompt. Use this to customize how the AI responds (e.g., "You are a helpful expert in Dynamics 365...").
                                            </p>
                                            <textarea
                                                value={prefs.systemInstructions || ""}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, systemInstructions: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y"
                                                placeholder="Enter custom system instructions here..."
                                            />
                                        </div>

                                        {/* 5. Default User Prompt */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default User Prompt</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                This text is automatically appended to the "Case Context" description when scanning a page. Use this to add standard questions or instructions for every analysis (e.g., "Please provide a root cause analysis and mitigation steps.").
                                            </p>
                                            <textarea
                                                value={prefs.userPrompt || ""}
                                                onChange={(e) => setPrefs(prev => ({ ...prev, userPrompt: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y"
                                                placeholder="Enter default user prompt here..."
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Main Content: Bookmarks Editor */}
                        <div className="lg:col-span-7 p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Folder size={14} /> Bookmark Manager
                                </h2>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg cursor-pointer border border-slate-200 transition-colors shadow-sm">
                                        <Upload size={12} /> Import
                                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                    </label>
                                    <button 
                                        onClick={handleExport}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm"
                                    >
                                        <Download size={12} /> Export
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                {/* Toolbar */}
                                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 items-center">
                                     <button 
                                        onClick={() => {
                                            const newItem: MenuItem = { type: 'link', label: 'New Item', url: 'https://' };
                                            if (selectedPath) {
                                                setItems(prev => addItemAt(selectedPath, newItem, prev));
                                            } else {
                                                setItems(prev => [...prev, newItem]);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-md hover:bg-teal-700 transition-colors shadow-sm"
                                    >
                                        <Plus size={14} strokeWidth={3} /> 
                                        {selectedPath ? `Add to "${getSelectedFolderName()}"` : "Add Root Item"}
                                    </button>
                                    
                                    {selectedPath && (
                                        <button 
                                            onClick={() => setSelectedPath(null)}
                                            className="text-xs text-slate-500 hover:text-slate-700 px-2"
                                            title="Clear Selection"
                                        >
                                            (Clear Selection)
                                        </button>
                                    )}

                                    <div className="h-full w-px bg-slate-200 mx-1"></div>
                                    <button 
                                        onClick={() => collapseAll(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-md transition-colors"
                                        title="Collapse All Folders"
                                    >
                                        <Minimize2 size={14} /> Collapse All
                                    </button>
                                    <button 
                                        onClick={() => collapseAll(false)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-md transition-colors"
                                        title="Expand All Folders"
                                    >
                                        <Maximize2 size={14} /> Expand All
                                    </button>
                                </div>
                                
                                {/* Scrollable List */}
                                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                                    {items.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <Folder size={32} className="opacity-50" />
                                            </div>
                                            <p className="font-medium">No bookmarks yet</p>
                                            <p className="text-xs mt-1 max-w-[200px] text-center opacity-70">Click "Add Item" to start building your menu.</p>
                                        </div>
                                    ) : (
                                        <div onClick={() => setSelectedPath(null)} className="min-h-full pb-12">
                                            {renderList(items)}
                                            {/* Root Empty Drop Zone */}
                                            <EmptyDropZone moveItem={moveItem} itemsLength={items.length} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default Options;


