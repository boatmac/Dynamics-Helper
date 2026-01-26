import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
}

const DEFAULT_PREFS: Preferences = {
    buttonText: "DH",
    primaryColor: "#2563eb",
    offsetBottom: 24,
    offsetRight: 24
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
        <div className="border p-4 rounded bg-gray-50 mb-4 animate-fade-in-up">
            <h4 className="font-bold text-sm mb-2 text-gray-700">Edit Item</h4>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600">Label</label>
                    <input 
                        className="w-full border p-1 text-sm rounded"
                        value={draft.label} 
                        onChange={e => handleChange('label', e.target.value)} 
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-gray-600">Type</label>
                    <select 
                        className="w-full border p-1 text-sm rounded"
                        value={draft.type} 
                        onChange={e => handleChange('type', e.target.value)}
                    >
                        <option value="link">Link</option>
                        <option value="folder">Folder</option>
                        <option value="markdown">Markdown Note</option>
                    </select>
                </div>

                {draft.type === 'link' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600">URL</label>
                        <input 
                            className="w-full border p-1 text-sm rounded"
                            value={draft.url || ''} 
                            onChange={e => handleChange('url', e.target.value)} 
                        />
                    </div>
                )}

                {draft.type === 'markdown' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-600">Content</label>
                        <textarea 
                            className="w-full border p-1 text-sm rounded h-20"
                            value={draft.content || ''} 
                            onChange={e => handleChange('content', e.target.value)} 
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onCancel} className="text-xs px-2 py-1 bg-gray-200 rounded">Cancel</button>
                    <button onClick={() => onSave(draft)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Save</button>
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
    moveItem: (dragPath: number[], hoverPath: number[], intoFolder?: boolean) => void;
    renderList: (list: MenuItem[], pathPrefix: number[]) => React.ReactNode;
    setItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    setEditingItemPath: React.Dispatch<React.SetStateAction<number[] | null>>;
    editingItemPath: number[] | null;
    updateItemAt: (path: number[], newItem: MenuItem, list: MenuItem[]) => MenuItem[];
    deleteItemAt: (path: number[], list: MenuItem[]) => MenuItem[];
    addItemAt: (path: number[] | null, newItem: MenuItem, list: MenuItem[]) => MenuItem[];
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
    addItemAt
}) => {
    const ref = useRef<HTMLLIElement>(null);
    const currentPath = [...path, index];
    const isEditing = editingItemPath && editingItemPath.join('.') === currentPath.join('.');

    // Drag Logic
    const [{ isDragging }, drag] = useDrag({
        type: ItemType.ITEM,
        item: { path: currentPath, type: item.type },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Drop Logic
    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: ItemType.ITEM,
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
        hover: (draggedItem, monitor) => {
            if (!ref.current) return;
            // Standard re-ordering logic can go here for smoother UX, 
            // but for tree structures, explicit drops are often safer/clearer.
        },
        drop: (draggedItem, monitor) => {
             if (monitor.didDrop()) return; // Already handled by child

             // Prevent dropping on self or children
             const isChild = (parent: number[], child: number[]) => {
                 if (child.length <= parent.length) return false;
                 return parent.every((val, i) => child[i] === val);
             };
             if (draggedItem.path.join('.') === currentPath.join('.') || isChild(draggedItem.path, currentPath)) {
                 return;
             }

             // Check if dropping INTO a folder vs re-ordering
             const hoverBoundingRect = ref.current?.getBoundingClientRect();
             if (!hoverBoundingRect) return;
             
             const isInside = item.type === 'folder' && monitor.isOver({ shallow: true });
             
             // If dropping ON a folder, we move INSIDE.
             if (isInside) {
                 moveItem(draggedItem.path, currentPath, true);
             } else {
                 // Insert BEFORE this item
                 moveItem(draggedItem.path, currentPath, false);
             }
        }
    });

    drag(drop(ref));

    const opacity = isDragging ? 0.4 : 1;
    const bgClass = isOver && canDrop ? (item.type === 'folder' ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-green-100 ring-2 ring-green-400') : 'hover:bg-gray-50';

    return (
        <li ref={ref} className={`group mb-1 rounded transition-all duration-200 ${bgClass}`} style={{ opacity }}>
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
                <div className="flex items-center justify-between p-2 rounded cursor-grab active:cursor-grabbing">
                    <div 
                        className="flex items-center gap-2 flex-1"
                        onClick={() => {
                            if (item.type === 'folder') {
                                // Toggle collapse
                                const newItem = { ...item, collapsed: !item.collapsed };
                                setItems(prev => updateItemAt(currentPath, newItem, prev));
                            }
                        }}
                    >
                        <span className="text-xl">
                            {item.type === 'folder' ? (item.collapsed ? '📁' : '📂') : item.type === 'link' ? '🔗' : '📝'}
                        </span>
                        <span className="font-medium text-gray-700">{item.label}</span>
                        {item.url && <span className="text-xs text-gray-400 truncate max-w-[200px]">{item.url}</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'folder' && (
                            <button 
                                onClick={(e) => {
                                     e.stopPropagation();
                                     const newItem: MenuItem = { type: 'link', label: 'New Link', url: 'https://' };
                                     setItems(prev => addItemAt(currentPath, newItem, prev));
                                }}
                                className="p-1 text-green-600 hover:bg-green-100 rounded" title="Add Child"
                            >
                                ➕
                            </button>
                        )}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingItemPath(currentPath);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this item?")) {
                                    setItems(prev => deleteItemAt(currentPath, prev));
                                }
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            )}
            
            {/* Children */}
            {item.children && item.children.length > 0 && !item.collapsed && (
                <div className="ml-6 pl-2 border-l-2 border-gray-100">
                    {renderList(item.children, currentPath)}
                </div>
            )}
        </li>
    );
};

