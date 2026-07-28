import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    mergeMenus,
    MenuItem,
    teamCacheIsCurrent,
    type BookmarkLoadIssue,
} from './MenuLogic';
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
    Pencil,
    Sparkles,
    Info,
    BookOpen,
    Github,
    Bug,
    Copy,
    Shield
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation, LanguageCode, PrefsLanguageProvider } from '../utils/i18n';
import { Preferences, DEFAULT_PREFS, usePrefs } from '../utils/prefs';
import MarkdownPreview from './MarkdownPreview';
import { trackEvent } from '../utils/telemetry';
import { getExtensionVersion } from '../utils/version';
import { localizePromptSourceError } from '../utils/promptSourceErrors';
import { safeErrorText } from '../utils/safeErrorText';
import { ownDataProperty } from '../utils/ownData';
import {
    collapseBookmarkFolders,
    loadBookmarkItems,
    parseBookmarkDocument,
    parseOwnBookmarkItems,
    readDefaultItems,
    writeStoredItems,
} from '../utils/bookmarkItems';
export { collapseBookmarkFolders } from '../utils/bookmarkItems';
import {
    acknowledgePromptRevision,
    acknowledgeInstructionRevision,
    classifyConfigUpdateResponse,
    createConfigUpdateIntent,
    shouldIncludeUserPrompt,
    shouldIncludeUserInstructions,
    type ConfigUpdateIntent,
    type ConfigUpdateIssue,
    type InstructionUpdateToken,
    type PromptUpdateToken,
} from '../utils/configUpdateResult';

type PromptSourceIssue = {
    errorCode?: string;
    fallback: string;
};

type TeamMirrorIdentity = Readonly<{
    enabled: boolean;
    manifestUrl: string;
    teamId: string;
}>;

type ResetPhase =
    | 'host-pending'
    | 'host-committed'
    | 'sw-pending'
    | 'local-cleanup-pending'
    | 'complete';

type ResetRetryAction = 'sw' | 'local-cleanup' | 'team-cleanup' | null;

type ResetTransaction = Readonly<{
    token: number;
    identity: TeamMirrorIdentity;
    requestGeneration: number;
    bookmarkGeneration: number;
    phase: ResetPhase;
    retryAction: ResetRetryAction;
}>;

type ResetCleanupAttempt = Readonly<{
    id: number;
    token: number;
}>;

type BookmarkWriteIntent = Readonly<{
    id: number;
    ownerGeneration: number;
    items: MenuItem[];
}>;

type PrefsMirrorAction = Readonly<{
    id: number;
    kind: 'team-sync' | 'team-clear' | 'manifest-fetch' | 'reset';
    identity: TeamMirrorIdentity;
    resetToken?: number;
    canRun?: () => boolean;
    run: () => void;
}>;

type PrefsMirrorIntent = {
    generation: number;
    prefs: Readonly<Preferences>;
    actions: readonly PrefsMirrorAction[];
    onLatestCommit?: () => void;
};

type PendingHydrationMirror = PrefsMirrorIntent & {
    userGenerationAtRequest: number;
};

