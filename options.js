(function(){
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const defaults = {
    buttonText: 'DH',
    primaryColor: '#2563eb',
    offsetBottom: 24,
    offsetRight: 24,
    zebraAutomationEnabled: true
  };

  let currentItems = [];
  let editingItem = null; // { item, parent, index }
  let collapsedFolders = new WeakSet();
  let filterText = '';
  let draggedData = null; // { items: [] } - Array of items being dragged
  let selectedItems = new Set(); // Set of selected items

  function mergePrefs(p){
    return {
      buttonText: p && typeof p.buttonText === 'string' && p.buttonText.trim() ? p.buttonText.trim() : defaults.buttonText,
      primaryColor: p && typeof p.primaryColor === 'string' && p.primaryColor ? p.primaryColor : defaults.primaryColor,
      offsetBottom: p && Number.isFinite(Number(p.offsetBottom)) ? Number(p.offsetBottom) : defaults.offsetBottom,
      offsetRight: p && Number.isFinite(Number(p.offsetRight)) ? Number(p.offsetRight) : defaults.offsetRight,
      zebraAutomationEnabled: p && typeof p.zebraAutomationEnabled === 'boolean' ? p.zebraAutomationEnabled : defaults.zebraAutomationEnabled,
    };
  }

  function show(el, msg, cls){
    if(!el) return;
    el.textContent = msg || '';
    el.className = (cls ? cls + ' ' : '') + el.className.split(' ').filter(c=>c==='status'||c==='error').join(' ');
  }

  async function loadPackagedItems(){
    try{
      const url = chrome.runtime.getURL('items.json');
      const res = await fetch(url, {cache:'no-cache'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      return arr;
    }catch(e){
      console.warn('[Options] Failed to load packaged items.json', e);
      return [];
    }
  }

  function pretty(obj){
    try { return JSON.stringify(obj, null, 2); } catch { return ''; }
  }

  // --- Visual Editor Logic ---

  function matchesFilter(item) {
    if (!filterText) return true;
    const txt = filterText.toLowerCase();
    if (item.label && item.label.toLowerCase().includes(txt)) return true;
    if (item.type === 'folder' && item.children) {
      return item.children.some(child => matchesFilter(child));
    }
    return false;
  }

  function sortItemsRecursive(items) {
    items.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    items.forEach(item => {
      if (item.type === 'folder' && item.children) {
        sortItemsRecursive(item.children);
      }
    });
  }

  function isDescendant(parentItem, childItem) {
    if (!parentItem || !parentItem.children) return false;
    if (parentItem.children.includes(childItem)) return true;
    return parentItem.children.some(child => isDescendant(child, childItem));
  }

  // Helper to find parent array and index of an item
  function findItemLocation(rootArray, itemToFind) {
    for (let i = 0; i < rootArray.length; i++) {
      if (rootArray[i] === itemToFind) return { parent: rootArray, index: i };
      if (rootArray[i].type === 'folder' && rootArray[i].children) {
        const result = findItemLocation(rootArray[i].children, itemToFind);
        if (result) return result;
      }
    }
    return null;
  }

  function renderVisualTree() {
    const container = $('#visualTree');
    if (!container) return;
    container.innerHTML = '';
    
    if (!currentItems || currentItems.length === 0) {
      container.innerHTML = '<div style="color:#888; font-style:italic; padding:10px; text-align:center;">No items. Add one below.</div>';
      return;
    }

    function createNode(item, parentArray, index) {
      // Filter check
      if (!matchesFilter(item)) return null;

      const div = document.createElement('div');
      div.className = 'tree-item';
      div.setAttribute('draggable', 'true');
      
      // Drag Events
      div.addEventListener('dragstart', (e) => {
        e.stopPropagation(); // Prevent parent drag
        
        // Multi-selection logic for drag
        if (!selectedItems.has(item)) {
          // If dragging an unselected item, clear selection and select it
          selectedItems.clear();
          selectedItems.add(item);
          renderVisualTree(); // Re-render to show selection
        }
        
        draggedData = { items: Array.from(selectedItems) };
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => div.classList.add('dragging'), 0);
      });

      div.addEventListener('dragend', (e) => {
        e.stopPropagation();
        $$('.tree-item.dragging').forEach(el => el.classList.remove('dragging'));
        draggedData = null;
        $$('.drag-over').forEach(el => el.classList.remove('drag-over'));
        $$('.drag-over-inside').forEach(el => el.classList.remove('drag-over-inside'));
      });

      div.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
        e.stopPropagation();
        if (!draggedData) return;
        
        // Validation: Cannot drop into self or descendants
        for (const draggedItem of draggedData.items) {
          if (draggedItem === item) return;
          if (draggedItem.type === 'folder' && isDescendant(draggedItem, item)) return;
        }
        
        // Determine drop zone: Inside Folder vs Insert Before
        let isInside = false;
        if (item.type === 'folder') {
          const rect = div.getBoundingClientRect();
          // If hovering over the middle 50% of the folder header area, treat as "inside"
          // Actually, let's use the header element for better precision
          const headerRect = div.querySelector('.tree-item-header').getBoundingClientRect();
          const offsetY = e.clientY - headerRect.top;
          if (offsetY > headerRect.height * 0.25 && offsetY < headerRect.height * 0.75) {
            isInside = true;
          }
        }

        $$('.drag-over').forEach(el => el.classList.remove('drag-over'));
        $$('.drag-over-inside').forEach(el => el.classList.remove('drag-over-inside'));

        if (isInside) {
          div.classList.add('drag-over-inside');
        } else {
          div.classList.add('drag-over');
        }
        
        e.dataTransfer.dropEffect = 'move';
      });

      div.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        div.classList.remove('drag-over');
        div.classList.remove('drag-over-inside');
      });

      div.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        div.classList.remove('drag-over');
        div.classList.remove('drag-over-inside');
        
        if (!draggedData || !draggedData.items.length) return;

        // Determine drop target
        let targetParent = parentArray;
        let targetIndex = index;
        
        // Check if we are dropping INSIDE a folder
        // We need to re-calculate the "isInside" logic because drop event doesn't carry the class state reliably
        let isInside = false;
        if (item.type === 'folder') {
          const headerRect = div.querySelector('.tree-item-header').getBoundingClientRect();
          const offsetY = e.clientY - headerRect.top;
          if (offsetY > headerRect.height * 0.25 && offsetY < headerRect.height * 0.75) {
            isInside = true;
          }
        }

        if (isInside) {
          if (!item.children) item.children = [];
          targetParent = item.children;
          targetIndex = item.children.length; // Append to end
          // Expand folder to show dropped items
          collapsedFolders.delete(item);
        }

        // Validation again
        for (const draggedItem of draggedData.items) {
          if (draggedItem === item) return;
          if (draggedItem.type === 'folder' && isDescendant(draggedItem, item)) {
            alert('Cannot move a folder into its own child.');
            return;
          }
        }

        // Perform Move for all items
        // 1. Collect all items and their current locations
        const moves = [];
        for (const draggedItem of draggedData.items) {
          const loc = findItemLocation(currentItems, draggedItem);
          if (loc) moves.push({ item: draggedItem, ...loc });
        }

        // 2. Remove all items from old locations
        // Sort by index descending to avoid shifting issues when removing from same array
        moves.sort((a, b) => {
          if (a.parent !== b.parent) return 0;
          return b.index - a.index;
        });
        
        moves.forEach(m => {
          m.parent.splice(m.index, 1);
        });

        // 3. Insert at new location
        // If targetParent was one of the source arrays, we need to adjust targetIndex
        // But since we removed items, the targetIndex might point to a different item now.
        // However, 'item' (the drop target) is still in 'parentArray' (unless we dropped inside it).
        // If we dropped inside 'item', 'item' wasn't removed (validation ensures we didn't drag 'item').
        // If we dropped before 'item', we need to find 'item's new index.
        
        if (!isInside) {
          // Find the new index of the drop target 'item'
          const newLoc = findItemLocation(currentItems, item);
          if (newLoc) {
            targetIndex = newLoc.index;
            targetParent = newLoc.parent;
          } else {
            // Should not happen unless item was removed (impossible)
            return;
          }
        }

        // Insert items
        // We want to maintain their relative order if possible, or just insert them in selection order
        // Let's insert them in the order they are in draggedData.items
        // We insert them one by one at targetIndex. 
        // To keep order: insert item[0] at index, item[1] at index+1...
        draggedData.items.forEach((draggedItem, i) => {
          targetParent.splice(targetIndex + i, 0, draggedItem);
        });
        
        selectedItems.clear(); // Clear selection after drop
        renderVisualTree();
        syncToJson();
      });

      const header = document.createElement('div');
      header.className = 'tree-item-header';
      if (selectedItems.has(item)) {
        header.classList.add('selected');
      }
      
      // Selection Click Handler
      header.addEventListener('click', (e) => {
        // Ignore clicks on buttons
        if (e.target.tagName === 'BUTTON') return;
        
        if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          if (selectedItems.has(item)) selectedItems.delete(item);
          else selectedItems.add(item);
        } else {
          // Single select
          selectedItems.clear();
          selectedItems.add(item);
        }
        renderVisualTree();
      });
      
      // Collapse toggle for folders
      if (item.type === 'folder') {
        const btnCollapse = document.createElement('button');
        btnCollapse.className = 'btn-icon';
        btnCollapse.style.marginRight = '6px';
        btnCollapse.style.padding = '2px 6px';
        const isCollapsed = collapsedFolders.has(item) && !filterText; // Force expand when filtering
        btnCollapse.textContent = isCollapsed ? '▶' : '▼';
        btnCollapse.onclick = (e) => {
          e.stopPropagation();
          if (isCollapsed) collapsedFolders.delete(item);
          else collapsedFolders.add(item);
          renderVisualTree();
        };
        header.append(btnCollapse);
      }

      const typeBadge = document.createElement('span');
      typeBadge.className = 'tree-item-type';
      typeBadge.textContent = item.type;
      
      const label = document.createElement('span');
      label.className = 'tree-item-label';
      label.textContent = item.label || '(No Label)';
      
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-icon';
      btnEdit.textContent = 'Edit';
      btnEdit.onclick = () => openModal(item, parentArray, index);
      
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icon btn-delete';
      btnDel.textContent = '✕';
      btnDel.onclick = () => {
        if(confirm('Delete this item?')) {
          parentArray.splice(index, 1);
          renderVisualTree();
          syncToJson();
        }
      };

      header.append(typeBadge, label, btnEdit, btnDel);
      div.append(header);

      if (item.type === 'folder') {
        const isCollapsed = collapsedFolders.has(item) && !filterText;
        
        if (!isCollapsed) {
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'tree-children';
          
          if (item.children && item.children.length > 0) {
            item.children.forEach((child, i) => {
              const childNode = createNode(child, item.children, i);
              if (childNode) childrenContainer.append(childNode);
            });
          }
          
          const btnAddChild = document.createElement('button');
          btnAddChild.className = 'btn-icon btn-add';
          btnAddChild.style.marginTop = '4px';
          btnAddChild.textContent = '+ Add Child';
          btnAddChild.onclick = () => openModal(null, item.children || (item.children = []), -1);
          
          childrenContainer.append(btnAddChild);
          div.append(childrenContainer);
        }
      }
      
      return div;
    }

    currentItems.forEach((item, i) => {
      const node = createNode(item, currentItems, i);
      if (node) container.append(node);
    });
  }

  function openModal(item, parentArray, index) {
    editingItem = { item, parent: parentArray, index };
    const modal = $('#itemModal');
    const title = $('#modalTitle');
    
    $('#itemType').value = item ? item.type : 'link';
    $('#itemLabel').value = item ? item.label : '';
    $('#itemUrl').value = item ? item.url : '';
    $('#itemTarget').value = item ? item.target || '_blank' : '_blank';
    $('#itemContent').value = item ? item.content : '';
    
    title.textContent = item ? 'Edit Item' : 'Add Item';
    
    updateModalFields();
    modal.classList.remove('hidden');
  }

  function updateModalFields() {
    const type = $('#itemType').value;
    $$('.type-field').forEach(el => el.classList.add('hidden'));
    if (type === 'link') $$('.type-link').forEach(el => el.classList.remove('hidden'));
    if (type === 'markdown') $$('.type-markdown').forEach(el => el.classList.remove('hidden'));
  }

  function saveModal() {
    const type = $('#itemType').value;
    const label = $('#itemLabel').value;
    
    const newItem = { type, label };
    
    if (type === 'link') {
      newItem.url = $('#itemUrl').value;
      newItem.target = $('#itemTarget').value;
    } else if (type === 'markdown') {
      newItem.content = $('#itemContent').value;
    } else if (type === 'folder') {
      if (editingItem && editingItem.item && editingItem.item.type === 'folder') {
        newItem.children = editingItem.item.children;
      } else {
        newItem.children = [];
      }
    }

    if (editingItem && editingItem.index !== -1 && editingItem.item) {
      editingItem.parent[editingItem.index] = newItem;
    } else {
      editingItem.parent.push(newItem);
    }
    
    $('#itemModal').classList.add('hidden');
    renderVisualTree();
    syncToJson();
  }

  function syncToJson() {
    const $itemsJson = $('#itemsJson');
    if ($itemsJson) $itemsJson.value = pretty(currentItems);
  }

  function syncFromJson() {
    const $itemsJson = $('#itemsJson');
    try {
      const parsed = JSON.parse($itemsJson.value || '[]');
      currentItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
      renderVisualTree();
      return true;
    } catch (e) {
      alert('Invalid JSON in editor. Please fix it before switching to Visual mode.');
      return false;
    }
  }

  // --- Init ---

  async function init(){
    const $buttonText = $('#buttonText');
    const $primaryColor = $('#primaryColor');
    const $offsetBottom = $('#offsetBottom');
    const $offsetRight = $('#offsetRight');
    const $zebraAutomationEnabled = $('#zebraAutomationEnabled');
    const $prefsStatus = $('#prefsStatus');
    const $itemsJson = $('#itemsJson');
    const $jsonError = $('#jsonError');
    const $itemsStatus = $('#itemsStatus');
    const $fileInput = $('#fileInput');

    // Load stored preferences and items
    const stored = await chrome.storage.local.get(['dh_prefs','dh_items']);
    const prefs = mergePrefs(stored.dh_prefs || {});

    // Prefill
    if($buttonText) $buttonText.value = prefs.buttonText;
    if($primaryColor) $primaryColor.value = prefs.primaryColor;
    if($offsetBottom) $offsetBottom.value = String(prefs.offsetBottom);
    if($offsetRight) $offsetRight.value = String(prefs.offsetRight);
    if($zebraAutomationEnabled) $zebraAutomationEnabled.checked = !!prefs.zebraAutomationEnabled;

    // Items: prefer stored, else packaged
    try{
      currentItems = Array.isArray(stored.dh_items) ? stored.dh_items : await loadPackagedItems();
      if($itemsJson) $itemsJson.value = pretty(currentItems);
      renderVisualTree();
    }catch(e){
      currentItems = [];
      if($itemsJson) $itemsJson.value = '[]';
      renderVisualTree();
    }

    // Handlers
    $('#savePrefs')?.addEventListener('click', async ()=>{
      const p = mergePrefs({
        buttonText: $buttonText?.value,
        primaryColor: $primaryColor?.value,
        offsetBottom: Number($offsetBottom?.value),
        offsetRight: Number($offsetRight?.value),
        zebraAutomationEnabled: !!$zebraAutomationEnabled?.checked
      });
      await chrome.storage.local.set({ dh_prefs: p });
      show($prefsStatus, 'Preferences saved.');
      setTimeout(()=> show($prefsStatus, ''), 1800);
    });

    $('#resetPrefs')?.addEventListener('click', async ()=>{
      await chrome.storage.local.remove('dh_prefs');
      if($buttonText) $buttonText.value = defaults.buttonText;
      if($primaryColor) $primaryColor.value = defaults.primaryColor;
      if($offsetBottom) $offsetBottom.value = String(defaults.offsetBottom);
      if($offsetRight) $offsetRight.value = String(defaults.offsetRight);
      if($zebraAutomationEnabled) $zebraAutomationEnabled.checked = !!defaults.zebraAutomationEnabled;
      show($prefsStatus, 'Preferences reset to defaults.');
      setTimeout(()=> show($prefsStatus, ''), 1800);
    });

    $('#saveItems')?.addEventListener('click', async ()=>{
      $jsonError.textContent = '';
      
      // If in JSON mode, sync to currentItems first
      const mode = document.querySelector('input[name="editorMode"]:checked').value;
      if (mode === 'json') {
        if (!syncFromJson()) return;
      }

      await chrome.storage.local.set({ dh_items: currentItems });
      show($itemsStatus, 'Items saved to local storage.');
      setTimeout(()=> show($itemsStatus, ''), 1800);
    });

    $('#clearItems')?.addEventListener('click', async ()=>{
      await chrome.storage.local.remove('dh_items');
      currentItems = await loadPackagedItems();
      syncToJson();
      renderVisualTree();
      show($itemsStatus, 'Stored items cleared. Reset to packaged defaults.');
      setTimeout(()=> show($itemsStatus, ''), 2200);
    });

    $('#loadDefault')?.addEventListener('click', async ()=>{
      currentItems = await loadPackagedItems();
      syncToJson();
      renderVisualTree();
      show($itemsStatus, 'Loaded packaged items.json. Click "Save Items" to persist.');
      setTimeout(()=> show($itemsStatus, ''), 2200);
    });

    $('#loadFromFile')?.addEventListener('click', ()=>{
      $fileInput?.click();
    });

    $fileInput?.addEventListener('change', ()=>{
      const f = $fileInput.files && $fileInput.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const text = String(reader.result || '');
          const parsed = JSON.parse(text);
          currentItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
          syncToJson();
          renderVisualTree();
          $jsonError.textContent = '';
          show($itemsStatus, 'Imported JSON. Click "Save Items" to persist.');
          setTimeout(()=> show($itemsStatus, ''), 2200);
        }catch(e){
          $jsonError.textContent = 'Invalid JSON in file: ' + e.message;
        }
      };
      reader.onerror = () => {
        $jsonError.textContent = 'Failed to read file.';
      };
      reader.readAsText(f, 'utf-8');
      $fileInput.value = '';
    });

    $('#exportItems')?.addEventListener('click', async ()=>{
      // Always export currentItems
      const text = pretty(currentItems);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'items-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Visual Editor Handlers
    $$('input[name="editorMode"]').forEach(el => {
      el.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (mode === 'visual') {
          if (syncFromJson()) {
            $('#visualEditorContainer').classList.remove('hidden');
            $('#jsonEditorContainer').classList.add('hidden');
          } else {
            // Revert toggle if JSON is invalid
            document.querySelector('input[value="json"]').checked = true;
          }
        } else {
          syncToJson();
          $('#visualEditorContainer').classList.add('hidden');
          $('#jsonEditorContainer').classList.remove('hidden');
        }
      });
    });

    $('#addRootItem')?.addEventListener('click', () => {
      openModal(null, currentItems, -1);
    });

    $('#filterInput')?.addEventListener('input', (e) => {
      filterText = e.target.value;
      renderVisualTree();
    });

    $('#sortBtn')?.addEventListener('click', () => {
      if(confirm('Sort all items alphabetically? This cannot be undone easily.')) {
        sortItemsRecursive(currentItems);
        renderVisualTree();
        syncToJson();
      }
    });

    $('#toggleCollapseBtn')?.addEventListener('click', () => {
      // If any folder is collapsed, expand all. Otherwise collapse all.
      // Actually, simpler logic: if we have any collapsed items, clear set (expand all).
      // If set is empty, find all folders and add to set (collapse all).
      // But "Collapse All" usually means hide everything.
      
      // Let's check if we have any tracked collapsed items.
      // Since WeakSet is not iterable, we can't check size easily.
      // We'll use a heuristic or just toggle based on a flag if we had one.
      // Instead, let's just implement "Collapse All" (add all folders) and "Expand All" (clear set).
      // We'll toggle the button text or just cycle.
      
      // Let's try: If button says "Collapse All", we collapse everything. Then change text to "Expand All".
      const btn = $('#toggleCollapseBtn');
      const isExpandAction = btn.textContent === 'Expand All';
      
      if (isExpandAction) {
        collapsedFolders = new WeakSet();
        btn.textContent = 'Collapse All';
      } else {
        // Add all folders to collapsed set
        function collapseRecursive(items) {
          items.forEach(item => {
            if (item.type === 'folder') {
              collapsedFolders.add(item);
              if (item.children) collapseRecursive(item.children);
            }
          });
        }
        collapseRecursive(currentItems);
        btn.textContent = 'Expand All';
      }
      renderVisualTree();
    });

    $('#itemType')?.addEventListener('change', updateModalFields);
    
    $('#cancelModal')?.addEventListener('click', () => {
      $('#itemModal').classList.add('hidden');
    });
    
    $('#saveModal')?.addEventListener('click', saveModal);
  }

  document.addEventListener('DOMContentLoaded', init);
})();