// --- Main Options Component ---
const Options: React.FC = () => {
    // State
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [status, setStatus] = useState<string>("");
    
    // Editor State
    const [editingItemPath, setEditingItemPath] = useState<number[] | null>(null); // path of indices

    // Initial Load
    useEffect(() => {
        // Load Prefs
        chrome.storage.local.get("dh_prefs", (result) => {
            if (result.dh_prefs) setPrefs({ ...DEFAULT_PREFS, ...result.dh_prefs });
        });

        // Load Items
        loadItems().then(setItems);
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
            setStatus("Saved successfully!");
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
    const moveItem = (dragPath: number[], hoverPath: number[], intoFolder: boolean = false) => {
        if (dragPath.join('.') === hoverPath.join('.')) return;

        // 1. Get the item to move
        const itemToMove = getItemAt(dragPath, items);
        if (!itemToMove) return;

        // 2. Remove it from old location
        // Note: If we remove first, indices might shift. 
        // We need to be careful if dragPath and hoverPath are in the same parent.
        // It's safer to clone the tree, remove, then insert.
        
        let newItems = [...items];
        
        // Helper to remove without index shifting issues impacting insertion:
        // Actually, let's just do it in two passes. 
        // If we remove 'dragPath', 'hoverPath' might become invalid if it was after 'dragPath' in same array.
        // So we need to calculate 'insertPath' before removing, adjusting if necessary.
        
        // Simpler strategy: Use a unique ID? We don't have one.
        // Let's rely on the fact that we can walk the tree.
        
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
        // We need to adjust hoverPath if it was affected by removal.
        // If dragPath and hoverPath share the same parent, and dragIndex < hoverIndex,
        // then hoverIndex needs to be decremented.
        
        let finalInsertPath = [...hoverPath];
        
        // Check if same parent
        const dragParentPath = dragPath.slice(0, -1);
        const hoverParentPath = hoverPath.slice(0, -1);
        
        if (dragParentPath.join('.') === hoverParentPath.join('.')) {
            const dragIndex = dragPath[dragPath.length - 1];
            const hoverIndex = hoverPath[hoverPath.length - 1];
            if (dragIndex < hoverIndex) {
                finalInsertPath[finalInsertPath.length - 1]--;
            }
        }
        
        // Insert function
        const insertOp = (path: number[], item: MenuItem, currentList: MenuItem[], inside: boolean): MenuItem[] => {
             // If insert at root
             if (path.length === 1) {
                 const idx = path[0];
                 const res = [...currentList];
                 if (inside) {
                     // Insert inside the item at idx
                     const target = res[idx];
                     if (target.type === 'folder') {
                         target.children = [...(target.children || []), item];
                         target.collapsed = false; // Expand
                     }
                 } else {
                     // Insert before the item at idx
                     res.splice(idx, 0, item);
                 }
                 return res;
             }
             
             const [h, ...t] = path;
             return currentList.map((itm, i) => {
                 if (i === h) {
                     return { ...itm, children: insertOp(t, item, itm.children || [], inside) };
                 }
                 return itm;
             });
        };
        
        const finalItems = insertOp(finalInsertPath, removed, itemsAfterRemoval, intoFolder);
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
                        key={idx} // Note: Index as key is risky for dnd but simple for this tree structure
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
                    />
                ))}
            </ul>
        );
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Dynamics Helper</h1>
                            <p className="opacity-80 text-sm">Configuration & Bookmarks</p>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={handleReset} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors">
                                Reset
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 bg-white text-blue-600 font-bold rounded shadow hover:bg-gray-100 text-sm transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className="bg-green-100 text-green-800 text-center py-2 font-medium text-sm">
                            {status}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                        
                        {/* Sidebar: Visual Settings */}
                        <div className="p-6 border-r border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Appearance</h2>
                            
                            <div className="space-y-6">
                                {/* Preview */}
                                <div className="flex items-center justify-center p-6 bg-white border border-dashed border-gray-300 rounded-lg">
                                    <div 
                                        className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-2xl"
                                        style={{ backgroundColor: prefs.primaryColor }}
                                    >
                                        {prefs.buttonText}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                                    <input
                                        type="text"
                                        name="buttonText"
                                        value={prefs.buttonText}
                                        onChange={handlePrefChange}
                                        maxLength={3}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            name="primaryColor"
                                            value={prefs.primaryColor}
                                            onChange={handlePrefChange}
                                            className="h-10 w-16 p-1 border rounded cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            name="primaryColor"
                                            value={prefs.primaryColor}
                                            onChange={handlePrefChange}
                                            className="flex-1 px-3 py-2 border rounded outline-none uppercase font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Bottom (px)</label>
                                        <input
                                            type="number"
                                            name="offsetBottom"
                                            value={prefs.offsetBottom}
                                            onChange={handlePrefChange}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Right (px)</label>
                                        <input
                                            type="number"
                                            name="offsetRight"
                                            value={prefs.offsetRight}
                                            onChange={handlePrefChange}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Bookmarks Editor */}
                        <div className="col-span-2 p-6">
                            <div className="flex justify-between items-center mb-4 border-b pb-2 flex-wrap gap-2">
                                <h2 className="text-lg font-bold text-gray-800">Bookmarks</h2>
                                <div className="flex gap-2">
                                    <label className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded cursor-pointer border border-gray-300">
                                        Import
                                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                    </label>
                                    <button 
                                        onClick={handleExport}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border border-gray-300"
                                    >
                                        Export
                                    </button>
                                    <button 
                                        onClick={() => collapseAll(true)}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border border-gray-300"
                                    >
                                        Collapse All
                                    </button>
                                    <button 
                                        onClick={() => collapseAll(false)}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border border-gray-300"
                                    >
                                        Expand All
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const newItem: MenuItem = { type: 'link', label: 'New Item', url: 'https://' };
                                            setItems(prev => [...prev, newItem]);
                                        }}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                    >
                                        + Add Root
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg border border-gray-200 min-h-[400px]">
                                {items.length === 0 ? (
                                    <div className="text-center p-10 text-gray-400">
                                        No items found. Click "Reset" or "Add Root Item" to start.
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        {renderList(items)}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default Options;

