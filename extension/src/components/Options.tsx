import React, { useState, useEffect, useRef, useMemo } from 'react';
import { mergeMenus, MenuItem } from './MenuLogic';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
    Settings, 
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
    RefreshCw,
    Building2,
    Lock,
    Eye,
    Pencil
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation, LanguageCode, PrefsLanguageProvider } from '../utils/i18n';
import MarkdownPreview from './MarkdownPreview';
import { trackEvent } from '../utils/telemetry';
import { getExtensionVersion } from '../utils/version';

// Helper
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Preferences {
    buttonText: string;
    primaryColor: string;
    offsetBottom: number;
    offsetRight: number;
    userInstructions?: string; // Was systemInstructions
    userPrompt?: string;
    rootPath?: string;
    skillDirectories?: string;
    mcpConfigPath?: string;
    useWorkspaceOnly?: boolean;
    autoAnalyzeMode?: 'disabled' | 'critical' | 'always' | 'new_cases';
    enableStatusBubble?: boolean;
    betaChannelEnabled?: boolean;
    logLevel?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    language?: LanguageCode;
    team?: string;        // Selected team catalog ID (e.g. "dnai")
    teamCatalogEnabled?: boolean;   // Master toggle for the Team Catalog feature
    teamManifestUrl?: string;       // User-supplied manifest URL
    teamLabel?: string;   // Display name for selected team
}

