(function(){
  const $ = (sel) => document.querySelector(sel);

  const defaults = {
    buttonText: 'DH',
    primaryColor: '#2563eb',
    offsetBottom: 24,
    offsetRight: 24,
    zebraAutomationEnabled: true
  };

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
      const items = Array.isArray(stored.dh_items) ? stored.dh_items : await loadPackagedItems();
      if($itemsJson) $itemsJson.value = pretty(items);
    }catch(e){
      if($itemsJson) $itemsJson.value = '[]';
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
      let parsed;
      try{
        parsed = JSON.parse($itemsJson?.value || '[]');
        if(!Array.isArray(parsed)){
          if(parsed && Array.isArray(parsed.items)) parsed = parsed.items; else throw new Error('Root JSON must be an array or an object with .items array');
        }
      }catch(e){
        $jsonError.textContent = 'Invalid JSON: ' + e.message;
        return;
      }
      await chrome.storage.local.set({ dh_items: parsed });
      show($itemsStatus, 'Items saved to local storage.');
      setTimeout(()=> show($itemsStatus, ''), 1800);
    });

    $('#clearItems')?.addEventListener('click', async ()=>{
      await chrome.storage.local.remove('dh_items');
      show($itemsStatus, 'Stored items cleared. The extension will fall back to packaged items.json.');
      setTimeout(()=> show($itemsStatus, ''), 2200);
    });

    $('#loadDefault')?.addEventListener('click', async ()=>{
      const arr = await loadPackagedItems();
      $itemsJson.value = pretty(arr);
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
          const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
          $itemsJson.value = pretty(arr);
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
      // Clear input so user can reselect same file if needed
      $fileInput.value = '';
    });

    $('#exportItems')?.addEventListener('click', async ()=>{
      // Try to use current textarea content if valid, else fallback to stored
      let text = $itemsJson?.value || '';
      try { JSON.parse(text); } catch { 
        const stored2 = await chrome.storage.local.get('dh_items');
        text = pretty(Array.isArray(stored2.dh_items) ? stored2.dh_items : []);
      }
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