// Helper
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Helpers ---
// Force every folder in the tree to start collapsed. Called from both the
// initial mount load AND the Reset handler so default folders never appear
// in a fully-expanded state. Previously inlined inside the mount useEffect,
// which caused Reset to skip collapsing — see commit log.
export const collapseFolders = (items: MenuItem[]) =>
    collapseBookmarkFolders(items) ?? [];

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
                            <option value="link">{t('typeLink')}</option>
                            <option value="folder">{t('typeFolder')}</option>
                            <option value="markdown">{t('typeMarkdownNote')}</option>
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
                            placeholder={t('markdownContentPlaceholder')}
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
    mutateItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
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
    mutateItems,
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
    const { t } = useTranslation();
    const currentPath = [...path, index];
    const isEditing = editingItemPath && editingItemPath.join('.') === currentPath.join('.');
    const isSelected = selectedPath && selectedPath.join('.') === currentPath.join('.');
    const isTeamItem = item.source === 'team';
    // Team folders ignore item.collapsed (next SW sync would wipe a write anyway)
    // and read from the ephemeral teamCollapsedLabels Set. Personal folders keep
    // using item.collapsed which mutatePersonalItems persists into dh_items
    // immediately (no Save button as of Plan A).
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
                        mutateItems(prev => updateItemAt(currentPath, newItem, prev));
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
                                mutateItems(prev => updateItemAt(currentPath, newItem, prev));
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
                            <span className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400" title={t('teamManagedTooltip')}>
                                <Lock size={12} /> {t('teamManaged')}
                            </span>
                        ) : (
                            <>
                                {item.type === 'folder' && (
                                    <button 
                                        onClick={(e) => {
                                             e.stopPropagation();
                                             const newItem: MenuItem = { type: 'link', label: t('newLinkLabel'), url: 'https://' };
                                             mutateItems(prev => addItemAt(currentPath, newItem, prev));
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title={t('addChild')}
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItemPath(currentPath);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title={t('edit')}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(t('deleteItemConfirm'))) {
                                            mutateItems(prev => deleteItemAt(currentPath, prev));
                                        }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title={t('deleteTooltip')}
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
const OptionsInner: React.FC = () => {
    // State
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
    const hasRootPath = Boolean(prefs.rootPath?.trim());
    const effectiveRepositoryOnly = hasRootPath && prefs.useWorkspaceOnly !== false;
    const [items, setItemsState] = useState<MenuItem[]>([]);
    const itemsRef = useRef<MenuItem[]>([]);
    const bookmarkGenerationRef = useRef(0);
    const bookmarkStorageIntentRef = useRef(0);
    const bookmarkStorageQueueRef = useRef<Promise<void>>(Promise.resolve());
    const latestBookmarkStorageIntentRef = useRef<BookmarkWriteIntent | null>(null);
    const [bookmarkPersistenceIssue, setBookmarkPersistenceIssue] = useState(false);
    const [bookmarkLoadIssue, setBookmarkLoadIssue] = useState<BookmarkLoadIssue>(null);
    const bookmarkPersistenceIssueRef = useRef(false);

    const setBookmarkPersistenceFailed = (failed: boolean) => {
        if (bookmarkPersistenceIssueRef.current === failed) return;
        bookmarkPersistenceIssueRef.current = failed;
        setBookmarkPersistenceIssue(failed);
    };

    const applyItemsSnapshot = (nextItems: MenuItem[]) => {
        itemsRef.current = nextItems;
        setItemsState(nextItems);
    };

    const queueBookmarkStorage = (
        items: MenuItem[],
        ownerGeneration = bookmarkGenerationRef.current,
    ): Promise<'committed' | 'stale'> => {
        const intent: BookmarkWriteIntent = Object.freeze({
            id: ++bookmarkStorageIntentRef.current,
            ownerGeneration,
            items: structuredClone(items),
        });
        latestBookmarkStorageIntentRef.current = intent;
        const run = async (): Promise<'committed' | 'stale'> => {
            if (bookmarkGenerationRef.current !== intent.ownerGeneration) {
                return 'stale';
            }
            return writeStoredItems(
                intent.items,
                () => bookmarkGenerationRef.current === intent.ownerGeneration
                    && latestBookmarkStorageIntentRef.current !== null
                    && latestBookmarkStorageIntentRef.current.id === intent.id,
            );
        };
        const queued = bookmarkStorageQueueRef.current.then(run, run);
        bookmarkStorageQueueRef.current = queued.then(() => undefined, () => undefined);
        return queued.then(
            result => {
                if (latestBookmarkStorageIntentRef.current?.id === intent.id) {
                    latestBookmarkStorageIntentRef.current = null;
                    setBookmarkPersistenceFailed(false);
                }
                return result;
            },
            error => {
                // Keep a rejected current snapshot available for retry. An
                // older failure cannot replace a newer intent or its warning.
                if (latestBookmarkStorageIntentRef.current?.id === intent.id) {
                    setBookmarkPersistenceFailed(true);
                }
                throw error;
            },
        );
    };

    // The only entry point for personal bookmark edits and Reset intent.
    const mutatePersonalItems = (
        update?: React.SetStateAction<MenuItem[]>,
    ): number => {
        const generation = ++bookmarkGenerationRef.current;
        onBookmarkGenerationAdvanced();
        if (update === undefined) return generation;
        const nextItems = typeof update === 'function'
            ? update(itemsRef.current)
            : update;
        applyItemsSnapshot(nextItems);
        void queueBookmarkStorage(nextItems, generation).then(
            result => {
                if (result === 'committed') setBookmarkLoadIssue(null);
            },
            () => undefined,
        );
        return generation;
    };
    type StatusMessage = { message: string; type: 'success' | 'error' } | null;
    const [status, setStatus] = useState<StatusMessage>(null);
    const statusTimerRef = useRef<number | null>(null);
    // Successful and in-flight manifest identities are intentionally separate.
    // A failed/stale/skipped request must not suppress a later blur retry.
    const lastSuccessfulManifestUrlRef = useRef<string>('');
    const manifestFetchTokenRef = useRef(0);
    const manifestFetchInFlightRef = useRef<null | Readonly<{
        token: number;
        manifestUrl: string;
    }>>(null);
    const teamRefreshGenerationRef = useRef(0);
    const teamUiLoadGenerationRef = useRef(0);
    const teamUiRequestedIdentityRef = useRef<TeamMirrorIdentity | null>(null);

    // Hydration guard: prefs state is fully populated only AFTER the host
    // get_config response merges its fields into state (see mount useEffect
    // ~line 612). Before that, prefs holds DEFAULT_PREFS (mostly empty
    // strings for rootPath / teamManifestUrl / team / userPrompt) merged
    // with whatever dh_prefs had on disk (also empty if the extension was
    // just Remove+Load Unpacked, or installed for the first time).
    //
    // Without this guard, if the user clicks a Language dropdown / toggle
    // / etc. inside the ~few-hundred-ms window between mount and the
    // host's get_config response, persistPrefs would send a payload whose
    // empty-by-default fields wipe out the corresponding host config.json
    // values + user_prompt.md content. See investigation in conversation
    // 2026-05-21 for the failure mode (root_path / team_manifest_url /
    // user_prompt.md all observed cleared).
    //
    // Flow:
    //   1. Mount → ref = false → DEFAULT_PREFS in state
    //   2. (optional) chrome.storage dh_prefs loaded → merged into state
    //   3. host get_config response → merged into state → ref = true
    //   4. Any subsequent user-triggered persistPrefs() proceeds normally
    //
    // Failure branches mark the local mirror hydrated so Options remains
    // usable, then schedule any missed Host update through the same catch-up
    // effect as a successful response.
    const prefsHydratedRef = useRef(false);

    const [promptHealthIssue, setPromptHealthIssue] = useState<PromptSourceIssue | null>(null);
    const [configUpdateIssue, setConfigUpdateIssue] = useState<ConfigUpdateIssue | null>(null);
    const [prefsMirrorIssue, setPrefsMirrorIssue] = useState<ConfigUpdateIssue | null>(null);
    const [resetIncomplete, setResetIncomplete] = useState(false);
    const userInstructionsEditTokenRef = useRef<InstructionUpdateToken>({
        revision: 0,
        value: DEFAULT_PREFS.userInstructions ?? '',
    });
    const userInstructionsAckRevisionRef = useRef(0);
    const userPromptEditTokenRef = useRef<PromptUpdateToken>({
        revision: 0,
        value: DEFAULT_PREFS.userPrompt ?? '',
    });
    const userPromptAckRevisionRef = useRef(0);
    const configUpdateRequestRevisionRef = useRef(0);
    const promptHealthRequestRevisionRef = useRef(0);
    const prefsMirrorGenerationRef = useRef(0);
    const prefsMirrorActionIdRef = useRef(0);
    const prefsMirrorWriteInFlightRef = useRef(false);
    const queuedPrefsMirrorIntentRef = useRef<PrefsMirrorIntent | null>(null);
    const settledPrefsMirrorActionsRef = useRef<Set<number>>(new Set());
    const latestPrefsMirrorIntentRef = useRef<PrefsMirrorIntent | null>(null);
    const resetTokenRef = useRef(0);
    const resetTransactionRef = useRef<ResetTransaction | null>(null);
    const resetCleanupAttemptIdRef = useRef(0);
    const resetCleanupAttemptRef = useRef<ResetCleanupAttempt | null>(null);
    const prefsRef = useRef<Preferences>(DEFAULT_PREFS);
    const userTouchedRevisionRef = useRef(0);
    const [catchUpRevision, setCatchUpRevision] = useState(0);
    const catchUpRequestedRevisionRef = useRef(0);
    const catchUpProcessedRevisionRef = useRef(0);
    const [hydrationMirrorEpoch, setHydrationMirrorEpoch] = useState(0);
    const hydrationMirrorRequestedEpochRef = useRef(0);
    const pendingHydrationMirrorRef = useRef<PendingHydrationMirror | null>(null);

    // Hydration-window edit protection. Tracks which dh_prefs keys the user
    // has edited during this Options session. Used by:
    //   1. The host get_config merge — fields in this set are NOT overwritten
    //      by host config values (user's in-flight edit wins). Without this,
    //      a user click in the ~few-second window between mount and
    //      hydration COMPLETE would be silently reverted when the host
    //      response arrives.
    //   2. The post-hydration catch-up RPC — non-empty set means the user
    //      edited something while persistPrefs's host RPC was guard-skipped.
    //      Catch-up pushes the merged state to host so config.json matches
    //      the user's clicks.
    //
    // Set (not Map): we only need 'did the user touch this field', not the
    // original value. The user's current value is in prefs state, which is
    // what catch-up sends.
    //
    // Lifetime: lives for the Options page session. Cleared only by
    // handleReset (which marks ALL keys touched so reset survives hydration
    // merge — DEFAULT_PREFS is the user's explicit choice). NOT cleared on
    // hydration COMPLETE: post-hydration edits don't need merge protection
    // (no more merges) but keeping them in the set is harmless.
    //
    // See docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md
    const userTouchedFieldsRef = useRef<Set<keyof Preferences>>(new Set());

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
    useEffect(() => () => {
        if (statusTimerRef.current !== null) {
            clearTimeout(statusTimerRef.current);
        }
    }, []);
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
    const [teamFetchError, setTeamFetchError] = useState<null | {
        kind: 'auth' | 'notFound' | 'http' | 'network' | 'parse' | 'storage' | 'unknown';
        httpStatus?: number;
    }>(null);
    // Plan A onBlur validation feedback for the manifest URL field. True
    // when the user typed something that doesn't parse as a URL — we
    // refuse to persist garbage but want to tell them why nothing
    // happened. Cleared on next onChange (any keystroke = user is fixing
    // it) and on successful blur paths (empty / valid).
    const [manifestUrlInvalid, setManifestUrlInvalid] = useState<boolean>(false);
    // Model & Performance (spec 2026-07-03-configurable-model-performance).
    // Dynamically fetched model list from the host's list_models RPC, cached
    // in chrome.storage.local. modelList holds the last-known-good models;
    // modelFetchError surfaces a classified fetch failure (never silent) while
    // keeping modelList intact for graceful degradation. modelFetching drives
    // the Refresh button spinner.
    interface ModelInfo {
        id: string;
        name: string;
        supported_reasoning_efforts?: string[];
        default_reasoning_effort?: string | null;
    }
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [modelFetching, setModelFetching] = useState<boolean>(false);
    const [modelFetchError, setModelFetchError] = useState<null | {
        kind: 'auth' | 'unavailable' | 'unknown';
    }>(null);
    // Sidebar-nav layout (spec 2026-07-03-options-sidebar-nav-layout). The
    // Options page is a left nav + wide content pane; only the active section
    // renders. This is a pure shell change — every field's JSX/state/persist
    // wiring is unchanged, just re-parented under a section gate.
    type SectionId = 'general' | 'appearance' | 'copilot' | 'model' | 'team' | 'bookmarks' | 'about';
    const [activeSection, setActiveSection] = useState<SectionId>('general');
    // Ephemeral per-Options-session collapse state for team folders. Personal
    // folder collapse persists via item.collapsed field on dh_items. Team
    // folder collapse cannot be written to dh_team_items because the next SW
    // sync overwrites it; instead we track collapsed team folders here.
    // Keys are namespaced by team id: `${teamId}\0${...labelPath}`.
    // Switching teams keeps Set state but each team's keys are isolated by
    // their distinct teamId prefix.
    const [teamCollapsedLabels, setTeamCollapsedLabels] = useState<Set<string>>(new Set());
    // Guards the initial empty-Set mount from
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

    useEffect(() => {
        prefsRef.current = prefs;
    }, [prefs]);

    const setCurrentPrefs = (nextPrefs: Preferences) => {
        prefsRef.current = nextPrefs;
        setPrefs(nextPrefs);
    };

    const updateCurrentPrefs = (patch: Partial<Preferences>) => {
        const nextPrefs = { ...prefsRef.current, ...patch };
        setCurrentPrefs(nextPrefs);
        return nextPrefs;
    };

    const teamUiIdentity = (candidate: Readonly<Preferences>) => ({
        enabled: candidate.teamCatalogEnabled === true,
        manifestUrl: candidate.teamManifestUrl || '',
        teamId: candidate.team || '',
    });

    const teamUiIdentityIsCurrent = (
        identity: ReturnType<typeof teamUiIdentity>,
    ) => {
        const current = teamUiIdentity(prefsRef.current);
        return current.enabled === identity.enabled
            && current.manifestUrl === identity.manifestUrl
            && current.teamId === identity.teamId;
    };

    const loadTeamUiSnapshot = (candidate: Readonly<Preferences>) => {
        const identity = teamUiIdentity(candidate);
        const generation = ++teamUiLoadGenerationRef.current;
        const previousIdentity = teamUiRequestedIdentityRef.current;
        const identityChanged = !previousIdentity
            || previousIdentity.enabled !== identity.enabled
            || previousIdentity.manifestUrl !== identity.manifestUrl
            || previousIdentity.teamId !== identity.teamId;
        teamUiRequestedIdentityRef.current = identity;
        if (identityChanged) {
            setTeamItems([]);
            setTeamSynced('');
        }
        setTeamFetchError(null);
        if (!identity.enabled || !identity.manifestUrl) {
            setTeamList([]);
            setTeamItems([]);
            setTeamSynced('');
            return;
        }
        chrome.storage.local.get([
            'dh_team_synced',
            'dh_team_items',
            'dh_team_manifest',
            'dh_team_manifest_url',
            'dh_team',
        ], data => {
            if (
                generation !== teamUiLoadGenerationRef.current
                || !teamUiIdentityIsCurrent(identity)
            ) return;
            const parsedTeamItems = parseOwnBookmarkItems(
                data,
                'dh_team_items',
            );
            const manifest = data.dh_team_manifest as {
                teams?: Array<{ id: string; label: string }>;
            } | undefined;
            const manifestCurrent =
                data.dh_team_manifest_url === identity.manifestUrl;
            setTeamList(
                manifestCurrent && manifest && Array.isArray(manifest.teams)
                    ? manifest.teams.map(team => ({
                        id: team.id,
                        label: team.label,
                    }))
                    : [],
            );
            const current = {
                dh_team_manifest_url:
                    typeof data.dh_team_manifest_url === 'string'
                        ? data.dh_team_manifest_url
                        : undefined,
                dh_team: typeof data.dh_team === 'string'
                    ? data.dh_team
                    : undefined,
                dh_prefs: {
                    teamCatalogEnabled: identity.enabled,
                    teamManifestUrl: identity.manifestUrl,
                    team: identity.teamId,
                },
            };
            if (teamCacheIsCurrent(current)) {
                if (!parsedTeamItems) return;
                setTeamItems(parsedTeamItems);
                setTeamSynced(
                    typeof data.dh_team_synced === 'string'
                        ? data.dh_team_synced
                        : '',
                );
            } else {
                setTeamItems([]);
                setTeamSynced('');
            }
        });
    };

    const markUserTouched = (keys: Array<keyof Preferences>) => {
        keys.forEach(key => userTouchedFieldsRef.current.add(key));
        userTouchedRevisionRef.current += 1;
    };

    const buildHostConfigPayload = (
        nextPrefs: Readonly<Preferences>,
        instruction?: { value: string },
        prompt?: { value: string },
        resetToken?: number,
    ) => {
        const payload: Record<string, unknown> = {
            config: {
                root_path: nextPrefs.rootPath,
                skill_directories: nextPrefs.skillDirectories
                    ? nextPrefs.skillDirectories
                        .split(',')
                        .map(value => value.trim())
                        .filter(Boolean)
                    : [],
                mcp_config_path: nextPrefs.mcpConfigPath,
                extension_preferences: {
                    auto_analyze_mode: nextPrefs.autoAnalyzeMode,
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
                    analyze_timeout_seconds: nextPrefs.analyzeTimeoutSeconds,
                    model: nextPrefs.model,
                    reasoning_effort: nextPrefs.reasoningEffort,
                    context_tier: nextPrefs.contextTier,
                },
            },
        };
        if (instruction) {
            payload.user_instructions = instruction.value;
        }
        if (prompt) {
            payload.user_prompt = prompt.value;
        }
        if (resetToken !== undefined) {
            payload.reset_token = resetToken;
        }
        return { action: 'update_config', payload };
    };

    const refreshPromptHealth = (configGeneration: number) => {
        const healthGeneration = ++promptHealthRequestRevisionRef.current;
        chrome.runtime.sendMessage({
            type: 'NATIVE_MSG',
            payload: { action: 'get_config' },
        }, (response) => {
            if (chrome.runtime.lastError) return;
            if (
                healthGeneration !== promptHealthRequestRevisionRef.current
                || configGeneration !== configUpdateRequestRevisionRef.current
            ) {
                return;
            }
            if (response?.status !== 'success' || !response.data) return;

            const promptSourceStatus = response.data.prompt_source_status;
            if (promptSourceStatus?.status === 'ok') {
                setPromptHealthIssue(null);
            } else if (promptSourceStatus?.status === 'error') {
                setPromptHealthIssue({
                    errorCode: typeof promptSourceStatus.error_code === 'string'
                        ? promptSourceStatus.error_code
                        : undefined,
                    fallback: safeErrorText([
                        promptSourceStatus.error,
                        promptSourceStatus.message,
                    ], ''),
                });
            }
        });
    };

    const sendHostConfigUpdate = (
        intent: ConfigUpdateIntent<Preferences>,
        options: {
            suppressTransportWarning?: boolean;
            resetToken?: number;
            onResult?: (
                decision: ReturnType<typeof classifyConfigUpdateResponse>,
            ) => void;
        } = {},
    ) => {
        const instruction = intent.instruction;
        const prompt = intent.prompt;

        chrome.runtime.sendMessage({
            type: 'NATIVE_MSG',
            payload: buildHostConfigPayload(
                intent.prefs,
                instruction,
                prompt,
                options.resetToken,
            ),
        }, (response) => {
            const transportError = chrome.runtime.lastError;
            if (transportError) {
                const decision = {
                    acknowledged: false,
                    issue: {
                        fallback: safeErrorText([transportError.message], ''),
                        configSaved: false,
                    },
                };
                if (
                    !options.suppressTransportWarning
                    && intent.generation === configUpdateRequestRevisionRef.current
                ) {
                    setConfigUpdateIssue(decision.issue);
                }
                options.onResult?.(decision);
                return;
            }

            const decision = classifyConfigUpdateResponse(response);
            if (instruction) {
                userInstructionsAckRevisionRef.current = acknowledgeInstructionRevision(
                    userInstructionsAckRevisionRef.current,
                    instruction.revision,
                    decision.acknowledged,
                );
            }
            if (prompt) {
                userPromptAckRevisionRef.current = acknowledgePromptRevision(
                    userPromptAckRevisionRef.current,
                    prompt.revision,
                    decision.acknowledged,
                );
            }
            if (intent.generation === configUpdateRequestRevisionRef.current) {
                setConfigUpdateIssue(decision.issue);
                if (decision.acknowledged) {
                    refreshPromptHealth(intent.generation);
                }
            }
            options.onResult?.(decision);
        });
    };

    const createIntent = (nextPrefs: Preferences) => {
        const generation = ++configUpdateRequestRevisionRef.current;
        const instructionToken = userInstructionsEditTokenRef.current;
        const instruction = shouldIncludeUserInstructions(
            instructionToken.revision,
            userInstructionsAckRevisionRef.current,
        )
            ? instructionToken
            : undefined;
        const promptToken = userPromptEditTokenRef.current;
        const prompt = shouldIncludeUserPrompt(
            promptToken.revision,
            userPromptAckRevisionRef.current,
        )
            ? promptToken
            : undefined;
        return createConfigUpdateIntent(
            generation,
            nextPrefs,
            instruction,
            prompt,
        );
    };

    const requestHydrationCatchUp = () => {
        const touchedRevision = userTouchedRevisionRef.current;
        if (
            touchedRevision === 0
            || touchedRevision <= catchUpRequestedRevisionRef.current
        ) {
            return;
        }
        catchUpRequestedRevisionRef.current = touchedRevision;
        setCatchUpRevision(touchedRevision);
    };

    const createPrefsMirrorIntent = (
        nextPrefs: Readonly<Preferences>,
        newActions: readonly PrefsMirrorAction[] = [],
        onLatestCommit?: () => void,
    ): PrefsMirrorIntent => {
        const previousIntents = [
            latestPrefsMirrorIntentRef.current,
            queuedPrefsMirrorIntentRef.current,
        ].filter(
            (intent): intent is PrefsMirrorIntent => intent !== null,
        );
        const actionMap = new Map<number, PrefsMirrorAction>();
        for (const action of [
            ...previousIntents.flatMap(intent => intent.actions),
            ...newActions,
        ]) {
            if (settledPrefsMirrorActionsRef.current.has(action.id)) continue;
            if (!mirrorActionMatchesPrefs(action, nextPrefs)) {
                settledPrefsMirrorActionsRef.current.add(action.id);
                continue;
            }
            actionMap.set(action.id, action);
        }
        const intent = Object.freeze({
            generation: ++prefsMirrorGenerationRef.current,
            prefs: Object.freeze({ ...nextPrefs }),
            actions: Object.freeze([...actionMap.values()]),
            onLatestCommit,
        });
        latestPrefsMirrorIntentRef.current = intent;
        return intent;
    };

    const createPrefsMirrorAction = (
        kind: PrefsMirrorAction['kind'],
        identity: TeamMirrorIdentity,
        run: () => void,
        canRun?: () => boolean,
        reset?: Readonly<{
            token: number;
        }>,
    ): PrefsMirrorAction => Object.freeze({
        id: ++prefsMirrorActionIdRef.current,
        kind,
        identity: Object.freeze({ ...identity }),
        resetToken: reset?.token,
        canRun,
        run,
    });

    const mirrorIdentityMatchesPrefs = (
        identity: TeamMirrorIdentity,
        candidate: Readonly<Preferences>,
    ) => identity.enabled === (candidate.teamCatalogEnabled === true)
        && identity.manifestUrl === (candidate.teamManifestUrl || '')
        && identity.teamId === (candidate.team || '');

    const mirrorActionMatchesPrefs = (
        action: PrefsMirrorAction,
        candidate: Readonly<Preferences>,
    ) => mirrorIdentityMatchesPrefs(action.identity, candidate)
        && (
            action.kind !== 'reset'
            || action.resetToken === resetTokenRef.current
        );

    const settlePrefsMirrorActions = (intent: PrefsMirrorIntent) => {
        for (const action of intent.actions) {
            if (settledPrefsMirrorActionsRef.current.has(action.id)) continue;
            if (action.kind === 'reset') continue;
            if (action.canRun && !action.canRun()) continue;
            settledPrefsMirrorActionsRef.current.add(action.id);
            if (mirrorActionMatchesPrefs(action, intent.prefs)) {
                action.run();
            }
        }
    };

    const sendCommittedHostConfigUpdate = (
        configIntent: ConfigUpdateIntent<Preferences>,
        mirrorIntent: PrefsMirrorIntent,
        options: { suppressTransportWarning?: boolean } = {},
    ) => {
        const resetAction = mirrorIntent.actions.find(action =>
            action.kind === 'reset'
            && !settledPrefsMirrorActionsRef.current.has(action.id)
            && mirrorActionMatchesPrefs(action, mirrorIntent.prefs),
        );
        if (resetAction) {
            // The mirror action owns only the first Host dispatch. Retry state
            // lives in resetTransactionRef and can never re-enter this queue.
            settledPrefsMirrorActionsRef.current.add(resetAction.id);
        }
        sendHostConfigUpdate(configIntent, {
            ...options,
            resetToken: resetAction?.resetToken,
            onResult: decision => {
                if (
                    !resetAction
                    || resetAction.resetToken !== resetTokenRef.current
                ) return;
                const transaction = resetTransactionRef.current;
                if (
                    !transaction
                    || transaction.token !== resetAction.resetToken
                    || transaction.phase !== 'host-pending'
                ) return;
                if (!decision.acknowledged) {
                    setResetIncomplete(true);
                    return;
                }
                const committed = updateResetTransaction(transaction.token, {
                    phase: 'host-committed',
                    retryAction: 'sw',
                });
                if (committed) {
                    const attempt = beginResetCleanupAttempt(committed.token);
                    if (attempt) dispatchResetServiceWorker(committed, attempt);
                }
            },
        });
    };

    const drainPrefsMirrorQueue = () => {
        if (prefsMirrorWriteInFlightRef.current) return;
        const intent = queuedPrefsMirrorIntentRef.current;
        if (!intent) return;

        queuedPrefsMirrorIntentRef.current = null;
        prefsMirrorWriteInFlightRef.current = true;
        chrome.storage.local.set({ dh_prefs: intent.prefs }, () => {
            const storageError = chrome.runtime.lastError;
            prefsMirrorWriteInFlightRef.current = false;
            const newerIntent = queuedPrefsMirrorIntentRef.current;

            if (storageError) {
                setPrefsMirrorIssue({
                    configSaved: false,
                    fallback: safeErrorText([storageError.message], ''),
                });
                if (!newerIntent) {
                    // Keep the exact failed intent, including unsettled actions,
                    // until a later user write retries or supersedes it.
                    queuedPrefsMirrorIntentRef.current = intent;
                    return;
                }
                drainPrefsMirrorQueue();
                return;
            }

            if (newerIntent) {
                drainPrefsMirrorQueue();
                return;
            }
            if (latestPrefsMirrorIntentRef.current?.generation !== intent.generation) {
                const latestIntent = latestPrefsMirrorIntentRef.current;
                if (latestIntent) {
                    queuedPrefsMirrorIntentRef.current = latestIntent;
                    drainPrefsMirrorQueue();
                }
                return;
            }

            setPrefsMirrorIssue(null);
            settlePrefsMirrorActions(intent);
            intent.onLatestCommit?.();
        });
    };

    const writePrefsMirror = (intent: PrefsMirrorIntent) => {
        queuedPrefsMirrorIntentRef.current = intent;
        drainPrefsMirrorQueue();
    };

    const createManifestFetchAction = (
        nextPrefs: Readonly<Preferences>,
    ): PrefsMirrorAction | undefined => {
        if (!nextPrefs.teamCatalogEnabled || !nextPrefs.teamManifestUrl) {
            return undefined;
        }
        const identity = {
            enabled: true,
            manifestUrl: nextPrefs.teamManifestUrl,
            teamId: nextPrefs.team || '',
        };
        return createPrefsMirrorAction(
            'manifest-fetch',
            identity,
            () => {
                if (
                    prefsRef.current.teamCatalogEnabled !== true
                    || prefsRef.current.teamManifestUrl !== identity.manifestUrl
                    || (prefsRef.current.team || '') !== identity.teamId
                ) return;
                if (identity.manifestUrl === lastSuccessfulManifestUrlRef.current) return;
                if (
                    manifestFetchInFlightRef.current?.manifestUrl
                    === identity.manifestUrl
                ) return;
                // Every URL-change request uses resetCache, so once a
                // different URL starts the prior successful cache is no longer
                // authoritative even if this new request later fails.
                lastSuccessfulManifestUrlRef.current = '';
                const request = Object.freeze({
                    token: ++manifestFetchTokenRef.current,
                    manifestUrl: identity.manifestUrl,
                });
                manifestFetchInFlightRef.current = request;
                const generation = ++teamRefreshGenerationRef.current;
                chrome.runtime.sendMessage(
                    {
                        type: "SYNC_TEAM_CATALOG",
                        payload: teamRequestPayload(
                            generation,
                            identity,
                            { manifestOnly: true, resetCache: true },
                        ),
                    },
                    (response) => {
                        const ownsInFlight =
                            manifestFetchInFlightRef.current?.token === request.token
                            && manifestFetchInFlightRef.current?.manifestUrl
                                === request.manifestUrl;
                        if (ownsInFlight) {
                            manifestFetchInFlightRef.current = null;
                        }
                        // An older callback cannot clear or complete a newer
                        // URL request, even if its own Host response succeeded.
                        if (!ownsInFlight) return;
                        if (!teamSyncIsCurrent(
                            generation,
                            identity.manifestUrl,
                            identity.teamId,
                        )) return;
                        if (chrome.runtime.lastError) {
                            showError(t('manifestFetchFailed'), 5000);
                            setTeamFetchError({ kind: 'network' });
                            return;
                        }
                        const responseIdentity = response?.data?.identity;
                        const responseMatches =
                            response?.data?.requestGeneration === generation
                            && responseIdentity?.enabled === identity.enabled
                            && responseIdentity?.manifestUrl === identity.manifestUrl
                            && (responseIdentity?.teamId || '') === identity.teamId;
                        const hasResponseIdentity =
                            response?.data?.requestGeneration !== undefined
                            || responseIdentity !== undefined;
                        if (hasResponseIdentity && !responseMatches) return;
                        if (!response || response.status !== "success") {
                            const kind = (response?.errorKind as any) || 'unknown';
                            const httpStatus = response?.httpStatus as number | undefined;
                            setTeamFetchError({ kind, httpStatus });
                            if (kind === 'auth') {
                                showError(t('manifestFetchAuthToast'), 6000);
                            }
                        } else if (!responseMatches) {
                            return;
                        } else if (
                            response?.data?.syncStatus === 'committed'
                            || response?.data?.syncStatus === 'unchanged'
                        ) {
                            lastSuccessfulManifestUrlRef.current = identity.manifestUrl;
                            setTeamFetchError(null);
                        }
                    },
                );
            },
            () => prefsHydratedRef.current,
        );
    };

    const requestHydrationMirror = (nextPrefs: Readonly<Preferences>) => {
        const epoch = ++hydrationMirrorRequestedEpochRef.current;
        pendingHydrationMirrorRef.current = Object.freeze({
            generation: epoch,
            prefs: Object.freeze({ ...nextPrefs }),
            actions: Object.freeze([]),
            userGenerationAtRequest: configUpdateRequestRevisionRef.current,
        });
        setHydrationMirrorEpoch(epoch);
    };

    useEffect(() => {
        const request = pendingHydrationMirrorRef.current;
        if (
            !request
            || hydrationMirrorEpoch === 0
            || request.generation !== hydrationMirrorEpoch
            || request.generation !== hydrationMirrorRequestedEpochRef.current
            || request.userGenerationAtRequest !== configUpdateRequestRevisionRef.current
        ) {
            return;
        }
        const intent = createPrefsMirrorIntent(request.prefs);
        writePrefsMirror(intent);
    }, [hydrationMirrorEpoch]);

    useEffect(() => {
        if (
            catchUpRevision === 0
            || catchUpRevision !== catchUpRequestedRevisionRef.current
            || catchUpProcessedRevisionRef.current >= catchUpRevision
        ) {
            return;
        }
        catchUpProcessedRevisionRef.current = catchUpRevision;
        console.log('[DH] Hydration catch-up: pushing', userTouchedFieldsRef.current.size, 'user-touched field(s) to host');
        const configIntent = createIntent(prefsRef.current);
        const mirrorIntent = createPrefsMirrorIntent(
            configIntent.prefs,
            [],
            () => {
                if (configIntent.generation !== configUpdateRequestRevisionRef.current) {
                    return;
                }
                sendCommittedHostConfigUpdate(configIntent, mirrorIntent, {
                    suppressTransportWarning: true,
                });
            },
        );
        writePrefsMirror(mirrorIntent);
    }, [catchUpRevision]);

    // Initial Load
    useEffect(() => {
        const initialPromptHealthGeneration =
            ++promptHealthRequestRevisionRef.current;
        // Load Prefs
        chrome.storage.local.get("dh_prefs", (result) => {
            if (result.dh_prefs) {
                // Auto-migrate old default blue to new teal if user hasn't changed it
                const loadedPrefs = {
                    ...(result.dh_prefs as Preferences),
                };
                if (loadedPrefs.primaryColor === "#2563eb") { // Old default blue
                    loadedPrefs.primaryColor = "#0D9488"; // New default teal
                }
                const current = prefsRef.current;
                const final = { ...DEFAULT_PREFS, ...loadedPrefs };
                userTouchedFieldsRef.current.forEach(key => {
                    (final as any)[key] = current[key];
                });

                setCurrentPrefs(final);
            }

            // Sync with Native Host (Source of Truth for backend config)
            chrome.runtime.sendMessage({ 
                type: "NATIVE_MSG",
                payload: { action: "get_config" } 
            }, (response) => {
                if (chrome.runtime.lastError) {
                     console.warn("Could not sync with host:", chrome.runtime.lastError.message);
                     // Host unreachable — fall back to "hydrated" so the
                     // user can still operate Options. Local dh_prefs (if
                     // any) is the only data we have; future persistPrefs
                     // calls will write that. If the host comes back later,
                     // its config.json will be re-merged on next Options
                     // open. Without this fallback the guard would deadlock
                     // the user when host crashes / starts up slowly.
                     prefsHydratedRef.current = true;

                     // Catch-up attempt for user edits made during the window.
                     // Host is unreachable so this RPC will almost certainly
                     // also fail, but it's a no-op cost and recovers when
                     // host comes back within the same Options session.
                     requestHydrationMirror(prefsRef.current);
                     requestHydrationCatchUp();
                     return;
                }
                
                if (response && response.status === "success" && response.data) {
                    const hostConfig = response.data;
                    const promptSourceStatus = hostConfig.prompt_source_status;
                    console.log("[Options] Synced config from Host:", {
                        host_version: hostConfig.host_version,
                        prompt_source_status: promptSourceStatus
                            ? {
                                status: promptSourceStatus.status,
                                error_code: promptSourceStatus.error_code,
                            }
                            : undefined,
                    });

                    if (
                        initialPromptHealthGeneration === promptHealthRequestRevisionRef.current
                        && promptSourceStatus?.status === 'error'
                    ) {
                        setPromptHealthIssue({
                            errorCode: typeof promptSourceStatus.error_code === 'string'
                                ? promptSourceStatus.error_code
                                : undefined,
                            fallback: safeErrorText([
                                promptSourceStatus.error,
                                promptSourceStatus.message,
                            ], ''),
                        });
                    } else if (
                        initialPromptHealthGeneration === promptHealthRequestRevisionRef.current
                        && promptSourceStatus?.status === 'ok'
                    ) {
                        setPromptHealthIssue(null);
                    }

                    if (hostConfig.host_version) {
                        setHostVersion(hostConfig.host_version);
                    }

                    const prev = prefsRef.current;
                    {
                        const newPrefs = { ...prev };
                        let changed = false;
                        const touched = userTouchedFieldsRef.current;
                        const incomingRoot = touched.has('rootPath') || !('root_path' in hostConfig)
                            ? (typeof prev.rootPath === 'string' ? prev.rootPath : '')
                            : (typeof hostConfig.root_path === 'string' ? hostConfig.root_path : '');

                        // 1. Root Path — presence-aware so an explicit empty/null
                        // Host value clears a stale chrome.storage mirror.
                        if ('root_path' in hostConfig && !touched.has('rootPath')) {
                            if (incomingRoot !== prev.rootPath) {
                                newPrefs.rootPath = incomingRoot;
                                changed = true;
                            }
                        }

                        // 2. Skill Directories (Array -> CSV String)
                        if (
                            Array.isArray(hostConfig.skill_directories)
                            && !touched.has('skillDirectories')
                            && !touched.has('rootPath')
                            && !touched.has('useWorkspaceOnly')
                        ) {
                            // Check incoming preference first
                            const incomingWorkspaceOnly = touched.has('useWorkspaceOnly')
                                ? prev.useWorkspaceOnly
                                : (hostConfig.extension_preferences?.use_workspace_only ?? prev.useWorkspaceOnly);
                            const incomingEffectiveRepositoryOnly = Boolean(incomingRoot.trim()) && incomingWorkspaceOnly !== false;

                            // Only sync skillDirectories if Repository ONLY is not effective.
                            if (!incomingEffectiveRepositoryOnly) {
                                const skillsStr = hostConfig.skill_directories.join(", ");
                                if (skillsStr !== prev.skillDirectories) {
                                    newPrefs.skillDirectories = skillsStr;
                                    changed = true;
                                }
                            }
                        }

                        // 3. MCP Config Path
                        if (hostConfig.mcp_config_path && hostConfig.mcp_config_path !== prev.mcpConfigPath && !touched.has('mcpConfigPath')) {
                            newPrefs.mcpConfigPath = hostConfig.mcp_config_path;
                            changed = true;
                        }

                        // 4. User Instructions (Split Prompt)
                        // Modern Hosts omit raw content when the DH-specific file is
                        // unreadable. In that case keep the Chrome mirror rather than
                        // hydrating Core content through the legacy fallback.
                        if (!touched.has('userInstructions')) {
                            if ('_user_instructions_raw' in hostConfig) {
                                if (hostConfig._user_instructions_raw !== prev.userInstructions) {
                                    newPrefs.userInstructions = hostConfig._user_instructions_raw;
                                    changed = true;
                                }
                            } else if (
                                !('prompt_source_status' in hostConfig)
                                && hostConfig.system_message
                                && hostConfig.system_message.content
                            ) {
                                // Legacy fallback
                                if (hostConfig.system_message.content !== prev.userInstructions) {
                                    newPrefs.userInstructions = hostConfig.system_message.content;
                                    changed = true;
                                }
                            }
                        }

                        // 4. Extension Preferences (Synced from Host - Source of Truth)
                        // Per-field touched guard: user's in-flight edit wins.
                        if (hostConfig.extension_preferences) {
                            const extPrefs = hostConfig.extension_preferences;

                            if (extPrefs.auto_analyze_mode && !touched.has('autoAnalyzeMode')) { newPrefs.autoAnalyzeMode = extPrefs.auto_analyze_mode; changed = true; }
                            if (extPrefs.user_prompt !== undefined && !touched.has('userPrompt')) { newPrefs.userPrompt = extPrefs.user_prompt; changed = true; }
                            if (extPrefs.enable_status_bubble !== undefined && !touched.has('enableStatusBubble')) { newPrefs.enableStatusBubble = extPrefs.enable_status_bubble; changed = true; }
                            if (extPrefs.beta_channel_enabled !== undefined && !touched.has('betaChannelEnabled')) { newPrefs.betaChannelEnabled = extPrefs.beta_channel_enabled; changed = true; }
                            if (extPrefs.use_workspace_only !== undefined && !touched.has('useWorkspaceOnly')) { newPrefs.useWorkspaceOnly = extPrefs.use_workspace_only; changed = true; }
                            if (extPrefs.log_level && !touched.has('logLevel')) { newPrefs.logLevel = extPrefs.log_level; changed = true; }

                            // Visual Settings (Now synced)
                            if (extPrefs.language && !touched.has('language')) { newPrefs.language = extPrefs.language; changed = true; }
                            if (extPrefs.primary_color && !touched.has('primaryColor')) { newPrefs.primaryColor = extPrefs.primary_color; changed = true; }
                            if (extPrefs.button_text && !touched.has('buttonText')) { newPrefs.buttonText = extPrefs.button_text; changed = true; }
                            if (extPrefs.offset_bottom !== undefined && !touched.has('offsetBottom')) { newPrefs.offsetBottom = extPrefs.offset_bottom; changed = true; }
                            if (extPrefs.offset_right !== undefined && !touched.has('offsetRight')) { newPrefs.offsetRight = extPrefs.offset_right; changed = true; }

                            // Team Catalog (mirrored as backup; host does not read these)
                            if (extPrefs.team_catalog_enabled !== undefined && !touched.has('teamCatalogEnabled')) { newPrefs.teamCatalogEnabled = extPrefs.team_catalog_enabled; changed = true; }
                            if (extPrefs.team_manifest_url !== undefined && !touched.has('teamManifestUrl')) {
                                newPrefs.teamManifestUrl = extPrefs.team_manifest_url;
                                changed = true;
                            }
                            if (extPrefs.team !== undefined && !touched.has('team')) { newPrefs.team = extPrefs.team; changed = true; }
                            if (extPrefs.team_label !== undefined && !touched.has('teamLabel')) { newPrefs.teamLabel = extPrefs.team_label; changed = true; }
                            if (extPrefs.analyze_timeout_seconds !== undefined && !touched.has('analyzeTimeoutSeconds')) {
                                newPrefs.analyzeTimeoutSeconds = extPrefs.analyze_timeout_seconds;
                                changed = true;
                            }
                            if (extPrefs.model !== undefined && !touched.has('model')) {
                                newPrefs.model = extPrefs.model;
                                changed = true;
                            }
                            if (extPrefs.reasoning_effort !== undefined && !touched.has('reasoningEffort')) {
                                newPrefs.reasoningEffort = extPrefs.reasoning_effort;
                                changed = true;
                            }
                            if (extPrefs.context_tier !== undefined && !touched.has('contextTier')) {
                                newPrefs.contextTier = extPrefs.context_tier;
                                changed = true;
                            }
                        }

                        // Mirror the host-derived prefs back to chrome.storage.local
                        // so other prefs consumers (FAB, the outer Options wrapper's
                        // usePrefs() that feeds PrefsLanguageProvider) see them
                        // without waiting for the next persistPrefs write. This is
                        // what makes Auto-detected language take effect on first
                        // load after Remove + Load Unpacked (when dh_prefs is empty
                        // but host config.json already has language='zh').
                        // Storage-only write (no host update_config) avoids echoing
                        // back the same data we just read.
                        // Mark prefs as hydrated so subsequent user-triggered
                        // persistPrefs calls proceed. See prefsHydratedRef
                        // declaration for the failure mode this guards against.
                        // Set unconditionally on a successful host response —
                        // even if `changed` was false (e.g. host config already
                        // matches dh_prefs), state is now known-good.
                        //
                        // Keep this updater free of Host side effects. Catch-up
                        // is requested below and runs after this state has
                        // committed, so StrictMode replay cannot duplicate it.
                        const merged = changed ? newPrefs : prev;
                        setCurrentPrefs(merged);
                        prefsHydratedRef.current = true;
                        requestHydrationMirror(merged);
                    }
                    requestHydrationCatchUp();
                } else {
                    // Host responded but not with success+data. Same
                    // rationale as the lastError branch above — don't
                    // deadlock the user. Local dh_prefs is what we have.
                    console.warn(
                        "[Options] Host get_config returned non-success; " +
                        "marking prefs hydrated to unblock user actions.",
                        {
                            status: response?.status,
                            error_code: response?.error_code,
                        },
                    );
                    prefsHydratedRef.current = true;

                    // Catch-up still attempted in the non-success branch — if
                    // the user edited during the window, their changes are in
                    // local state but host has not been told. The RPC will
                    // probably also fail (host is broken), but it's a no-op
                    // cost and keeps storage-vs-host eventually consistent
                    // when host recovers within the same Options session.
                    requestHydrationMirror(prefsRef.current);
                    requestHydrationCatchUp();
                }
            });
        });

        // Load Items and ensure collapsed by default. collapseFolders is the
        // module-level helper so handleReset can reuse it.
        const itemsLoadGeneration = bookmarkGenerationRef.current;
        void loadBookmarkItems().then(loaded => {
            const isCurrent = () => bookmarkGenerationRef.current
                === itemsLoadGeneration;
            if (!isCurrent()) return;
            if (loaded.kind !== 'loaded') {
                setBookmarkLoadIssue(loaded.code);
                return;
            }
            const collapsedItems = collapseBookmarkFolders(
                loaded.items,
                isCurrent,
            );
            if (!collapsedItems || !isCurrent()) return;
            setBookmarkLoadIssue(null);
            applyItemsSnapshot(collapsedItems);
            void queueBookmarkStorage(
                collapsedItems,
                itemsLoadGeneration,
            ).catch(() => undefined);
        });

        // Restore team-folder collapse state independently from team cache
        // identity. Team list/items/synced are loaded by the generation-gated
        // identity effect below after local/Host preferences settle.
        chrome.storage.local.get(
            ['dh_team_collapsed_labels'],
            (data: any) => {
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

    useEffect(() => {
        loadTeamUiSnapshot(prefs);
    }, [prefs.teamCatalogEnabled, prefs.teamManifestUrl, prefs.team]);

    // Watch chrome.storage for team-catalog writes from elsewhere — most
    // importantly the Service Worker's manifestOnly fetch (triggered by
    // the URL field onBlur) writing dh_team_manifest. Before this hook,
    // Options.tsx only read teamList during initial mount, so users had
    // to F5 after typing in a new URL to see the dropdown populate. SW
    // startup auto-sync and any future write paths benefit from the
    // same wiring.
    useEffect(() => {
        const onStorageChanged = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName !== 'local') return;
            const hasRelevantChange = changes.dh_team_manifest
                || changes.dh_team_items
                || changes.dh_team_synced
                || changes.dh_team_manifest_url
                || changes.dh_team
                || changes.dh_prefs;
            if (!hasRelevantChange) return;
            loadTeamUiSnapshot(prefsRef.current);
        };
        chrome.storage.onChanged.addListener(onStorageChanged);
        return () => chrome.storage.onChanged.removeListener(onStorageChanged);
    }, []);

    // --- Prefs Handlers ---
    // Generic onChange for text/number inputs and the color picker. Plan A:
    // these are text-ish fields, so onChange only mutates local state.
    // Persistence happens in handlePrefBlur when the field loses focus —
    // prevents storms of chrome.storage.set + host RPC during typing /
    // color-picker drag.
    const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Mark touched on every keystroke (Set is idempotent). The actual
        // persistPrefs happens in handlePrefBlur, but the merge-protection
        // ref must be set NOW: if hydration completes mid-typing, the
        // host's stale value would otherwise clobber what the user is
        // currently editing.
        markUserTouched([name as keyof Preferences]);
        const isNumeric = name.startsWith('offset') || name === 'analyzeTimeoutSeconds';
        updateCurrentPrefs({
            [name]: isNumeric ? Number(value) : value,
        });
    };

    // onBlur sibling of handlePrefChange — commits whatever the user typed
    // by routing through persistPrefs against the latest state snapshot.
    const handlePrefBlur = () => {
        persistPrefs(prefsRef.current);
    };

    // --- Persistence: single entry point for ALL prefs writes ---
    //
    // Plan A: Options runs in "instant persistence" mode. Every onChange
    // (selects/checkboxes) and every onBlur (text inputs) routes through
    // persistPrefs(), which:
    //
    //   1. Writes dh_prefs to chrome.storage.local
    //   2. Sends update_config to the host and inspects the structured result
    //   3. If teamManifestUrl differs from the last successful URL AND
    //      team catalog is enabled, asks the SW to fetch the manifest.
    //      Caller opts into this with { fetchManifest: true } so e.g. a
    //      colour-picker change does not waste an HTTP call.
    //
    // Items (dh_items) are NOT written here. Personal bookmark mutations use
    // mutatePersonalItems and its serialized storage queue above.
    const persistPrefs = (
        nextPrefs: Preferences,
        opts?: {
            fetchManifest?: boolean;
            mirrorAction?: PrefsMirrorAction;
        },
    ) => {
        // Three-segment persist (see spec § 4.1):
        //
        //   Segment 1: storage write — always runs (safe, storage is just a
        //     mirror). Required so the outer Options wrapper's usePrefs()
        //     subscription receives onChanged events and cross-tree consumers
        //     (PrefsLanguageProvider, FAB) see edits immediately, even
        //     during the hydration window.
        //
        //   Segment 2: host RPC — only after hydration. Pre-hydration writes
        //     would send DEFAULT_PREFS-empty values to host and clobber
        //     config.json + user_prompt.md. The post-hydration catch-up RPC
        //     in the mount useEffect picks up window-edits — see § 4.4.
        //
        //   Segment 3: manifest fetch — only after hydration + opts + URL
        //     change. Pre-hydration manifest fetch could race with host
        //     get_config returning a different teamManifestUrl.
        //
        // The pre-hydration warn that used to live here was removed because
        // hitting it during normal cold start is expected, not exceptional.
        // See docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md
        const hostUpdateAllowed = prefsHydratedRef.current;
        const intent = createIntent(nextPrefs);
        const manifestAction = opts?.fetchManifest
            ? createManifestFetchAction(intent.prefs)
            : undefined;
        const mirrorIntent = createPrefsMirrorIntent(
            intent.prefs,
            [opts?.mirrorAction, manifestAction].filter(
                (action): action is PrefsMirrorAction => action != null,
            ),
            () => {
                if (intent.generation !== configUpdateRequestRevisionRef.current) {
                    return;
                }
                if (!hostUpdateAllowed) {
                    // Window edit — touched ref will route it through the
                    // catch-up RPC once hydration completes. Storage is
                    // up-to-date; host will catch up.
                    return;
                }

                sendCommittedHostConfigUpdate(intent, mirrorIntent);
            },
        );
        writePrefsMirror(mirrorIntent);
    };

    // Convenience: setPrefs + persist in one call. All instant-persist
    // sites (selects, checkboxes, toggles) use this. Text-input onBlur
    // handlers also use it after their onChange-only setPrefs.
    const updatePref = (patch: Partial<Preferences>, opts?: { fetchManifest?: boolean }) => {
        // Mark every patched key as user-touched so the host hydration merge
        // (if still pending) does not overwrite our value, and so the
        // catch-up RPC knows to push these fields after hydration.
        markUserTouched(Object.keys(patch) as Array<keyof Preferences>);
        const next = updateCurrentPrefs(patch);
        persistPrefs(next, opts);
    };

    const invalidateTeamRefresh = () => {
        teamRefreshGenerationRef.current += 1;
        manifestFetchInFlightRef.current = null;
        setIsSyncingTeam(false);
    };

    const teamSyncIsCurrent = (
        generation: number,
        manifestUrl: string,
        teamId: string,
    ) => generation === teamRefreshGenerationRef.current
        && prefsRef.current.teamCatalogEnabled === true
        && prefsRef.current.teamManifestUrl === manifestUrl
        && (prefsRef.current.team || '') === (teamId || '');

    const teamRequestPayload = (
        generation: number,
        identity: { enabled: boolean; manifestUrl: string; teamId: string },
        extra: Record<string, unknown> = {},
    ) => ({
        ...extra,
        identity: Object.freeze({ ...identity }),
        requestGeneration: generation,
    });

    const createResetMirrorAction = (
        transaction: ResetTransaction,
    ): PrefsMirrorAction => createPrefsMirrorAction(
        'reset',
        transaction.identity,
        () => undefined,
        undefined,
        { token: transaction.token },
    );

    function updateResetTransaction(
        token: number,
        patch: Partial<Pick<ResetTransaction, 'phase' | 'retryAction'>>,
    ): ResetTransaction | null {
        const current = resetTransactionRef.current;
        if (!current || current.token !== token) return null;
        const next = Object.freeze({ ...current, ...patch });
        resetTransactionRef.current = next;
        return next;
    }

    function beginResetCleanupAttempt(token: number): ResetCleanupAttempt | null {
        const transaction = resetTransactionRef.current;
        if (
            !transaction
            || transaction.token !== token
            || transaction.phase === 'complete'
        ) return null;
        if (resetCleanupAttemptRef.current?.token === token) return null;
        const attempt = Object.freeze({
            id: ++resetCleanupAttemptIdRef.current,
            token,
        });
        resetCleanupAttemptRef.current = attempt;
        return attempt;
    }

    function resetCleanupAttemptIsCurrent(
        attempt: ResetCleanupAttempt,
    ): boolean {
        return resetCleanupAttemptRef.current?.id === attempt.id
            && resetCleanupAttemptRef.current.token === attempt.token
            && resetTransactionRef.current?.token === attempt.token
            && resetTransactionRef.current.phase !== 'complete';
    }

    function finishResetCleanupAttempt(attempt: ResetCleanupAttempt): void {
        if (resetCleanupAttemptRef.current?.id === attempt.id) {
            resetCleanupAttemptRef.current = null;
        }
    }

    function retainResetRetry(
        transaction: ResetTransaction,
        retryAction: Exclude<ResetRetryAction, null>,
    ) {
        const current = resetTransactionRef.current;
        if (
            !current
            || current.token !== transaction.token
            || current.phase === 'complete'
        ) return;

        if (retryAction === 'local-cleanup') {
            const scope = resetBookmarkScope(transaction);
            if (scope === 'not-owner') return;
            if (scope === 'superseded') {
                supersedeResetLocalCleanup(transaction);
                return;
            }
        }

        updateResetTransaction(transaction.token, {
            phase: retryAction === 'sw'
                ? 'sw-pending'
                : 'local-cleanup-pending',
            retryAction,
        });
        setResetIncomplete(true);
    }

    type ResetBookmarkScope = 'current' | 'superseded' | 'not-owner';

    function resetBookmarkScope(
        transaction: ResetTransaction,
    ): ResetBookmarkScope {
        const current = resetTransactionRef.current;
        if (!current || current.token !== transaction.token) {
            return 'not-owner';
        }
        return bookmarkGenerationRef.current === transaction.bookmarkGeneration
            ? 'current'
            : 'superseded';
    }

    function supersedeResetLocalCleanup(transaction: ResetTransaction): void {
        const current = resetTransactionRef.current;
        if (
            !current
            || current.token !== transaction.token
            || current.phase !== 'local-cleanup-pending'
            || current.retryAction !== 'local-cleanup'
            || bookmarkGenerationRef.current === current.bookmarkGeneration
        ) return;
        resetTransactionRef.current = null;
        resetCleanupAttemptRef.current = null;
        setResetIncomplete(false);
    }

    function onBookmarkGenerationAdvanced(): void {
        const current = resetTransactionRef.current;
        if (current && current.phase === 'local-cleanup-pending') {
            supersedeResetLocalCleanup(current);
        }
    }

    function resetTeamScopeIsCurrent(transaction: ResetTransaction): boolean {
        return resetTransactionRef.current?.token === transaction.token
            && resetTokenRef.current === transaction.token
            && teamRefreshGenerationRef.current === transaction.requestGeneration
            && mirrorIdentityMatchesPrefs(transaction.identity, prefsRef.current);
    }

    function resetBookmarkScopeIsCurrent(transaction: ResetTransaction): boolean {
        const scope = resetBookmarkScope(transaction);
        if (scope === 'superseded') supersedeResetLocalCleanup(transaction);
        return scope === 'current';
    }

    function resetDefaultsAreCurrent(): boolean {
        return (Object.keys(DEFAULT_PREFS) as Array<keyof Preferences>)
            .every(key => prefsRef.current[key] === DEFAULT_PREFS[key]);
    }

    function completeResetCleanup(
        transaction: ResetTransaction,
        completion: 'full-reset' | 'newer-bookmarks-preserved' = 'full-reset',
    ) {
        if (resetTransactionRef.current?.token !== transaction.token) return;
        updateResetTransaction(transaction.token, {
            phase: 'complete',
            retryAction: null,
        });
        resetCleanupAttemptRef.current = null;
        setResetIncomplete(false);
        showSuccess(
            t(completion === 'newer-bookmarks-preserved'
                ? 'resetCleanupComplete'
                : (resetDefaultsAreCurrent()
                    ? 'resetComplete'
                    : 'resetCleanupComplete')),
            2000,
        );
    }

    function runResetTeamCleanupAfterBookmarkSupersession(
        transaction: ResetTransaction,
        attempt: ResetCleanupAttempt,
    ) {
        if (!resetCleanupAttemptIsCurrent(attempt)) return;
        const pending = updateResetTransaction(transaction.token, {
            phase: 'local-cleanup-pending',
            retryAction: 'team-cleanup',
        });
        if (!pending) {
            finishResetCleanupAttempt(attempt);
            return;
        }
        if (!resetTeamScopeIsCurrent(pending)) {
            finishResetCleanupAttempt(attempt);
            completeResetCleanup(pending, 'newer-bookmarks-preserved');
            return;
        }
        try {
            chrome.storage.local.remove(
                'dh_team_collapsed_labels',
                () => {
                    if (!resetCleanupAttemptIsCurrent(attempt)) return;
                    if (chrome.runtime.lastError) {
                        finishResetCleanupAttempt(attempt);
                        if (resetTeamScopeIsCurrent(pending)) {
                            retainResetRetry(pending, 'team-cleanup');
                        } else {
                            completeResetCleanup(
                                pending,
                                'newer-bookmarks-preserved',
                            );
                        }
                        return;
                    }
                    if (resetTeamScopeIsCurrent(pending)) {
                        setTeamItems([]);
                        setTeamSynced("");
                        setTeamCollapsedLabels(new Set());
                    }
                    finishResetCleanupAttempt(attempt);
                    completeResetCleanup(
                        pending,
                        'newer-bookmarks-preserved',
                    );
                },
            );
        } catch {
            if (!resetCleanupAttemptIsCurrent(attempt)) return;
            finishResetCleanupAttempt(attempt);
            if (resetTeamScopeIsCurrent(pending)) {
                retainResetRetry(pending, 'team-cleanup');
            } else {
                completeResetCleanup(pending, 'newer-bookmarks-preserved');
            }
        }
    }

    function runResetLocalCleanup(
        transaction: ResetTransaction,
        attempt: ResetCleanupAttempt,
    ) {
        if (!resetCleanupAttemptIsCurrent(attempt)) return;
        const pending = updateResetTransaction(transaction.token, {
            phase: 'local-cleanup-pending',
            retryAction: 'local-cleanup',
        });
        if (!pending) return;

        void (async () => {
            try {
                const defaultsResult = await readDefaultItems();
                if (!resetCleanupAttemptIsCurrent(attempt)) return;
                if (defaultsResult.kind === 'failed') {
                    if (resetBookmarkScopeIsCurrent(pending)) {
                        finishResetCleanupAttempt(attempt);
                        retainResetRetry(pending, 'local-cleanup');
                    }
                    return;
                }
                if (!resetBookmarkScopeIsCurrent(pending)) return;
                const defaults = collapseBookmarkFolders(
                    defaultsResult.items,
                    () => resetBookmarkScopeIsCurrent(pending),
                );
                if (!defaults) {
                    if (resetBookmarkScopeIsCurrent(pending)) {
                        finishResetCleanupAttempt(attempt);
                        retainResetRetry(pending, 'local-cleanup');
                    }
                    return;
                }

                if (resetTeamScopeIsCurrent(pending)) {
                    try {
                        await new Promise<void>((resolve, reject) => {
                            try {
                                chrome.storage.local.remove(
                                    'dh_team_collapsed_labels',
                                    () => {
                                        if (chrome.runtime.lastError) {
                                            reject(new Error(
                                                'Reset team collapse cleanup failed',
                                            ));
                                            return;
                                        }
                                        resolve();
                                    },
                                );
                            } catch {
                                reject(new Error(
                                    'Reset team collapse cleanup failed',
                                ));
                            }
                        });
                        if (!resetCleanupAttemptIsCurrent(attempt)) return;
                        if (resetTeamScopeIsCurrent(pending)) {
                            setTeamItems([]);
                            setTeamSynced("");
                            setTeamCollapsedLabels(new Set());
                        }
                    } catch {
                        if (!resetCleanupAttemptIsCurrent(attempt)) return;
                        if (resetBookmarkScopeIsCurrent(pending)) {
                            finishResetCleanupAttempt(attempt);
                            retainResetRetry(pending, 'local-cleanup');
                        }
                        return;
                    }
                }

                const writeResult = await queueBookmarkStorage(
                    defaults,
                    pending.bookmarkGeneration,
                );
                if (!resetCleanupAttemptIsCurrent(attempt)) return;
                if (writeResult !== 'committed') {
                    finishResetCleanupAttempt(attempt);
                    resetBookmarkScopeIsCurrent(pending);
                    return;
                }
                if (!resetBookmarkScopeIsCurrent(pending)) return;
                applyItemsSnapshot(defaults);
                finishResetCleanupAttempt(attempt);
                completeResetCleanup(pending);
            } catch {
                if (!resetCleanupAttemptIsCurrent(attempt)) return;
                if (resetBookmarkScopeIsCurrent(pending)) {
                    finishResetCleanupAttempt(attempt);
                    retainResetRetry(pending, 'local-cleanup');
                }
            }
        })();
    }

    function dispatchResetServiceWorker(
        transaction: ResetTransaction,
        attempt: ResetCleanupAttempt,
    ) {
        if (!resetCleanupAttemptIsCurrent(attempt)) return;
        const pending = updateResetTransaction(transaction.token, {
            phase: 'sw-pending',
            retryAction: 'sw',
        });
        if (!pending) return;
        const userRevisionAtDispatch = userTouchedRevisionRef.current;

        chrome.runtime.sendMessage({
            type: "RESET_EXTENSION_STATE",
            payload: {
                ...teamRequestPayload(
                    pending.requestGeneration,
                    pending.identity,
                ),
                resetToken: pending.token,
            },
        }, (response) => {
            if (!resetCleanupAttemptIsCurrent(attempt)) return;
            const responseIdentity = response?.data?.identity;
            const responseMatches = response?.data?.resetToken === pending.token
                && response?.data?.requestGeneration === pending.requestGeneration
                && responseIdentity?.enabled === pending.identity.enabled
                && responseIdentity?.manifestUrl === pending.identity.manifestUrl
                && (responseIdentity?.teamId || '') === pending.identity.teamId;
            if (
                chrome.runtime.lastError
                || response?.status !== 'success'
                || response?.data?.syncStatus !== 'committed'
                || !responseMatches
            ) {
                finishResetCleanupAttempt(attempt);
                retainResetRetry(pending, 'sw');
                return;
            }

            const localPending = updateResetTransaction(pending.token, {
                phase: 'local-cleanup-pending',
                retryAction: 'local-cleanup',
            });
            if (!localPending) return;
            const bookmarksSuperseded = bookmarkGenerationRef.current
                !== pending.bookmarkGeneration;
            if (
                userTouchedRevisionRef.current !== userRevisionAtDispatch
                && !bookmarksSuperseded
            ) {
                finishResetCleanupAttempt(attempt);
                setResetIncomplete(true);
                return;
            }
            if (bookmarksSuperseded) {
                runResetTeamCleanupAfterBookmarkSupersession(
                    localPending,
                    attempt,
                );
                return;
            }
            runResetLocalCleanup(localPending, attempt);
        });
    }

    const handleResetCleanupRetry = () => {
        const transaction = resetTransactionRef.current;
        if (!transaction) return;
        const attempt = beginResetCleanupAttempt(transaction.token);
        if (!attempt) return;
        clearStatus();
        if (transaction.retryAction === 'sw') {
            dispatchResetServiceWorker(transaction, attempt);
        } else if (transaction.retryAction === 'local-cleanup') {
            runResetLocalCleanup(transaction, attempt);
        } else if (transaction.retryAction === 'team-cleanup') {
            runResetTeamCleanupAfterBookmarkSupersession(transaction, attempt);
        } else {
            finishResetCleanupAttempt(attempt);
        }
    };

    const handleReset = () => {
        if (confirm(t('resetConfirm'))) {
            clearStatus();
            invalidateTeamRefresh();
            userInstructionsEditTokenRef.current = {
                revision: userInstructionsEditTokenRef.current.revision + 1,
                value: DEFAULT_PREFS.userInstructions ?? '',
            };
            userPromptEditTokenRef.current = {
                revision: userPromptEditTokenRef.current.revision + 1,
                value: DEFAULT_PREFS.userPrompt ?? '',
            };
            // Mark ALL prefs keys as user-touched so a late host hydration
            // response cannot un-reset us. DEFAULT_PREFS is the user's
            // explicit choice — protect it from being merged-over. Without
            // this, a reset during the hydration window would be reverted
            // when host get_config returns the pre-reset values.
            markUserTouched(Object.keys(DEFAULT_PREFS) as Array<keyof Preferences>);
            setCurrentPrefs(DEFAULT_PREFS);
            const resetGeneration = teamRefreshGenerationRef.current;
            const resetIdentity = {
                enabled: false,
                manifestUrl: '',
                teamId: '',
            };
            const resetToken = ++resetTokenRef.current;
            resetCleanupAttemptRef.current = null;
            const bookmarkResetGeneration = mutatePersonalItems();
            const transaction = Object.freeze({
                token: resetToken,
                identity: Object.freeze({ ...resetIdentity }),
                requestGeneration: resetGeneration,
                bookmarkGeneration: bookmarkResetGeneration,
                phase: 'host-pending' as const,
                retryAction: null,
            });
            resetTransactionRef.current = transaction;
            setResetIncomplete(false);
            lastSuccessfulManifestUrlRef.current = '';
            persistPrefs(DEFAULT_PREFS, {
                mirrorAction: createResetMirrorAction(transaction),
            });
        }
    };

    // --- Team Catalog Handlers ---
    const handleTeamChange = (teamId: string) => {
        invalidateTeamRefresh();
        const generation = teamRefreshGenerationRef.current;
        const manifestUrl = prefsRef.current.teamManifestUrl || '';
        const selectedTeam = teamList.find(t => t.id === teamId);
        setTeamItems([]);
        setTeamSynced("");
        setTeamFetchError(null);
        // Plan A: team selection is "instant persist". Symptom 3 fix —
        // previously this only called setPrefs (React state), so refreshing
        // the page would show the dropdown reverted to the old team while
        // dh_team_items was already cleared (the SW message below ran
        // immediately). Now updatePref writes dh_prefs to storage AND fires
        // update_config to host in a single shot, keeping state aligned.
        const dispatchTeamSync = () => {
            if (!teamSyncIsCurrent(generation, manifestUrl, teamId)) return;
            setIsSyncingTeam(true);
            chrome.runtime.sendMessage({
                type: "SYNC_TEAM_CATALOG",
                payload: teamRequestPayload(generation, {
                    enabled: true,
                    manifestUrl,
                    teamId,
                }),
            }, (response) => {
                if (!teamSyncIsCurrent(generation, manifestUrl, teamId)) return;
                setIsSyncingTeam(false);
                if (chrome.runtime.lastError) {
                    showError(`${t('teamSyncFailed')}: ${chrome.runtime.lastError.message}`, 3000);
                    return;
                }
                const syncStatus = response?.data?.syncStatus;
                const responseIdentity = response?.data?.identity;
                if (
                    (response?.data?.requestGeneration !== undefined
                        && response.data.requestGeneration !== generation)
                    || (responseIdentity !== undefined && (
                        responseIdentity?.enabled !== true
                        || responseIdentity?.manifestUrl !== manifestUrl
                        || (responseIdentity?.teamId || '') !== (teamId || '')
                    ))
                ) return;
                if (response?.status === "success") {
                    if (syncStatus === 'committed' || syncStatus === 'unchanged') {
                        setTeamItems(response.data.items || []);
                        setTeamSynced(response.data.syncedAt || new Date().toISOString());
                    }
                } else {
                    showError(`${t('teamSyncFailed')}: ${safeErrorText(
                        [response?.error, response?.message],
                        t('unknownError'),
                    )}`, 3000);
                }
            });
        };
        const dispatchTeamClear = () => {
            if (
                generation !== teamRefreshGenerationRef.current
                || prefsRef.current.teamCatalogEnabled !== true
                || prefsRef.current.teamManifestUrl !== manifestUrl
                || (prefsRef.current.team || '') !== ''
            ) return;
            chrome.runtime.sendMessage({
                type: "SYNC_TEAM_CATALOG",
                payload: teamRequestPayload(generation, {
                    enabled: true,
                    manifestUrl,
                    teamId: '',
                }),
            });
        };
        const next = updateCurrentPrefs({
            team: teamId || undefined,
            teamLabel: selectedTeam?.label || undefined,
        });
        markUserTouched(['team', 'teamLabel']);
        persistPrefs(next, {
            mirrorAction: createPrefsMirrorAction(
                teamId ? 'team-sync' : 'team-clear',
                {
                    enabled: true,
                    manifestUrl,
                    teamId,
                },
                teamId ? dispatchTeamSync : dispatchTeamClear,
            ),
        });

        if (!teamId) return;

        // Sync starts only after the matching dh_prefs mirror is committed.
    };

    // Model & Performance: fetch the available Copilot models from the host
    // (list_models RPC), cache in chrome.storage.local for 24h, and surface
    // classified fetch failures (never a silent empty list — spec § 5).
    const MODEL_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const fetchModels = (force: boolean = false) => {
        chrome.storage.local.get(['dh_model_list', 'dh_model_list_fetched_at'], (cache) => {
            const cached: ModelInfo[] | null = Array.isArray(cache.dh_model_list) ? cache.dh_model_list : null;
            const fetchedAt = typeof cache.dh_model_list_fetched_at === 'number' ? cache.dh_model_list_fetched_at : 0;
            const stale = Date.now() - fetchedAt > MODEL_CACHE_MAX_AGE_MS;

            // Populate from cache immediately so the dropdown works offline /
            // before the network call returns (graceful degradation).
            if (cached && cached.length) {
                setModelList(cached);
            }

            // Skip the host RPC unless forced, or the cache is empty / stale.
            if (!force && cached && cached.length && !stale) {
                return;
            }

            setModelFetching(true);
            chrome.runtime.sendMessage(
                { type: "NATIVE_MSG", payload: { action: "list_models" } },
                (response) => {
                    setModelFetching(false);
                    if (chrome.runtime.lastError) {
                        // Host unreachable — keep cached list, surface as unavailable.
                        setModelFetchError({ kind: 'unavailable' });
                        return;
                    }
                    if (!response || response.status !== "success") {
                        const kind = (response?.errorKind as 'auth' | 'unavailable' | 'unknown') || 'unknown';
                        setModelFetchError({ kind }); // keep cached list intact
                        return;
                    }
                    const models = (response.data?.models || []) as ModelInfo[];
                    setModelList(models);
                    setModelFetchError(null);
                    chrome.storage.local.set({
                        dh_model_list: models,
                        dh_model_list_fetched_at: Date.now(),
                    });
                }
            );
        });
    };

    // Fetch the model list once on mount (cache-aware; only hits the host
    // when the cache is empty or > 24h old).
    useEffect(() => {
        fetchModels(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTeamRefresh = async () => {
        const manifestUrl = prefsRef.current.teamManifestUrl;
        const teamId = prefsRef.current.team || '';
        if (!manifestUrl || !teamId) return;
        const generation = ++teamRefreshGenerationRef.current;
        const refreshIsCurrent = () => teamSyncIsCurrent(
            generation,
            manifestUrl,
            teamId,
        );
        setIsSyncingTeam(true);
        setTeamFetchError(null);
        chrome.runtime.sendMessage({
            type: "SYNC_TEAM_CATALOG",
            payload: teamRequestPayload(generation, {
                enabled: true,
                manifestUrl,
                teamId,
            }),
        }, async (response) => {
            if (!refreshIsCurrent()) return;
            if (chrome.runtime.lastError) {
                setTeamFetchError({ kind: 'network' });
                setIsSyncingTeam(false);
                return;
            }
            const syncStatus = response?.data?.syncStatus;
            const responseIdentity = response?.data?.identity;
            if (
                (response?.data?.requestGeneration !== undefined
                    && response.data.requestGeneration !== generation)
                || (responseIdentity !== undefined && (
                    responseIdentity?.enabled !== true
                    || responseIdentity?.manifestUrl !== manifestUrl
                    || (responseIdentity?.teamId || '') !== teamId
                ))
            ) {
                setIsSyncingTeam(false);
                return;
            }
            if (response?.status !== 'success') {
                setTeamItems([]);
                setTeamSynced('');
                // Refresh actually failed. Show the classified error and
                // — crucially — do NOT bump the synced-at timestamp. The
                // pre-fix behaviour of setTeamSynced(now) on a silently-
                // failed refresh was exactly what the SAS-expiry bug
                // report was about.
                setTeamFetchError({
                    kind: response?.errorKind || 'unknown',
                    httpStatus: response?.httpStatus,
                });
                if (response?.errorKind === 'auth') {
                    showError(t('manifestFetchAuthToast'), 6000);
                }
            } else if (syncStatus === 'committed' || syncStatus === 'unchanged') {
                // Refresh the dropdown if the manifest changed during this sync
                const cached = await new Promise<any>((resolve) => {
                    chrome.storage.local.get(['dh_team_manifest'], resolve);
                });
                if (!refreshIsCurrent()) return;
                setTeamItems(response.data.items || []);
                setTeamSynced(response.data.syncedAt || new Date().toISOString());
                if (cached.dh_team_manifest && Array.isArray(cached.dh_team_manifest.teams)) {
                    setTeamList(
                        cached.dh_team_manifest.teams.map((t: any) => ({ id: t.id, label: t.label })),
                    );
                }
            }
            if (refreshIsCurrent()) setIsSyncingTeam(false);
        });
    };

    // Listen for updates
    //
    // `t` is captured in a ref because the runtime-message handler is
    // registered once at mount (deps []) — putting `t` in the dep array
    // would remove+re-add the listener on every language change and can
    // drop messages that arrive during the swap. Same pattern as
    // isAnalyzingRef in FAB.tsx (see AGENTS.md § notes on ref-vs-deps
    // trade-offs). Without this ref, `t()` inside handleRuntimeMsg
    // returns the language that was active AT MOUNT TIME — for a user
    // who set language=zh but whose prefs hydrate from the host after
    // the effect runs, the 'You are up to date!' string stays in English
    // even after the UI otherwise switches to Chinese.
    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    useEffect(() => {
        const handleRuntimeMsg = (message: unknown) => {
            const type = ownDataProperty(message, 'type');
            if (type.kind !== 'value') return;
            if (type.value === "NATIVE_UPDATE_AVAILABLE") {
                const updateMessage = message as {
                    payload: { version: string; url: string };
                };
                const currentVer = getExtensionVersion();
                if (updateMessage.payload.version === currentVer) {
                    setUpdateAvailable(null);
                    chrome.storage.local.remove("pending_update");
                    return;
                }
                console.log("[Options] Received update available:", updateMessage.payload);
                setUpdateAvailable(updateMessage.payload);
                showSuccess(`${updateMessage.payload.version.replace(/^v?/, 'v')} ${tRef.current('availableForUpdate')}`, 5000);
            }
            
            if (type.value === "NATIVE_UPDATE_NOT_AVAILABLE") {
                showSuccess(tRef.current('upToDate'), 3000);
            }

            if (type.value === "NATIVE_UPDATE_ERROR") {
                const payload = ownDataProperty(message, 'payload');
                const candidate = payload.kind === 'value'
                    ? ownDataProperty(payload.value, 'error')
                    : { kind: 'invalid' as const };
                showError(safeErrorText([
                    candidate.kind === 'value' ? candidate.value : undefined,
                ], tRef.current('updateCheckFailed')), 5000);
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
        if (!confirm(t('updateConfirm').replace('{version}', updateAvailable.version))) return;

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
                showError(`${t('updateFailed')}: ${safeErrorText(
                    [response?.error, response?.message],
                    t('unknownError'),
                )}`);
            }
        });
    };

    // About & Help: copy the log folder path (Explorer expands %LOCALAPPDATA%).
    const handleCopyLogPath = () => {
        navigator.clipboard?.writeText('%LOCALAPPDATA%\\DynamicsHelper')
            .then(() => showSuccess(t('copied'), 2000))
            .catch(() => {/* clipboard blocked; no-op */});
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
    // slots so path-based mutation handlers remain correct
    // remain correct without translation.
    // Spec § 3.3 / § 3.5.
    //
    // CRITICAL: read-only handlers (getSelectedFolderName, isSelectedPathTeam)
    // resolve paths against THIS merged list because selectedPath comes from
    // the rendered tree which is also merged. Mutation handlers (addItemAt,
    // updateItemAt, deleteItemAt + mutatePersonalItems) operate on personal
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
        // (items) via mutatePersonalItems. If a drop targets a team item
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
        mutatePersonalItems(finalItems);
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
        mutatePersonalItems(prev => traverse(prev));

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
                const newItems = parseBookmarkDocument(JSON.parse(text));
                if (!newItems) throw new Error('Bookmark schema validation failed');
                mutatePersonalItems(newItems);
                showSuccess(t('importSuccess'), 2000);
            } catch (err) {
                alert(t('parseJsonFailed'));
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
                        mutateItems={mutatePersonalItems}
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

    const activeIssue = prefsMirrorIssue ?? configUpdateIssue ?? promptHealthIssue;
    const issueDetail = activeIssue
        ? localizePromptSourceError(
            activeIssue.errorCode,
            safeErrorText([activeIssue.fallback], t('configNotSaved')),
            t,
        )
        : '';
    const issuePrefix = prefsMirrorIssue || configUpdateIssue
        ? t((prefsMirrorIssue ?? configUpdateIssue)!.configSaved
            ? 'configSavedRefreshFailed'
            : 'configNotSaved')
        : '';
    const resetIssue = resetIncomplete ? t('resetIncomplete') : '';
    const bookmarkIssue = bookmarkPersistenceIssue
        ? t('bookmarkPersistenceWarning')
        : '';
    const bookmarkLoadWarning = bookmarkLoadIssue === 'bookmark_storage_read_failed'
        ? t('bookmarkStorageReadFailed')
        : bookmarkLoadIssue === 'bookmark_storage_invalid'
            ? t('bookmarkStorageInvalid')
            : bookmarkLoadIssue === 'bookmark_defaults_unreadable'
                ? t('bookmarkDefaultsUnreadable')
                : '';
    const configIssue = activeIssue
        ? `${issuePrefix}${issuePrefix && issueDetail ? ' ' : ''}${issueDetail}`
        : '';
    const persistenceWarning = [
        resetIssue,
        bookmarkIssue,
        bookmarkLoadWarning,
        configIssue,
    ]
        .filter(Boolean)
        .join(' ');

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

                    {persistenceWarning && (
                        <div
                            className="bg-amber-50 text-amber-800 text-center py-3 px-4 font-medium text-sm border-b border-amber-200 flex items-center justify-center gap-2"
                            role="alert"
                        >
                            <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0"></div>
                            <span>{persistenceWarning}</span>
                            {resetIncomplete
                                && resetTransactionRef.current?.retryAction
                                && (
                                    <button
                                        type="button"
                                        onClick={handleResetCleanupRetry}
                                        className="ml-2 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                                    >
                                        {t('retryResetCleanup')}
                                    </button>
                                )}
                        </div>
                    )}

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

                    <div className="flex min-h-[600px]">
                        {/* Left sidebar navigation (spec 2026-07-03-options-sidebar-nav) */}
                        <nav className="w-52 shrink-0 p-4 border-r border-slate-100 bg-slate-50/50">
                            {([
                                ['general', <Maximize2 size={16} />, t('behavior')],
                                ['appearance', <Settings size={16} />, t('appearance')],
                                ['copilot', <FileText size={16} />, t('copilotConfig')],
                                ['model', <Sparkles size={16} />, t('modelPerformance')],
                                ['__sep__', null, ''],
                                ['team', <Building2 size={16} />, t('teamCatalog')],
                                ['bookmarks', <Folder size={16} />, t('menuEditor')],
                                ['__sep__', null, ''],
                                ['about', <Info size={16} />, t('aboutHelp')],
                            ] as [string, React.ReactNode, string][]).map(([id, icon, label], idx) => id === '__sep__'
                                ? <div key={`sep-${idx}`} className="h-px bg-slate-200 my-2 mx-1" />
                                : (
                                    <button
                                        key={id}
                                        type="button"
                                        data-section={id}
                                        onClick={() => setActiveSection(id as SectionId)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-all mb-0.5 ${activeSection === id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {icon}{label}
                                    </button>
                                )
                            )}
                        </nav>

                        {/* Content pane */}
                        <div className="flex-1 min-w-0 p-8">

                        {activeSection === 'appearance' && (
                        <div>
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
                                </div>
                            </div>
                        </div>
                        )}

                        {activeSection === 'general' && (
                        <div>
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

                                        {/* Analyze Timeout (C2b-lite) */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('analyzeTimeout')}</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                {t('analyzeTimeoutDesc')}
                                            </p>
                                            <input
                                                type="number"
                                                name="analyzeTimeoutSeconds"
                                                min={60}
                                                max={3600}
                                                step={60}
                                                value={prefs.analyzeTimeoutSeconds ?? 1200}
                                                onChange={handlePrefChange}
                                                onBlur={() => {
                                                    // Client-side clamp [60, 3600] so the value the
                                                    // user sees matches what the host will store. Host
                                                    // re-clamps defensively but only surfaces the
                                                    // clamped value on next get_config (e.g. restart),
                                                    // which would otherwise be a surprising silent
                                                    // change for the user.
                                                    const raw = Number(prefsRef.current.analyzeTimeoutSeconds ?? 1200);
                                                    const clamped = Number.isFinite(raw)
                                                        ? Math.max(60, Math.min(3600, Math.round(raw)))
                                                        : 1200;
                                                    const next = updateCurrentPrefs({ analyzeTimeoutSeconds: clamped });
                                                    persistPrefs(next);
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                                            />
                                        </div>

                                        {/* Log Level */}
                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('logLevel')}</label>
                                            <p className="text-[10px] text-slate-500 mb-2">
                                                {t('logLevelDesc')}
                                            </p>
                                            <select
                                                name="logLevel"
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
                        </div>
                        )}

                        {activeSection === 'team' && (
                        <div>
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
                                                                invalidateTeamRefresh();
                                                                setTeamItems([]);
                                                                setTeamSynced('');
                                                                setTeamFetchError(null);
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
                                                            invalidateTeamRefresh();
                                                            setTeamList([]);
                                                            setTeamItems([]);
                                                            setTeamSynced('');
                                                            setTeamFetchError(null);
                                                            markUserTouched(['teamManifestUrl']);
                                                            updateCurrentPrefs({ teamManifestUrl: e.target.value });
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
                                                                    const generation = teamRefreshGenerationRef.current;
                                                                    const next = updateCurrentPrefs({ teamManifestUrl: '', team: undefined, teamLabel: undefined });
                                                                    markUserTouched(['teamManifestUrl', 'team', 'teamLabel']);
                                                                    persistPrefs(next, { mirrorAction: createPrefsMirrorAction(
                                                                    'team-clear',
                                                                    {
                                                                        enabled: true,
                                                                        manifestUrl: '',
                                                                        teamId: '',
                                                                    },
                                                                    () => { void chrome.runtime.sendMessage({
                                                                        type: 'SYNC_TEAM_CATALOG',
                                                                        payload: teamRequestPayload(generation, {
                                                                            enabled: true,
                                                                            manifestUrl: '',
                                                                            teamId: '',
                                                                        }, { resetCache: true }),
                                                                    });
                                                                    setTeamList([]);
                                                                    setTeamItems([]);
                                                                    setTeamCollapsedLabels(new Set());
                                                                    setTeamSynced('');
                                                                    setTeamFetchError(null);
                                                                    lastSuccessfulManifestUrlRef.current = '';
                                                                    },
                                                                    ) });
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
                                                            persistPrefs(prefsRef.current, { fetchManifest: true });
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
                                                        <p className="text-[11px] text-red-600 mt-1">
                                                            {(() => {
                                                                switch (teamFetchError.kind) {
                                                                    case 'auth':
                                                                        return `${t('manifestFetchAuth')}${teamFetchError.httpStatus ? ` (HTTP ${teamFetchError.httpStatus})` : ''}`;
                                                                    case 'notFound':
                                                                        return `${t('manifestFetchNotFound')}${teamFetchError.httpStatus ? ` (HTTP ${teamFetchError.httpStatus})` : ''}`;
                                                                    case 'network':
                                                                        return t('manifestFetchNetwork');
                                                                    case 'parse':
                                                                        return t('manifestFetchParse');
                                                                    case 'http':
                                                                        return `${t('manifestFetchHttp')}${teamFetchError.httpStatus ? ` (HTTP ${teamFetchError.httpStatus})` : ''}`;
                                                                    default:
                                                                        return t('manifestFetchFailed');
                                                                }
                                                            })()}
                                                        </p>
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
                        )}

                        {activeSection === 'copilot' && (
                        <div>
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
                                                    name="rootPath"
                                                    aria-label={t('rootPath')}
                                                    value={prefs.rootPath || ""}
                                                    onChange={(e) => { markUserTouched(['rootPath']); updateCurrentPrefs({ rootPath: e.target.value }); }} onBlur={handlePrefBlur}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono"
                                                    placeholder="C:\MyCases"
                                                />
                                            </div>

                                        <div className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="useWorkspaceOnly"
                                                    checked={prefs.useWorkspaceOnly !== false}
                                                    disabled={!hasRootPath}
                                                    onChange={(e) => updatePref({ useWorkspaceOnly: e.target.checked })}
                                                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <label htmlFor="useWorkspaceOnly" className={`text-xs font-semibold select-none ${hasRootPath ? 'text-slate-700 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}`}>
                                                    {t('useWorkspaceOnly')}
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 ml-6">
                                                {t('useWorkspaceOnlyDesc')}
                                            </p>
                                        </div>

                                            {/* 3. Skills Directory */}
                                            <div className="mt-4">
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('skillDirectories')}</label>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('skillDirectoriesDesc')}
                                                </p>
                                                <input
                                                    type="text"
                                                    name="skillDirectories"
                                                    aria-label={t('skillDirectories')}
                                                    value={prefs.skillDirectories || ""}
                                                    onChange={(e) => { markUserTouched(['skillDirectories']); updateCurrentPrefs({ skillDirectories: e.target.value }); }} onBlur={handlePrefBlur}
                                                    disabled={effectiveRepositoryOnly}
                                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono ${effectiveRepositoryOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
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
                                                    name="mcpConfigPath"
                                                    aria-label={t('mcpConfigPath')}
                                                    value={prefs.mcpConfigPath || ""}
                                                    onChange={(e) => { markUserTouched(['mcpConfigPath']); updateCurrentPrefs({ mcpConfigPath: e.target.value }); }} onBlur={handlePrefBlur}
                                                    disabled={effectiveRepositoryOnly}
                                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono ${effectiveRepositoryOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
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
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-52 overflow-y-auto resize-y bg-white"
                                                    />
                                                ) : (
                                                    <textarea
                                                        name="userInstructions"
                                                        aria-label={t('userInstructions')}
                                                        value={prefs.userInstructions || ""}
                                                        onChange={(e) => { userInstructionsEditTokenRef.current = { revision: userInstructionsEditTokenRef.current.revision + 1, value: e.target.value }; markUserTouched(['userInstructions']); updateCurrentPrefs({ userInstructions: e.target.value }); }} onBlur={handlePrefBlur}
                                                        disabled={effectiveRepositoryOnly}
                                                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y ${effectiveRepositoryOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                                        placeholder={t('userInstructionsPlaceholder')}
                                                    />
                                                )}
                                                {effectiveRepositoryOnly && (
                                                    <p className="text-[10px] text-amber-700 mt-2">
                                                        {t('dhSpecificInstructionsInactive')}
                                                    </p>
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
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-52 overflow-y-auto resize-y bg-white"
                                                    />
                                                ) : (
                                                    <textarea
                                                        name="userPrompt"
                                                        aria-label={t('userPrompt')}
                                                        value={prefs.userPrompt || ""}
                                                        onChange={(e) => { userPromptEditTokenRef.current = { revision: userPromptEditTokenRef.current.revision + 1, value: e.target.value }; markUserTouched(['userPrompt']); updateCurrentPrefs({ userPrompt: e.target.value }); }} onBlur={handlePrefBlur}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm font-mono h-52 resize-y"
                                                        placeholder={t('userPromptPlaceholder')}
                                                    />
                                                )}
                                            </div>
                        </div>
                        )}

                        {activeSection === 'model' && (
                        <div>
                                            <div className="mt-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                        <Sparkles size={14} /> {t('modelPerformance')}
                                                    </h2>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchModels(true)}
                                                        disabled={modelFetching}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                    >
                                                        <RefreshCw size={12} className={modelFetching ? 'animate-spin' : ''} />
                                                        {modelFetching ? t('syncing') : t('refresh')}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mb-2">
                                                    {t('modelPerformanceDesc')}
                                                </p>

                                                {/* Model */}
                                                <label className="block text-[11px] font-medium text-slate-600 mb-1">{t('modelLabel')}</label>
                                                <select
                                                    name="model"
                                                    value={prefs.model || ''}
                                                    onChange={(e) => {
                                                        // Reset reasoning effort if the newly-picked model
                                                        // doesn't support the currently-selected effort —
                                                        // otherwise create_session fails with "Model X does
                                                        // not support reasoning effort configuration".
                                                        const newModel = e.target.value;
                                                        const sel = modelList.find(m => m.id === newModel);
                                                        const supported = sel?.supported_reasoning_efforts || [];
                                                        const patch: { model: string; reasoningEffort?: '' } = { model: newModel };
                                                        if (prefs.reasoningEffort && !supported.includes(prefs.reasoningEffort)) {
                                                            patch.reasoningEffort = '';
                                                        }
                                                        updatePref(patch);
                                                    }}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white mb-1"
                                                >
                                                    <option value="">{t('useCliDefault')}</option>
                                                    {modelList.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                                                    ))}
                                                    {/* Preserve a persisted model no longer in the list so it stays selected. */}
                                                    {prefs.model && !modelList.some(m => m.id === prefs.model) && (
                                                        <option value={prefs.model}>{prefs.model}</option>
                                                    )}
                                                </select>
                                                {modelFetchError && (
                                                    <p className="text-[11px] text-red-600 mb-2">
                                                        {modelFetchError.kind === 'auth'
                                                            ? t('modelFetchAuth')
                                                            : t('modelFetchFailed')}
                                                    </p>
                                                )}

                                                {/* Reasoning effort */}
                                                <label className="block text-[11px] font-medium text-slate-600 mb-1 mt-2">{t('reasoningEffortLabel')}</label>
                                                <select
                                                    name="reasoningEffort"
                                                    value={prefs.reasoningEffort || ''}
                                                    onChange={(e) => updatePref({ reasoningEffort: e.target.value as any })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                                >
                                                    <option value="">{t('useCliDefault')}</option>
                                                    {(() => {
                                                        // Only offer efforts the SELECTED model supports.
                                                        // A model with an empty supported list (e.g. Claude
                                                        // Sonnet 4.5) supports no reasoning effort → only
                                                        // "Use CLI default" is offered, preventing the
                                                        // create_session "does not support reasoning effort"
                                                        // failure. When no model is picked (inherit CLI
                                                        // default) we also can't know support → no efforts.
                                                        const sel = modelList.find(m => m.id === prefs.model);
                                                        const efforts = sel?.supported_reasoning_efforts || [];
                                                        return efforts.map(ef => <option key={ef} value={ef}>{ef}</option>);
                                                    })()}
                                                </select>
                                                {prefs.model && (() => {
                                                    const sel = modelList.find(m => m.id === prefs.model);
                                                    const supported = sel?.supported_reasoning_efforts || [];
                                                    return supported.length === 0 ? (
                                                        <p className="text-[10px] text-slate-400 mt-1">{t('effortUnsupported')}</p>
                                                    ) : null;
                                                })()}

                                                {/* Context tier */}
                                                <label className="block text-[11px] font-medium text-slate-600 mb-1 mt-2">{t('contextTierLabel')}</label>
                                                <select
                                                    name="contextTier"
                                                    value={prefs.contextTier || ''}
                                                    onChange={(e) => updatePref({ contextTier: e.target.value as any })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
                                                >
                                                    <option value="">{t('useCliDefault')}</option>
                                                    <option value="default">default</option>
                                                    <option value="long_context">long_context</option>
                                                </select>
                                            </div>
                        </div>
                        )}

                        {activeSection === 'bookmarks' && (
                        <div className="min-w-0">
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

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden resize-y flex flex-col h-[900px]">
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
                                            const newItem: MenuItem = { type: 'link', label: t('newItemLabel'), url: 'https://' };
                                            if (selectedPath) {
                                                mutatePersonalItems(prev => addItemAt(selectedPath, newItem, prev));
                                            } else {
                                                mutatePersonalItems(prev => [...prev, newItem]);
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
                                            title={t('clearSelection')}
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
                                    {mergedItems.length === 0 ? (
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
                        )}

                        {activeSection === 'about' && (
                        <div>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Info size={14} /> {t('aboutHelp')}
                            </h2>

                            {/* About / version */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                        {prefs.buttonText.slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{t('appName')}</p>
                                        <p className="text-xs text-slate-500">{t('aboutTagline')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span>Extension v{getExtensionVersion()}</span>
                                    {hostVersion && <span>• {t('hostVersion')} v{hostVersion}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={handleCheckUpdates}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm"
                                    >
                                        <RefreshCw size={12} /> {t('checkForUpdates')}
                                    </button>
                                    {updateAvailable && (
                                        <button
                                            onClick={handleUpdate}
                                            disabled={isUpdating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            {isUpdating ? <RotateCcw size={12} className="animate-spin" /> : <Download size={12} />}
                                            {isUpdating ? t('updating') : t('updateNow')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Links */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                                <a href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <BookOpen size={14} className="text-teal-600" /> {t('openUserGuide')}
                                </a>
                                <a href="https://github.com/boatmac/Dynamics-Helper/releases" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <Github size={14} className="text-teal-600" /> {t('viewOnGitHub')}
                                </a>
                                <a href="https://github.com/boatmac/Dynamics-Helper/issues/new" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <Bug size={14} className="text-teal-600" /> {t('reportABug')}
                                </a>
                            </div>

                            {/* Help & Troubleshooting */}
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-slate-700 mb-2">{t('helpTroubleshooting')}</h3>
                                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 mb-3">
                                    <li>{t('issueTimeout')}</li>
                                    <li>{t('issueDisconnected')}</li>
                                </ul>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">{t('collectLogs')}</p>
                                    <p className="text-[10px] text-slate-500 mb-2">{t('collectLogsDesc')}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 truncate">%LOCALAPPDATA%\DynamicsHelper</code>
                                        <button
                                            onClick={handleCopyLogPath}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shrink-0"
                                        >
                                            <Copy size={12} /> {t('copyPath')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy */}
                            <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
                                <Shield size={12} className="text-slate-400 mt-px shrink-0" />
                                <span>{t('privacyNote')}{' '}
                                    <a href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md#security--privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{t('securityPrivacy')}</a>
                                </span>
                            </p>
                        </div>
                        )}

                        </div>{/* content pane */}

                    </div>{/* flex */}
                </div>
            </div>
        </DndProvider>
    );
};

// Outer wrapper: reads prefs.language and provides it via context to the
// entire OptionsInner subtree. This is required because OptionsInner itself
// calls useTranslation() at its top level — if the Provider lived inside
// OptionsInner's JSX (as it did pre-2.0.71), the top-level useTranslation
// would be an ancestor of the Provider rather than a descendant, so its
// useContext(PrefsLanguageContext) call would return null and fall back to
// the storage-driven path that only updates after Save (the bug fixed here).
const Options: React.FC = () => {
    const { prefs } = usePrefs();
    return (
        <PrefsLanguageProvider language={prefs.language ?? 'auto'}>
            <OptionsInner />
        </PrefsLanguageProvider>
    );
};

export default Options;