const DEFAULT_PREFS: Preferences = {
    buttonText: "DH",
    primaryColor: "#0D9488", // Teal-600 to match design system
    offsetBottom: 24,
    offsetRight: 24,
    userInstructions: "",
    userPrompt: "",
    rootPath: "",
    skillDirectories: "~/.copilot/skills",
    mcpConfigPath: "~/.copilot/mcp-config.json",
    useWorkspaceOnly: true,
    autoAnalyzeMode: 'disabled',
    enableStatusBubble: true,
    betaChannelEnabled: false,
    logLevel: 'INFO',
    language: 'auto',
    teamCatalogEnabled: false,
    teamManifestUrl: ''
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
    const { t } = useTranslation();
    const [draft, setDraft] = useState<MenuItem>({ ...item });

    const handleChange = (field: keyof MenuItem, value: any) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 mb-3 animate-fade-in-up shadow-sm">
            <h4 className="font-bold text-sm mb-3 text-slate-800 flex items-center gap-2">
                <Edit2 size={14} /> {t('editItem')}
            </h4>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('label')}</label>
                        <input 
                            className="w-full border border-slate-300 p-2 text-sm rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            value={draft.label} 
                            onChange={e => handleChange('label', e.target.value)} 
                            placeholder={t('label')}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('type')}</label>
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
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('url')}</label>
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
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('content')}</label>
                        <textarea 
                            className="w-full border border-slate-300 p-2 text-sm rounded-md h-24 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-slate-600"
                            value={draft.content || ''} 
                            onChange={e => handleChange('content', e.target.value)} 
                            placeholder="# Markdown content here..."
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button onClick={onCancel} className="text-xs px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 font-medium">{t('cancel')}</button>
                    <button onClick={() => onSave(draft)} className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm font-medium">{t('saveChanges')}</button>
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
    renderList: (list: MenuItem[], pathPrefix: number[], labelPathPrefix?: string[]) => React.ReactNode;
    setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    setEditingItemPath: React.Dispatch<React.SetStateAction<number[] | null>>;
    editingItemPath: number[] | null;
    updateItemAt: (path: number[], newItem: MenuItem, list: MenuItem[]) => MenuItem[];
    deleteItemAt: (path: number[], list: MenuItem[]) => MenuItem[];
    addItemAt: (path: number[] | null, newItem: MenuItem, list: MenuItem[]) => MenuItem[];
    selectedPath: number[] | null;
    setSelectedPath: (path: number[] | null) => void;
    // Team folder collapse handling: see teamCollapsedLabels docstring in
    // Options main. labelPath is the trail of labels from root to this row's
    // PARENT (the row's own label is appended at the click site). currentTeamId
    // namespaces keys so two teams with same-named folders track collapse
    // independently.
    teamCollapsedLabels: Set<string>;
    toggleTeamCollapsed: (labelKey: string) => void;
    labelPath: string[];
    currentTeamId: string;
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
    setSelectedPath,
    teamCollapsedLabels,
    toggleTeamCollapsed,
    labelPath,
    currentTeamId,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const currentPath = [...path, index];
    const isEditing = editingItemPath && editingItemPath.join('.') === currentPath.join('.');
    const isSelected = selectedPath && selectedPath.join('.') === currentPath.join('.');
    const isTeamItem = item.source === 'team';
    // Team folders ignore item.collapsed (next SW sync would wipe a write anyway)
    // and read from the ephemeral teamCollapsedLabels Set. Personal folders keep
    // using item.collapsed which persists into dh_items via the setItems
    // useEffect (instant persistence; no Save button as of Plan A).
    const teamCollapseKey = isTeamItem && item.type === 'folder'
        ? currentTeamId + '\0' + [...labelPath, item.label].join('\0')
        : '';
    const effectiveCollapsed = isTeamItem
        ? teamCollapsedLabels.has(teamCollapseKey)
        : !!item.collapsed;

    // Visual State for Drag
    const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | 'inside' | null>(null);

    // Drag Logic
    const [{ isDragging }, drag] = useDrag({
        type: ItemType.ITEM,
        item: { path: currentPath, type: item.type },
        canDrag: !isTeamItem,
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
                            // Plan A: single click on any part of a folder row
                            // toggles collapsed state AND selects the folder.
                            // Clicking the same folder again toggles back AND
                            // clears selection (cancel pattern). Personal folders
                            // persist via item.collapsed on dh_items; team folders
                            // use the ephemeral teamCollapsedLabels Set keyed by
                            // `${teamId}\0${...labelPath}\0${label}` because
                            // dh_team_items is wiped by SW sync.
                            if (isTeamItem) {
                                const key = currentTeamId + '\0' + [...labelPath, item.label].join('\0');
                                toggleTeamCollapsed(key);
                            } else {
                                const newItem = { ...item, collapsed: !item.collapsed };
                                setItems(prev => updateItemAt(currentPath, newItem, prev));
                            }
                            setSelectedPath(isSelected ? null : currentPath);
                        } else {
                            setSelectedPath(null);
                        }
                    }}
                >
                    <div 
                        className="flex items-center gap-3 flex-1 min-w-0"
                    >
                        <span className={cn("p-1.5 rounded-md", item.type === 'folder' ? "bg-amber-100 text-amber-600" : item.type === 'link' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600")}>
                            {item.type === 'folder' ? (effectiveCollapsed ? <Folder size={16} /> : <FolderOpen size={16} />) : item.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                        </span>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-700 text-sm truncate">{item.label}</span>
                            {item.type === 'link' && item.url && <span className="text-xs text-slate-400 truncate font-mono">{item.url}</span>}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isTeamItem ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400" title="Team managed">
                                <Lock size={12} /> Team
                            </span>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            )}
            </div>
            
            {/* Children */}
            {item.children && item.children.length > 0 && !effectiveCollapsed && (
                <div className="ml-5 pl-2 border-l-2 border-slate-100 mt-1 space-y-1">
                    {renderList(item.children, currentPath, [...labelPath, item.label])}
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
    const { t } = useTranslation();
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
            <span className="text-xs font-medium">{t('dropToMove')}</span>
        </div>
    );
};

// --- Main Options Component ---
const Options: React.FC = () => {
    // State
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
    const [items, setItems] = useState<MenuItem[]>([]);
    // Plan A: bookmark editor mutations (add / edit / delete / drag / toggle
    // collapse) persist instantly via this effect. Guard prevents the initial
    // mount writing an empty array over the storage's real data before the
    // load completes.
    const itemsLoadedRef = useRef(false);
    useEffect(() => {
        if (!itemsLoadedRef.current) return;
        chrome.storage.local.set({ dh_items: items });
    }, [items]);
    type StatusMessage = { message: string; type: 'success' | 'error' } | null;
    const [status, setStatus] = useState<StatusMessage>(null);
    const statusTimerRef = useRef<number | null>(null);
    // Track the manifest URL of the last successful fetch. When persistPrefs
    // sees a different teamManifestUrl come through, it triggers a fresh
    // manifest fetch. Sentinel '__unset__' means "no load/save has happened
    // yet" so the very first storage hydration (which writes prefs back
    // unchanged) does not spuriously count as a URL change.
    const lastFetchedManifestUrlRef = useRef<string>('__unset__');

    // Status toast helpers - centralize timer cleanup and type tagging.
    // Use these instead of calling setStatus directly so success/error colors
    // and auto-dismiss timing stay consistent across the file.
    const clearStatus = () => {
        if (statusTimerRef.current !== null) {
            clearTimeout(statusTimerRef.current);
            statusTimerRef.current = null;
        }
        setStatus(null);
    };
    const showStatus = (message: string, type: 'success' | 'error', autoDismissMs?: number) => {
        if (statusTimerRef.current !== null) {
            clearTimeout(statusTimerRef.current);
            statusTimerRef.current = null;
        }
        setStatus({ message, type });
        if (autoDismissMs !== undefined) {
            statusTimerRef.current = window.setTimeout(() => {
                setStatus(null);
                statusTimerRef.current = null;
            }, autoDismissMs);
        }
    };
    const showSuccess = (message: string, autoDismissMs?: number) => showStatus(message, 'success', autoDismissMs);
    const showError = (message: string, autoDismissMs?: number) => showStatus(message, 'error', autoDismissMs);
    const [hostVersion, setHostVersion] = useState<string>("");
    const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Editor State
    const [editingItemPath, setEditingItemPath] = useState<number[] | null>(null); // path of indices
    const [selectedPath, setSelectedPath] = useState<number[] | null>(null); // path of currently selected folder

    // Team Catalog State
    const [teamList, setTeamList] = useState<{ id: string; label: string }[]>([]);
    const [teamSynced, setTeamSynced] = useState<string>("");
    const [isSyncingTeam, setIsSyncingTeam] = useState(false);
    const [teamItems, setTeamItems] = useState<MenuItem[]>([]);
    const [teamFetchError, setTeamFetchError] = useState<boolean>(false);
    // Plan A onBlur validation feedback for the manifest URL field. True
    // when the user typed something that doesn't parse as a URL — we
    // refuse to persist garbage but want to tell them why nothing
    // happened. Cleared on next onChange (any keystroke = user is fixing
    // it) and on successful blur paths (empty / valid).
    const [manifestUrlInvalid, setManifestUrlInvalid] = useState<boolean>(false);
    // Ephemeral per-Options-session collapse state for team folders. Personal
    // folder collapse persists via item.collapsed field on dh_items. Team
    // folder collapse cannot be written to dh_team_items because the next SW
    // sync overwrites it; instead we track collapsed team folders here.
    // Keys are namespaced by team id: `${teamId}\0${...labelPath}`.
    // Switching teams keeps Set state but each team's keys are isolated by
    // their distinct teamId prefix.
    const [teamCollapsedLabels, setTeamCollapsedLabels] = useState<Set<string>>(new Set());
    // Mirrors itemsLoadedRef: prevents the initial empty-Set mount from
    // overwriting stored collapse state before chrome.storage.local.get
    // resolves. Flipped to true once the initial load completes.
    const teamCollapsedLoadedRef = useRef(false);

    const toggleTeamCollapsed = (labelKey: string) => {
        setTeamCollapsedLabels(prev => {
            const next = new Set(prev);
            if (next.has(labelKey)) next.delete(labelKey);
            else next.add(labelKey);
            return next;
        });
    };

    // Markdown preview toggles
    const [previewInstructions, setPreviewInstructions] = useState(true);
    const [previewPrompt, setPreviewPrompt] = useState(true);

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
                // Seed the change-detection ref with whatever is on disk so the
                // very first save after page open is a no-op for manifest fetch
                // (only an explicit user-driven URL change should trigger fetch).
                lastFetchedManifestUrlRef.current = loadedPrefs.teamManifestUrl || '';
                
                setPrefs(prev => {
                    // Merge strategy: Default -> Loaded -> User Edits (prev)
                    // We must be careful not to let 'prev' (which starts as Default) overwrite 'loaded' 
                    // unless the user actually changed it.
                    
                    const base = { ...DEFAULT_PREFS, ...loadedPrefs };
                    const final: any = { ...base };

                    // Apply only changed fields from prev
                    (Object.keys(prev) as Array<keyof Preferences>).forEach(k => {
                        const key = k as keyof Preferences;
                        if (prev[key] !== DEFAULT_PREFS[key]) {
                            // User has modified this field, preserve it
                            final[key] = prev[key];
                        }
                    });

                    return final as Preferences;
                });
            } else {
                // No saved prefs yet (first run). The ref defaults to '' so the
                // first save with a non-empty manifest URL triggers a fetch.
                lastFetchedManifestUrlRef.current = '';
            }

            // Sync with Native Host (Source of Truth for backend config)
            chrome.runtime.sendMessage({ 
                type: "NATIVE_MSG",
                payload: { action: "get_config" } 
            }, (response) => {
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
                            // Check incoming preference first
                            const incomingWorkspaceOnly = hostConfig.extension_preferences?.use_workspace_only ?? prev.useWorkspaceOnly;

                            // Only sync skillDirectories if we are NOT in workspace-only mode
                            if (incomingWorkspaceOnly !== true) {
                                const skillsStr = hostConfig.skill_directories.join(", ");
                                if (skillsStr !== prev.skillDirectories) {
                                    newPrefs.skillDirectories = skillsStr;
                                    changed = true;
                                }
                            }
                        }

                        // 3. MCP Config Path
                        if (hostConfig.mcp_config_path && hostConfig.mcp_config_path !== prev.mcpConfigPath) {
                            newPrefs.mcpConfigPath = hostConfig.mcp_config_path;
                            changed = true;
                        }

                        // 4. User Instructions (Split Prompt)
                        // Host now returns _user_instructions_raw for the editable part
                        // Fallback to system_message if raw is missing (legacy host)
                        if (hostConfig._user_instructions_raw !== undefined) {
                            if (hostConfig._user_instructions_raw !== prev.userInstructions) {
                                newPrefs.userInstructions = hostConfig._user_instructions_raw;
                                changed = true;
                            }
                        } else if (hostConfig.system_message && hostConfig.system_message.content) {
                            // Legacy fallback
                            if (hostConfig.system_message.content !== prev.userInstructions) {
                                newPrefs.userInstructions = hostConfig.system_message.content;
                                changed = true;
                            }
                        }

                        // 4. Extension Preferences (Synced from Host - Source of Truth)
                        if (hostConfig.extension_preferences) {
                            const extPrefs = hostConfig.extension_preferences;
                            
                            if (extPrefs.auto_analyze_mode) newPrefs.autoAnalyzeMode = extPrefs.auto_analyze_mode;
                            if (extPrefs.user_prompt !== undefined) newPrefs.userPrompt = extPrefs.user_prompt;
                            if (extPrefs.enable_status_bubble !== undefined) newPrefs.enableStatusBubble = extPrefs.enable_status_bubble;
                            if (extPrefs.beta_channel_enabled !== undefined) newPrefs.betaChannelEnabled = extPrefs.beta_channel_enabled;
                            if (extPrefs.use_workspace_only !== undefined) newPrefs.useWorkspaceOnly = extPrefs.use_workspace_only;
                            if (extPrefs.log_level) newPrefs.logLevel = extPrefs.log_level;
                            
                            // Visual Settings (Now synced)
                            if (extPrefs.language) newPrefs.language = extPrefs.language;
                            if (extPrefs.primary_color) newPrefs.primaryColor = extPrefs.primary_color;
                            if (extPrefs.button_text) newPrefs.buttonText = extPrefs.button_text;
                            if (extPrefs.offset_bottom !== undefined) newPrefs.offsetBottom = extPrefs.offset_bottom;
                            if (extPrefs.offset_right !== undefined) newPrefs.offsetRight = extPrefs.offset_right;

                            // Team Catalog (mirrored as backup; host does not read these)
                            if (extPrefs.team_catalog_enabled !== undefined) newPrefs.teamCatalogEnabled = extPrefs.team_catalog_enabled;
                            if (extPrefs.team_manifest_url !== undefined) {
                                newPrefs.teamManifestUrl = extPrefs.team_manifest_url;
                                // Re-seed the change-detection ref so a host-driven URL
                                // does not look like a user edit on the next save.
                                lastFetchedManifestUrlRef.current = extPrefs.team_manifest_url || '';
                            }
                            if (extPrefs.team !== undefined) newPrefs.team = extPrefs.team;
                            if (extPrefs.team_label !== undefined) newPrefs.teamLabel = extPrefs.team_label;

                            changed = true;
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
            // Mark hydration complete — subsequent setItems calls will now
            // fall through the persist-on-change useEffect above.
            itemsLoadedRef.current = true;
        });

        // Load team catalog metadata
        chrome.storage.local.get(
            ['dh_team_synced', 'dh_team_items', 'dh_team_manifest', 'dh_team_collapsed_labels'],
            (data: any) => {
                if (data.dh_team_synced) setTeamSynced(data.dh_team_synced);
                if (Array.isArray(data.dh_team_items)) setTeamItems(data.dh_team_items);
                // Populate dropdown from cached manifest. No fetch here - the service
                // worker startup hook is the only auto-fetch trigger (spec § 3.4).
                // To force a refresh, the user clicks the Refresh button below.
                if (data.dh_team_manifest && Array.isArray(data.dh_team_manifest.teams)) {
                    setTeamList(
                        data.dh_team_manifest.teams.map((t: any) => ({ id: t.id, label: t.label })),
                    );
                }
                // Restore collapsed-folder labels for team items. Stored as an
                // array because Sets don't survive JSON / chrome.storage round-
                // trip. Keys take the form `${teamId}\0${...labelPath}\0${label}`
                // — stale keys (e.g. for a team the user no longer belongs to)
                // are harmless: they won't match any rendered folder so they
                // just sit dormant until the next set-write replaces them.
                if (Array.isArray(data.dh_team_collapsed_labels)) {
                    setTeamCollapsedLabels(new Set(data.dh_team_collapsed_labels));
                }
                teamCollapsedLoadedRef.current = true;
            },
        );
    }, []);

    // Persist teamCollapsedLabels on every change. Mirrors the dh_items
    // useEffect pattern. Guarded so the initial empty-Set mount doesn't
    // clobber stored data before the load-effect resolves.
    useEffect(() => {
        if (!teamCollapsedLoadedRef.current) return;
        chrome.storage.local.set({
            dh_team_collapsed_labels: Array.from(teamCollapsedLabels),
        });
    }, [teamCollapsedLabels]);

    // --- Prefs Handlers ---
    // Generic onChange for text/number inputs and the color picker. Plan A:
    // these are text-ish fields, so onChange only mutates local state.
    // Persistence happens in handlePrefBlur when the field loses focus —
    // prevents storms of chrome.storage.set + host RPC during typing /
    // color-picker drag.
    const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPrefs(prev => ({
            ...prev,
            [name]: name.startsWith('offset') ? Number(value) : value
        }));
    };

    // onBlur sibling of handlePrefChange — commits whatever the user typed
    // by routing through persistPrefs against the latest state snapshot.
    const handlePrefBlur = () => {
        setPrefs(prev => {
            persistPrefs(prev);
            return prev;
        });
    };

    // --- Persistence: single entry point for ALL prefs writes ---
    //
    // Plan A: Options runs in "instant persistence" mode. Every onChange
    // (selects/checkboxes) and every onBlur (text inputs) routes through
    // persistPrefs(), which:
    //
    //   1. Writes dh_prefs to chrome.storage.local
    //   2. Fires update_config to the host (fire-and-forget; host loads the
    //      file on startup anyway so transient failure is recoverable)
    //   3. If teamManifestUrl differs from lastFetchedManifestUrlRef AND
    //      team catalog is enabled, asks the SW to fetch the manifest.
    //      Caller opts into this with { fetchManifest: true } so e.g. a
    //      colour-picker change does not waste an HTTP call.
    //
    // Items (dh_items) are NOT written here — the bookmark editor uses
    // setItems directly into chrome.storage via its own useEffect (see
    // dh_items persistence above). Mixing the two would create double-writes
    // on every editor click. Spec § 3.5 / AGENTS.md § 3 (after C7 update).
    const buildHostConfigPayload = (nextPrefs: Preferences) => ({
        action: "update_config",
        payload: {
            user_instructions: nextPrefs.userInstructions,
            user_prompt: nextPrefs.userPrompt,
            config: {
                root_path: nextPrefs.rootPath,
                skill_directories: nextPrefs.skillDirectories ? nextPrefs.skillDirectories.split(',').map(s => s.trim()).filter(Boolean) : [],
                mcp_config_path: nextPrefs.mcpConfigPath,
                extension_preferences: {
                    auto_analyze_mode: nextPrefs.autoAnalyzeMode,
                    user_prompt: nextPrefs.userPrompt,
                    enable_status_bubble: nextPrefs.enableStatusBubble,
                    beta_channel_enabled: nextPrefs.betaChannelEnabled,
                    use_workspace_only: nextPrefs.useWorkspaceOnly,
                    log_level: nextPrefs.logLevel,
                    language: nextPrefs.language,
                    primary_color: nextPrefs.primaryColor,
                    button_text: nextPrefs.buttonText,
                    offset_bottom: nextPrefs.offsetBottom,
                    offset_right: nextPrefs.offsetRight,
                    team_catalog_enabled: nextPrefs.teamCatalogEnabled,
                    team_manifest_url: nextPrefs.teamManifestUrl,
                    team: nextPrefs.team,
                    team_label: nextPrefs.teamLabel,
                }
            }
        }
    });

    const persistPrefs = (nextPrefs: Preferences, opts?: { fetchManifest?: boolean }) => {
        chrome.storage.local.set({ dh_prefs: nextPrefs }, () => {
            // Host update — fire-and-forget. Failures are logged but don't
            // surface to the user because the host re-reads config.json on
            // next startup. A red toast would be noisy for every keystroke
            // in dev when the host isn't running.
            chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: buildHostConfigPayload(nextPrefs)
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Could not update host immediately:", chrome.runtime.lastError.message);
                }
            });

            // Manifest fetch — only when caller opts in AND URL actually
            // changed since last fetch. Diff guard prevents a refetch when
            // the user toggles e.g. teamCatalogEnabled without touching URL.
            if (opts?.fetchManifest && nextPrefs.teamCatalogEnabled && nextPrefs.teamManifestUrl) {
                const previousUrl = lastFetchedManifestUrlRef.current;
                const currentUrl = nextPrefs.teamManifestUrl;
                if (currentUrl !== previousUrl) {
                    lastFetchedManifestUrlRef.current = currentUrl;
                    chrome.runtime.sendMessage(
                        { type: "SYNC_TEAM_CATALOG", payload: { manifestOnly: true } },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                showError(`Manifest fetch failed: ${chrome.runtime.lastError.message}`, 5000);
                                return;
                            }
                            if (!response || response.status !== "success") {
                                showError(`Manifest fetch failed: ${response?.error || 'Unknown error'}`, 5000);
                            }
                        }
                    );
                }
            }
        });
    };

    // Convenience: setPrefs + persist in one call. All instant-persist
    // sites (selects, checkboxes, toggles) use this. Text-input onBlur
    // handlers also use it after their onChange-only setPrefs.
    const updatePref = (patch: Partial<Preferences>, opts?: { fetchManifest?: boolean }) => {
        setPrefs(prev => {
            const next = { ...prev, ...patch };
            persistPrefs(next, opts);
            return next;
        });
    };

    const handleReset = () => {
        if (confirm(t('resetConfirm'))) {
            setPrefs(DEFAULT_PREFS);
            chrome.storage.local.remove(["dh_prefs", "dh_items", "dh_team", "dh_team_items", "dh_team_etag", "dh_team_manifest", "dh_team_manifest_etag", "dh_team_synced", "dh_team_collapsed_labels"], () => {
                loadItems().then(setItems);
                setTeamItems([]);
                setTeamSynced("");
                setTeamCollapsedLabels(new Set());
                // Sync host with default prefs so config.json matches the
                // freshly-reset extension state. persistPrefs writes dh_prefs
                // back too — that's OK because we just removed it; the
                // overwrite is the same defaults we'd otherwise hydrate from
                // DEFAULT_PREFS on next load.
                persistPrefs(DEFAULT_PREFS);
                showSuccess(t('resetComplete'), 2000);
            });
        }
    };

    // --- Team Catalog Handlers ---
    const handleTeamChange = (teamId: string) => {
        const selectedTeam = teamList.find(t => t.id === teamId);
        // Plan A: team selection is "instant persist". Symptom 3 fix —
        // previously this only called setPrefs (React state), so refreshing
        // the page would show the dropdown reverted to the old team while
        // dh_team_items was already cleared (the SW message below ran
        // immediately). Now updatePref writes dh_prefs to storage AND fires
        // update_config to host in a single shot, keeping state aligned.
        updatePref({
            team: teamId || undefined,
            teamLabel: selectedTeam?.label || undefined,
        });

        if (!teamId) {
            // Clear team data
            setTeamItems([]);
            setTeamSynced("");
            chrome.runtime.sendMessage({
                type: "SYNC_TEAM_CATALOG",
                payload: { teamId: null }
            });
            return;
        }

        // Trigger sync
        setIsSyncingTeam(true);
        chrome.runtime.sendMessage({
            type: "SYNC_TEAM_CATALOG",
            payload: { teamId }
        }, (response) => {
            setIsSyncingTeam(false);
            if (chrome.runtime.lastError) {
                showError(`Team sync failed: ${chrome.runtime.lastError.message}`, 3000);
                return;
            }
            if (response?.status === "success") {
                setTeamItems(response.data.items || []);
                setTeamSynced(new Date().toISOString());
            } else {
                showError(`Team sync failed: ${response?.error || 'Unknown error'}`, 3000);
            }
        });
    };

    const handleTeamRefresh = async () => {
        if (!prefs.teamManifestUrl || !prefs.team) return;
        setIsSyncingTeam(true);
        setTeamFetchError(false);
        try {
            const { syncTeamBookmarks } = await import('../utils/teamCatalog');
            const items = await syncTeamBookmarks(prefs.teamManifestUrl, prefs.team);
            setTeamItems(items);
            setTeamSynced(new Date().toISOString());
            // Refresh the dropdown if the manifest changed during this sync
            const cached = await new Promise<any>((resolve) => {
                chrome.storage.local.get(['dh_team_manifest'], resolve);
            });
            if (cached.dh_team_manifest && Array.isArray(cached.dh_team_manifest.teams)) {
                setTeamList(
                    cached.dh_team_manifest.teams.map((t: any) => ({ id: t.id, label: t.label })),
                );
            }
        } catch (e) {
            console.warn('[Options] Team refresh failed:', e);
            setTeamFetchError(true);
        } finally {
            setIsSyncingTeam(false);
        }
    };

    // Listen for updates
    useEffect(() => {
        const handleRuntimeMsg = (message: any) => {
            if (message.type === "NATIVE_UPDATE_AVAILABLE") {
                const currentVer = getExtensionVersion();
                if (message.payload.version === currentVer) {
                    setUpdateAvailable(null);
                    chrome.storage.local.remove("pending_update");
                    return;
                }
                console.log("[Options] Received update available:", message.payload);
                setUpdateAvailable(message.payload);
                showSuccess(`v${message.payload.version} ${t('availableForUpdate')}`, 5000);
            }
            
            if (message.type === "NATIVE_UPDATE_NOT_AVAILABLE") {
                showSuccess(t('upToDate'), 3000);
            }

            if (message.type === "NATIVE_UPDATE_ERROR") {
                showError(`${t('checkFailed')}: ${message.payload.error}`, 5000);
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
                const currentVer = getExtensionVersion();
                if (pending.version === currentVer) {
                    // Already updated — stale entry, clean up
                    chrome.storage.local.remove("pending_update");
                    return;
                }
                console.log("[Options] Found pending update in storage:", pending);
                setUpdateAvailable(pending);
            }
        });
    }, []);

    const handleUpdate = () => {
        if (!updateAvailable) return;
        if (!confirm(`Update to version ${updateAvailable.version}? This will restart the extension.`)) return;

        setIsUpdating(true);
        showSuccess(t('downloadingUpdate'));

        chrome.runtime.sendMessage({
            type: "NATIVE_MSG",
            payload: { 
                action: "perform_update", 
                payload: { url: updateAvailable.url } 
            }
        }, (response) => {
            setIsUpdating(false);
            if (chrome.runtime.lastError) {
                showError(`${t('updateFailed')}: ` + chrome.runtime.lastError.message);
                return;
            }
            
            if (response && response.status === "success") {
                setUpdateAvailable(null);
                chrome.storage.local.remove("pending_update");
                showSuccess(t('updateSuccess'));
                setTimeout(() => {
                    chrome.runtime.reload();
                }, 1000);
            } else {
                showError(`${t('updateFailed')}: ` + (response?.error || "Unknown error"));
            }
        });
    };

    const handleCheckUpdates = () => {
        showSuccess(t('checkingForUpdates'));
        chrome.runtime.sendMessage({ 
            type: "NATIVE_MSG", 
            payload: { action: "check_updates" } 
        });
        
        // Safety timeout (60s) in case host doesn't respond.
        // Only flip to "timed out" if the status is still the "checking" message
        // (i.e. user hasn't received a real response in the meantime).
        const checkingMsg = t('checkingForUpdates');
        const timedOutMsg = t('checkTimedOut');
        setTimeout(() => {
            setStatus(prev => (prev?.message === checkingMsg ? { message: timedOutMsg, type: 'error' } : prev));
            setTimeout(() => setStatus(prev => (prev?.message === timedOutMsg ? null : prev)), 3000);
        }, 60000);
    };

    // Merged view for the bookmark manager. Personal items are editable;
    // team items render with a Lock icon (existing isTeamItem branch in
    // renderRow at line ~419) and cannot be dragged (canDrag: !isTeamItem
    // at line ~259). Personal items always occupy the first items.length
    // slots so path-based handlers (setItems(prev => updateItemAt(...)))
    // remain correct without translation.
    // Spec § 3.3 / § 3.5.
    //
    // CRITICAL: read-only handlers (getSelectedFolderName, isSelectedPathTeam)
    // resolve paths against THIS merged list because selectedPath comes from
    // the rendered tree which is also merged. Mutation handlers (addItemAt,
    // updateItemAt, deleteItemAt + setItems) continue to operate on personal
    // `items` only. Calling sites are responsible for blocking mutations
    // against team paths (see Add button at L~1825).
    const mergedItems = useMemo(() => {
        const teamCatalogEnabled = prefs.teamCatalogEnabled === true;
        if (!teamCatalogEnabled || !Array.isArray(teamItems) || teamItems.length === 0) {
            return items;
        }
        return mergeMenus(items, teamItems);
    }, [items, teamItems, prefs.teamCatalogEnabled]);

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
        // selectedPath indexes into the merged view (rendered tree). Resolving
        // against personal-only `items` returned null for team folders and
        // produced the "Add to null" button text. Use mergedItems instead.
        const item = getItemAt(selectedPath, mergedItems);
        return item && item.type === 'folder' ? item.label : null;
    };

    // True iff the currently selected path points at a team-sourced folder.
    // Used to disable mutations the user is not allowed to make (e.g. the
    // "Add to X" button when X is a team folder).
    const isSelectedPathTeam = () => {
        if (!selectedPath) return false;
        const item = getItemAt(selectedPath, mergedItems);
        return !!item && (item as any).source === 'team';
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
        // Defense in depth: team items live at indices >= items.length in
        // the merged view. Mutation handlers operate on personal-only state
        // (items) via setItems. If a drop accidentally targets a team item
        // path, the resulting updateItemAt / addItemAt call would silently
        // miss (out-of-bounds into personal items). canDrop on the team
        // rows is the primary defense; this guard is the belt-and-braces.
        if (hoverPath.length > 0 && hoverPath[0] >= items.length) {
            console.warn('[Options] moveItem ignored: hover path targets team region', { dragPath, hoverPath });
            return;
        }
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

        // Team folders can't persist collapsed via item.collapsed (next SW
        // sync wipes dh_team_items), so DraggableItem keys them into the
        // ephemeral teamCollapsedLabels Set with the format
        // `${teamId}\0${...labelPath}\0${label}` (see L419). Mirror that
        // construction here so Collapse/Expand All affects team folders too.
        const teamId = prefs.team || '';
        const teamKeys: string[] = [];
        const collectTeamFolderKeys = (list: MenuItem[], labelPath: string[]): void => {
            for (const item of list) {
                if (item.type === 'folder') {
                    teamKeys.push(teamId + '\0' + [...labelPath, item.label].join('\0'));
                    collectTeamFolderKeys(item.children || [], [...labelPath, item.label]);
                }
            }
        };
        collectTeamFolderKeys(teamItems, []);
        setTeamCollapsedLabels(prev => {
            const next = new Set(prev);
            if (collapse) {
                for (const k of teamKeys) next.add(k);
            } else {
                for (const k of teamKeys) next.delete(k);
            }
            return next;
        });
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
                showSuccess(t('importSuccess'), 2000);
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
    const renderList = (list: MenuItem[], pathPrefix: number[] = [], labelPathPrefix: string[] = []) => {
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
                        teamCollapsedLabels={teamCollapsedLabels}
                        toggleTeamCollapsed={toggleTeamCollapsed}
                        labelPath={labelPathPrefix}
                        currentTeamId={prefs.team || ''}
                    />
                ))}
            </ul>
        );
    };

    return (
        <PrefsLanguageProvider language={prefs.language ?? 'auto'}>
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
                                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t('appName')}</h1>
                                <div className="flex gap-3 text-xs text-slate-500 font-medium uppercase tracking-wider items-center">
                                    <span>Extension v{getExtensionVersion()}</span>
                                    {hostVersion && <span>• {t('hostVersion')} v{hostVersion}</span>}
                                    <button 
                                        onClick={handleCheckUpdates} 
                                        className="ml-1 p-1 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors" 
                                        title={t('updateAvailable')}
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
                                    {isUpdating ? t('updating') : t('updateNow')}
                                </button>
                            )}
                             <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-sm font-medium transition-colors">
                                <RotateCcw size={16} /> {t('reset')}
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div
                            className={
                                status.type === 'error'
                                    ? "bg-red-50 text-red-700 text-center py-3 font-medium text-sm border-b border-red-100 flex items-center justify-center gap-2 animate-fade-in-down"
                                    : "bg-emerald-50 text-emerald-700 text-center py-3 font-medium text-sm border-b border-emerald-100 flex items-center justify-center gap-2 animate-fade-in-down"
                            }
                            role={status.type === 'error' ? 'alert' : 'status'}
                        >
                            <div className={status.type === 'error' ? "w-2 h-2 bg-red-500 rounded-full" : "w-2 h-2 bg-emerald-500 rounded-full"}></div>
                            {status.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* Sidebar: Visual Settings */}
                        <div className="lg:col-span-5 p-8 border-r border-slate-100 bg-slate-50/30">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Settings size={14} /> {t('appearance')}
                            </h2>
                            
                            <div className="space-y-8">
                                {/* Preview */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('livePreview')}</label>
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
                                    {/* Language Selector */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('language')}</label>
                                        <select
                                            name="language"
                                            value={prefs.language || 'auto'}
                                            onChange={(e) => updatePref({ language: e.target.value as LanguageCode })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                        >
                                            <option value="auto">{t('auto')}</option>
                                            <option value="en">English</option>
                                            <option value="zh">中文 (Chinese)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('buttonLabel')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400"><Type size={14} /></span>
                                            <input
                                                type="text"
                                                name="buttonText"
                                                value={prefs.buttonText}
                                                onChange={handlePrefChange} onBlur={handlePrefBlur}
                                                maxLength={3}
                                                className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                                                placeholder="DH"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('brandColor')}</label>
                                        <div className="flex gap-2">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-sm border border-slate-200 shrink-0 hover:scale-105 transition-transform">
                                                <input
                                                    type="color"
                                                    name="primaryColor"
                                                    value={prefs.primaryColor}
                                                    onChange={handlePrefChange} onBlur={handlePrefBlur}
                                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                name="primaryColor"
                                                value={prefs.primaryColor}
                                                onChange={handlePrefChange} onBlur={handlePrefBlur}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none uppercase font-mono text-sm text-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('offsetBottom')}</label>
                                            <input
                                                type="number"
                                                name="offsetBottom"
                                                value={prefs.offsetBottom}
                                                onChange={handlePrefChange} onBlur={handlePrefBlur}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('offsetRight')}</label>
                                            <input
                                                type="number"
                                                name="offsetRight"
                                                value={prefs.offsetRight}
                                                onChange={handlePrefChange} onBlur={handlePrefBlur}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-200">
                                         <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Maximize2 size={14} /> {t('behavior')}
                                        </h2>
                                        
                                        {/* 1. Automatic Analyze with Status Bubble */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('autoAnalyze')}</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                {t('autoAnalyzeDesc')}
                                            </p>
                                            <select
                                                name="autoAnalyzeMode"
                                                value={prefs.autoAnalyzeMode || 'disabled'}
                                                onChange={(e) => updatePref({ autoAnalyzeMode: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                            >
                                                <option value="disabled">{t('modeDisabled')}</option>
                                                <option value="critical">{t('modeCritical')}</option>
                                                <option value="new_cases">{t('modeNew')}</option>
                                                <option value="always">{t('modeAlways')}</option>
                                            </select>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="enableStatusBubble"
                                                checked={prefs.enableStatusBubble !== false}
                                                onChange={(e) => updatePref({ enableStatusBubble: e.target.checked })}
                                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                            />
                                            <label htmlFor="enableStatusBubble" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                                                {t('statusBubble')}
                                            </label>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="betaChannelEnabled"
                                                checked={prefs.betaChannelEnabled === true}
                                                onChange={(e) => {
                                                    const enabled = e.target.checked;
                                                    updatePref({ betaChannelEnabled: enabled });
                                                    try {
                                                        trackEvent('Beta Channel Toggled', { enabled });
                                                    } catch { /* telemetry never blocks UX */ }
                                                }}
                                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                            />
                                            <label htmlFor="betaChannelEnabled" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                                                {t('betaChannelLabel')}
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 ml-6 leading-snug">
                                            {t('betaChannelHint')}
                                        </p>

                                        {/* Log Level */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('logLevel')}</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                {t('logLevelDesc')}
                                            </p>
                                            <select
                                                value={prefs.logLevel || 'INFO'}
                                                onChange={(e) => updatePref({ logLevel: e.target.value as Preferences['logLevel'] })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                            >
                                                <option value="DEBUG">DEBUG</option>
                                                <option value="INFO">INFO</option>
                                                <option value="WARNING">WARNING</option>
                                                <option value="ERROR">ERROR</option>
                                            </select>
                                        </div>
                                        
                                        {/* Team Catalog */}
                                        <div className="mt-6 pt-6 border-t border-slate-200">
                                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Building2 size={14} /> {t('teamCatalog')}
                                            </h2>

                                            {/* Toggle: Enable Team Catalog */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="teamCatalogEnabled"
                                                    checked={prefs.teamCatalogEnabled === true}
                                                    onChange={(e) => {
                                                        const enabled = e.target.checked;
                                                        updatePref({ teamCatalogEnabled: enabled });
                                                        try {
                                                            trackEvent('Team Catalog Toggled', { enabled });
                                                        } catch { /* telemetry never blocks UX */ }
                                                    }}
                                                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                                />
                                                <label htmlFor="teamCatalogEnabled" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                                                    {t('enableTeamCatalog')}
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 ml-6 leading-snug">
                                                {t('enableTeamCatalogHint')}
                                            </p>

                                            {/* Manifest URL input (revealed when toggle is on) */}
                                            {prefs.teamCatalogEnabled && (
                                                <div className="mt-3">
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('manifestUrl')}</label>
                                                    <input
                                                        type="text"
                                                        value={prefs.teamManifestUrl || ''}
                                                        placeholder={t('manifestUrlPlaceholder')}
                                                        onChange={(e) => {
                                                            // Any keystroke = user is editing; clear the
                                                            // "not saved" red state so they don't keep
                                                            // staring at it after they've already started
                                                            // fixing the typo.
                                                            if (manifestUrlInvalid) setManifestUrlInvalid(false);
                                                            setPrefs(prev => ({ ...prev, teamManifestUrl: e.target.value }));
                                                        }}
                                                        onBlur={() => {
                                                            // Plan A: persist on focus loss. Three cases:
                                                            //   (a) empty   → user cleared the URL: wipe
                                                            //                  cached manifest, team items,
                                                            //                  collapse state, and team
                                                            //                  selection so the UI fully
                                                            //                  unwinds. Persist prefs
                                                            //                  (team / teamLabel also blanked)
                                                            //                  so reload doesn't see ghosts.
                                                            //   (b) valid   → persist; if URL actually
                                                            //                  changed since last fetch,
                                                            //                  trigger a new manifest fetch
                                                            //                  via persistPrefs opts.
                                                            //   (c) invalid → do nothing to storage / host /
                                                            //                  manifest. Flag the input red
                                                            //                  + show "not saved" hint so
                                                            //                  silent failure is visible.
                                                            const url = prefs.teamManifestUrl || '';
                                                            if (!url) {
                                                                // (a) clear-out
                                                                setManifestUrlInvalid(false);
                                                                (async () => {
                                                                    const { clearTeamBookmarks } = await import('../utils/teamCatalog');
                                                                    await clearTeamBookmarks();
                                                                    setTeamList([]);
                                                                    setTeamItems([]);
                                                                    setTeamCollapsedLabels(new Set());
                                                                    setTeamSynced('');
                                                                    setTeamFetchError(false);
                                                                    lastFetchedManifestUrlRef.current = '';
                                                                    updatePref({ teamManifestUrl: '', team: '', teamLabel: '' });
                                                                })();
                                                                return;
                                                            }
                                                            let valid = false;
                                                            try { new URL(url); valid = true; }
                                                            catch { valid = false; }
                                                            if (!valid) {
                                                                // (c) invalid: leave storage/host untouched,
                                                                // raise the red hint.
                                                                setManifestUrlInvalid(true);
                                                                return;
                                                            }
                                                            // (b) valid: persist + fetch if changed.
                                                            setManifestUrlInvalid(false);
                                                            persistPrefs(prefs, { fetchManifest: true });
                                                        }}
                                                        className={`w-full px-3 py-2 border rounded-lg outline-none transition-all text-sm bg-white ${
                                                            manifestUrlInvalid
                                                                ? 'border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                                                : 'border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                                                        }`}
                                                    />
                                                    {manifestUrlInvalid && (
                                                        <p className="text-[11px] text-red-600 mt-1">{t('manifestUrlInvalid')}</p>
                                                    )}
                                                    {teamFetchError && !manifestUrlInvalid && (
                                                        <p className="text-[11px] text-red-600 mt-1">{t('manifestFetchFailed')}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Team dropdown (revealed when URL is non-empty) */}
                                            {prefs.teamCatalogEnabled && prefs.teamManifestUrl && (
                                                <div className="mt-3">
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('selectTeam')}</label>
                                                    <select
                                                        value={prefs.team || ''}
                                                        onChange={(e) => handleTeamChange(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                                    >
                                                        <option value="">{t('noTeam')}</option>
                                                        {teamList.map(team => (
                                                            <option key={team.id} value={team.id}>{team.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Last synced + Refresh (revealed when team is selected) */}
                                            {prefs.teamCatalogEnabled && prefs.teamManifestUrl && prefs.team && (
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="text-xs text-slate-500">
                                                        {teamSynced ? (
                                                            <span>{t('lastSynced')}: {new Date(teamSynced).toLocaleString()}</span>
                                                        ) : (
                                                            <span>{t('neverSynced')}</span>
                                                        )}
                                                        <span className="ml-2 text-slate-400">({teamItems.length} {t('items')})</span>
                                                    </div>
                                                    <button
                                                        onClick={handleTeamRefresh}
                                                        disabled={isSyncingTeam}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                    >
                                                        <RefreshCw size={12} className={isSyncingTeam ? 'animate-spin' : ''} />
                                                        {isSyncingTeam ? t('syncing') : t('refresh')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-slate-200">
                                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <FileText size={14} /> {t('copilotConfig')}
                                            </h2>

                                            {/* 2. Workbench Directory */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('rootPath')}</label>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('rootPathDesc')}
                                                </p>
                                                <input
                                                    type="text"
                                                    value={prefs.rootPath || ""}
                                                    onChange={(e) => setPrefs(prev => ({ ...prev, rootPath: e.target.value }))} onBlur={handlePrefBlur}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono"
                                                placeholder="C:\MyCases"
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="useWorkspaceOnly"
                                                checked={prefs.useWorkspaceOnly !== false}
                                                onChange={(e) => updatePref({ useWorkspaceOnly: e.target.checked })}
                                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                            />
                                            <label htmlFor="useWorkspaceOnly" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                                                {t('useWorkspaceOnly') || "Use repository SKILLS and MCP ONLY"}
                                            </label>
                                        </div>

                                            {/* 3. Skills Directory */}
                                            <div className="mt-4">
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('skillDirectories')}</label>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('skillDirectoriesDesc')}
                                                </p>
                                                <input
                                                    type="text"
                                                    value={prefs.skillDirectories || ""}
                                                    onChange={(e) => setPrefs(prev => ({ ...prev, skillDirectories: e.target.value }))} onBlur={handlePrefBlur}
                                                    disabled={prefs.useWorkspaceOnly !== false}
                                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono ${prefs.useWorkspaceOnly !== false ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                                    placeholder="~/.copilot/skills"
                                                />
                                            </div>

                                            {/* 4. MCP Config Path */}
                                            <div className="mt-4">
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('mcpConfigPath')}</label>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('mcpConfigPathDesc')}
                                                </p>
                                                <input
                                                    type="text"
                                                    value={prefs.mcpConfigPath || ""}
                                                    onChange={(e) => setPrefs(prev => ({ ...prev, mcpConfigPath: e.target.value }))} onBlur={handlePrefBlur}
                                                    disabled={prefs.useWorkspaceOnly !== false}
                                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono ${prefs.useWorkspaceOnly !== false ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                                    placeholder="~/.copilot/mcp-config.json"
                                                />
                                            </div>

                                            {/* 4. User Instructions */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="block text-xs font-semibold text-slate-700">{t('userInstructions')}</label>
                                                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewInstructions(false)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${!previewInstructions ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <Pencil size={10} /> {t('edit')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewInstructions(true)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${previewInstructions ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <Eye size={10} /> {t('preview')}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('userInstructionsDesc')}
                                                </p>
                                                {previewInstructions ? (
                                                    <MarkdownPreview
                                                        content={prefs.userInstructions || ""}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-52 overflow-y-auto bg-white"
                                                    />
                                                ) : (
                                                    <textarea
                                                        value={prefs.userInstructions || ""}
                                                        onChange={(e) => setPrefs(prev => ({ ...prev, userInstructions: e.target.value }))} onBlur={handlePrefBlur}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y"
                                                        placeholder="Enter your custom instructions here..."
                                                    />
                                                )}
                                            </div>

                                            {/* 5. Default User Prompt */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="block text-xs font-semibold text-slate-700">{t('userPrompt')}</label>
                                                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewPrompt(false)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${!previewPrompt ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <Pencil size={10} /> {t('edit')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewPrompt(true)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${previewPrompt ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <Eye size={10} /> {t('preview')}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('userPromptDesc')}
                                                </p>
                                                {previewPrompt ? (
                                                    <MarkdownPreview
                                                        content={prefs.userPrompt || ""}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-52 overflow-y-auto bg-white"
                                                    />
                                                ) : (
                                                    <textarea
                                                        value={prefs.userPrompt || ""}
                                                        onChange={(e) => setPrefs(prev => ({ ...prev, userPrompt: e.target.value }))} onBlur={handlePrefBlur}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y"
                                                        placeholder={t('userPromptPlaceholder')}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Main Content: Bookmarks Editor */}
                        <div className="lg:col-span-7 p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Folder size={14} /> {t('menuEditor')}
                                </h2>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg cursor-pointer border border-slate-200 transition-colors shadow-sm">
                                        <Upload size={12} /> {t('import')}
                                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                    </label>
                                    <button 
                                        onClick={handleExport}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm"
                                    >
                                        <Download size={12} /> {t('export')}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[1200px]">
                                {/* Toolbar */}
                                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 items-center">
                                     <button 
                                        onClick={() => {
                                            // Defence in depth: button is disabled below when
                                            // selection points at a team folder, but check again
                                            // in case state races (e.g. selection set between
                                            // render and click). addItemAt operates on personal
                                            // `items`; writing to a team path silently no-ops
                                            // because indices won't match.
                                            if (isSelectedPathTeam()) return;
                                            const newItem: MenuItem = { type: 'link', label: 'New Item', url: 'https://' };
                                            if (selectedPath) {
                                                setItems(prev => addItemAt(selectedPath, newItem, prev));
                                            } else {
                                                setItems(prev => [...prev, newItem]);
                                            }
                                        }}
                                        disabled={isSelectedPathTeam()}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-md transition-colors shadow-sm",
                                            isSelectedPathTeam()
                                                ? "bg-slate-400 cursor-not-allowed"
                                                : "bg-teal-600 hover:bg-teal-700"
                                        )}
                                        title={isSelectedPathTeam() ? t('teamFolderReadOnly') : undefined}
                                    >
                                        <Plus size={14} strokeWidth={3} /> 
                                        {isSelectedPathTeam()
                                            ? t('teamFolderReadOnly')
                                            : selectedPath ? `${t('addTo')} "${getSelectedFolderName()}"` : t('addRootItem')}
                                    </button>
                                    
                                    {selectedPath && (
                                        <button 
                                            onClick={() => setSelectedPath(null)}
                                            className="text-xs text-slate-500 hover:text-slate-700 px-2"
                                            title="Clear Selection"
                                        >
                                            {t('clearSelection')}
                                        </button>
                                    )}

                                    <div className="h-full w-px bg-slate-200 mx-1"></div>
                                    <button 
                                        onClick={() => collapseAll(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-md transition-colors"
                                        title={t('collapseAll')}
                                    >
                                        <Minimize2 size={14} /> {t('collapseAll')}
                                    </button>
                                    <button 
                                        onClick={() => collapseAll(false)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-md transition-colors"
                                        title={t('expandAll')}
                                    >
                                        <Maximize2 size={14} /> {t('expandAll')}
                                    </button>
                                </div>
                                
                                {/* Scrollable List */}
                                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                                    {items.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <Folder size={32} className="opacity-50" />
                                            </div>
                                            <p className="font-medium">{t('noBookmarks')}</p>
                                            <p className="text-xs mt-1 max-w-[200px] text-center opacity-70">{t('startBuilding')}</p>
                                        </div>
                                    ) : (
                                        <div onClick={() => setSelectedPath(null)} className="min-h-full pb-12">
                                            {renderList(mergedItems)}
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
        </PrefsLanguageProvider>
    );
};

export default Options;


