# Options hydration-window edits — design spec

**Date:** 2026-05-21
**Status:** Approved, ready for implementation plan
**Owner:** Bo (DH maintainer)
**Related work:**

- `2026-05-21` race-condition fix (commit `e9f96c9`) — introduced `prefsHydratedRef` guard that this spec extends
- `2026-05-21-prefs-context-refactor-design.md` — the larger PrefsContext refactor this spec defers
- `refactor(i18n): consume language from usePrefs hook` (commit `42cd649`) — exposed the cross-tree language-not-updating symptom that led to root-cause analysis

## 1. Problem

When the user opens the Options page, three things happen in sequence:

1. `OptionsInner` mounts with state = `DEFAULT_PREFS`
2. `chrome.storage.local.get('dh_prefs')` resolves → state merged with on-disk dh_prefs
3. `chrome.runtime.sendMessage({action: 'get_config'})` → host config.json merged → `prefsHydratedRef.current = true`

Step 3 can take **several seconds** in practice. Observed: 4.1 seconds during cold host startup with concurrent update-check (`[DH-DIAG] hydration COMPLETE (host success) at 4132 ms`). Cold start on a freshly booted machine can be longer.

During this window, any user edit to Options prefs is **silently lost**:

- `setPrefs(prev => ...)` updates React local state → UI appears to respond
- `persistPrefs` is called but guarded — early-returns with a warn, writes **neither** `chrome.storage.local` **nor** host RPC
- When step 3 fires, the host's stale value merges back into state, overwriting the user's edit
- User sees their dropdown / checkbox / text input revert with no explanation

This affects **all** persisted Options fields: language, logLevel, autoAnalyzeMode, enableStatusBubble, betaChannelEnabled, useWorkspaceOnly, teamCatalogEnabled, teamManifestUrl, team, rootPath, skillDirectories, mcpConfigPath, userInstructions, userPrompt, primaryColor, buttonText, offsetBottom, offsetRight.

The `language` field had an additional symptom — UI translations did not switch even while the dropdown value displayed the new selection — because the outer `Options` wrapper consumes `usePrefs()` which subscribes to `chrome.storage.onChanged`, and storage was never written. But this is just the most visible instance. The underlying bug is data loss across all prefs.

### Why the guard exists (don't break this)

`prefsHydratedRef` was added by the 2026-05-21 race-condition fix to prevent a worse failure mode: if `persistPrefs` ran with state still equal to DEFAULT_PREFS (empty strings for `rootPath`, `teamManifestUrl`, `team`, `userPrompt`), it would send those empty values to the host and wipe out the user's real `config.json` + `user_prompt.md` on disk. The guard's invariant is "never send DEFAULT_PREFS-shaped data to the host."

The bug this spec addresses is that the guard is **too coarse** — it correctly blocks the host RPC, but also blocks the local `chrome.storage.local.set` (which is safe) and provides no recovery path when the user edits during the window (which is the common case during cold start).

## 2. Solution overview

Split `persistPrefs` into independently-gated segments and add a `userTouchedFieldsRef` to protect in-flight user edits from being clobbered by the host hydration merge.

**Invariants preserved:**

- I1: Host config.json is never written with DEFAULT_PREFS-shaped data (the original guard's purpose)
- I2: Storage write is the source of truth for the outer `Options` wrapper's `usePrefs()` subscription — must happen synchronously with user edit for cross-tree consumers (PrefsLanguageProvider, FAB) to see changes immediately

**Invariants added:**

- I3: A user edit during the hydration window must reach both storage and host eventually. Specifically: storage immediately; host on hydration COMPLETE (catch-up RPC)
- I4: The host hydration merge must not overwrite any field the user touched during the window

## 3. Data model changes

### New ref: `userTouchedFieldsRef`

```ts
// Tracks which dh_prefs keys the user has edited during this Options
// session. Used by:
//   1. The host get_config merge — fields in this set are NOT overwritten
//      by host config values (user's in-flight edit wins)
//   2. The post-hydration catch-up RPC — non-empty set means we need to
//      push the user's window-edits to host now that the guard has opened
//
// Set semantics (not Map): we only need 'did the user touch this field',
// not 'what was the original value'. The user's current value is in prefs
// state; that's what gets sent to host on catch-up.
//
// Lifetime: lives for the Options page session. Cleared only by:
//   - handleReset (which marks ALL keys touched so the reset survives the
//     hydration merge — DEFAULT_PREFS is the user's explicit choice)
//
// We do NOT clear it on hydration COMPLETE. A user could edit a field
// AFTER hydration too; those edits don't need the merge protection
// (hydration won't fire again) but keeping them in the set is harmless
// and avoids a 'should I clear or not' race.
const userTouchedFieldsRef = useRef<Set<keyof Preferences>>(new Set());
```

## 4. Behavioral changes

### 4.1 `persistPrefs` — three segments, independently gated

Before:

```
if (!prefsHydratedRef.current) return;  // blocks everything
chrome.storage.local.set(...)
chrome.runtime.sendMessage({type: 'NATIVE_MSG', payload: buildHostConfigPayload(next)})
if (opts?.fetchManifest && URL changed) sendMessage({type: 'SYNC_TEAM_CATALOG'})
```

After:

```
// Segment 1: storage write — always runs
//   Safe because storage is just a mirror; host is source of truth.
//   Outer wrapper's usePrefs() subscribes to onChanged — this is how
//   cross-tree consumers (PrefsLanguageProvider, FAB) see edits immediately.
chrome.storage.local.set({dh_prefs: nextPrefs})

// Segment 2: host RPC — only after hydration
//   This is what the original guard was protecting. Pre-hydration writes
//   would send DEFAULT_PREFS empty values to host (the bug e9f96c9 fixed).
if (prefsHydratedRef.current) {
    chrome.runtime.sendMessage({type: 'NATIVE_MSG', payload: buildHostConfigPayload(nextPrefs)})
} else {
    // Silent — catch-up RPC at hydration COMPLETE will push these edits.
    // No console warn needed; the existing warn was useful for the
    // pre-spec investigation but produces noise during normal cold start.
}

// Segment 3: manifest fetch — only after hydration AND opts.fetchManifest AND URL changed
//   Same logic as before; manifest fetch is user-initiated and assumes
//   state is settled. Pre-hydration manifest fetch could race with the
//   host get_config response (host might send a different teamManifestUrl
//   the user has not seen yet).
if (prefsHydratedRef.current && opts?.fetchManifest && nextPrefs.teamCatalogEnabled && nextPrefs.teamManifestUrl) {
    /* existing URL-diff fetch logic */
}
```

### 4.2 Edit handlers — mark touched

Three handler patterns currently exist:

**Pattern A: `updatePref(patch)`** (selects, checkboxes, toggles — lines 1612, 1696, 1711, 1726, 1749, 1773, 1834, 1931)

```ts
const updatePref = (patch: Partial<Preferences>, opts?: { fetchManifest?: boolean }) => {
    (Object.keys(patch) as Array<keyof Preferences>).forEach(k => userTouchedFieldsRef.current.add(k));
    setPrefs(prev => {
        const next = { ...prev, ...patch };
        persistPrefs(next, opts);
        return next;
    });
};
```

**Pattern B: `handlePrefChange` + `handlePrefBlur`** (named text/number/color inputs — lines 1630, 1646, 1654, 1667, 1677)

```ts
const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    userTouchedFieldsRef.current.add(name as keyof Preferences);  // mark on every keystroke; Set is idempotent
    setPrefs(prev => ({
        ...prev,
        [name]: name.startsWith('offset') ? Number(value) : value
    }));
};

// handlePrefBlur unchanged — depends on handlePrefChange having marked the field
```

**Pattern C: inline `onChange={(e) => setPrefs(prev => ({...prev, X: e.target.value}))} onBlur={handlePrefBlur}`** (rootPath, skillDirectories, mcpConfigPath, userInstructions, userPrompt, teamManifestUrl — lines 1802, 1921, 1949, 1965, 2004, 2043)

Each of these gets the explicit field name added to touched ref inline:

```ts
onChange={(e) => {
    userTouchedFieldsRef.current.add('rootPath');
    setPrefs(prev => ({ ...prev, rootPath: e.target.value }));
}}
onBlur={handlePrefBlur}
```

Six callsites, six explicit `.add('fieldName')` lines. Alternative considered: extract a helper `markTouchedAndSet(name, value)`. Rejected — extra abstraction for six callsites, and the explicit string literal makes grep easier when debugging which fields a user touched.

### 4.3 Host hydration merge — respect touched

In the mount useEffect, the `setPrefs(prev => { ... })` callback that merges `hostConfig` into state currently does unconditional assignment per field (lines 671-740). Each field guard adds `&& !userTouchedFieldsRef.current.has('fieldName')`:

```ts
// Before
if (hostConfig.root_path && hostConfig.root_path !== prev.rootPath) {
    newPrefs.rootPath = hostConfig.root_path;
    changed = true;
}

// After
if (hostConfig.root_path && hostConfig.root_path !== prev.rootPath && !userTouchedFieldsRef.current.has('rootPath')) {
    newPrefs.rootPath = hostConfig.root_path;
    changed = true;
}
```

Applies to all ~15 field-level merge branches in the get_config handler. The extension_preferences sub-block (lines 717-740) has its own dispatch to camelCase keys (`extPrefs.auto_analyze_mode → newPrefs.autoAnalyzeMode`); guard goes on the camelCase key (the touched ref uses TypeScript `Preferences` keys, which are camelCase).

### 4.4 Catch-up RPC at hydration COMPLETE

After `prefsHydratedRef.current = true` (the success branch, line 767), if the user touched any fields during the window, send them to host now. Implementation has a subtle React batching issue we need to handle:

```ts
// Current code (simplified)
setPrefs(prev => {
    const newPrefs = mergeHostIntoState(prev, hostConfig, userTouchedFieldsRef.current);
    if (changed) chrome.storage.local.set({dh_prefs: newPrefs});
    return changed ? newPrefs : prev;
});
prefsHydratedRef.current = true;
// <-- Want to send catch-up RPC here, but prefs state is not yet committed
//     (setPrefs is async-batched). Reading `prefs` would give stale value.
```

**Solution**: capture `newPrefs` from inside the setPrefs callback into a closure variable, then use it after:

```ts
let mergedPrefs: Preferences | null = null;
setPrefs(prev => {
    const newPrefs = mergeHostIntoState(prev, hostConfig, userTouchedFieldsRef.current);
    if (changed) chrome.storage.local.set({dh_prefs: newPrefs});
    mergedPrefs = newPrefs;  // capture for catch-up
    return changed ? newPrefs : prev;
});
prefsHydratedRef.current = true;

if (userTouchedFieldsRef.current.size > 0 && mergedPrefs) {
    console.log('[DH] Hydration catch-up: pushing', userTouchedFieldsRef.current.size, 'user-touched fields to host');
    chrome.runtime.sendMessage({
        type: 'NATIVE_MSG',
        payload: buildHostConfigPayload(mergedPrefs),
    }, () => {
        if (chrome.runtime.lastError) {
            console.warn('[DH] Catch-up RPC failed:', chrome.runtime.lastError.message);
            // Fire-and-forget; storage is correct; next Options open will re-push.
        }
    });
}
```

Same catch-up logic added to the two fallback branches (`chrome.runtime.lastError` ~line 654 and non-success ~line 777). In both fallback cases the catch-up RPC will probably also fail, but it's a no-op cost when host is down — storage holds the truth, next session recovers.

### 4.5 Reset handler — mark all touched

`handleReset` (line 1021) currently:

1. Confirms with user
2. `setPrefs(DEFAULT_PREFS)`
3. `chrome.storage.local.remove([...keys])`
4. `persistPrefs(DEFAULT_PREFS)` — sends DEFAULT_PREFS to host

If reset runs during the hydration window with the new persistPrefs (segment 2 gated), the host RPC is skipped. Then host get_config returns the **real** (pre-reset) values, and without touched protection, those values would merge back into state — undoing the user's reset.

Fix: mark all `Preferences` keys as touched at reset time, so hydration merge skips all fields:

```ts
const handleReset = () => {
    if (confirm(t('resetConfirm'))) {
        // Reset is an explicit user choice — protect it from being undone
        // by a late host hydration response (covers reset-during-window case).
        (Object.keys(DEFAULT_PREFS) as Array<keyof Preferences>).forEach(
            k => userTouchedFieldsRef.current.add(k)
        );
        setPrefs(DEFAULT_PREFS);
        chrome.storage.local.remove([...]);  // existing
        // ... existing
        persistPrefs(DEFAULT_PREFS);
        // ... existing
    }
};
```

If hydration completes after reset, catch-up will push DEFAULT_PREFS to host (size > 0 because all keys are touched). This is correct — reset means "make host match defaults too."

## 5. Test matrix

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open Options, wait for hydration COMPLETE, change language dropdown | UI translations switch immediately (outer usePrefs receives onChanged). Host config.json updated within one RPC roundtrip. |
| 2 | Open Options, change language dropdown BEFORE hydration COMPLETE | UI translations switch immediately (storage write went through, outer usePrefs received onChanged). Host not updated yet. After hydration COMPLETE, catch-up RPC pushes language to host. config.json reflects user's choice. |
| 3 | Open Options, change rootPath text BEFORE hydration COMPLETE, blur out | Storage holds new rootPath. Host hydration response does NOT overwrite rootPath (touched). Catch-up pushes new rootPath. config.json reflects user's input. |
| 4 | Open Options, click Reset BEFORE hydration COMPLETE, confirm | All prefs become DEFAULT_PREFS in state + storage. Host hydration arrives — does NOT overwrite (all touched). Catch-up pushes DEFAULT_PREFS to host. config.json resets. |
| 5 | Open Options, no edits, wait for hydration COMPLETE | Storage and state populated from host. `userTouchedFieldsRef.size === 0` → no catch-up RPC fires (no noise). |
| 6 | Host is down (Chrome reports `chrome.runtime.lastError`), user makes edits | Storage writes succeed. host RPC fails silently (fire-and-forget). Next Options open: dh_prefs reloads from storage, hydration tries host again, edits push on next successful catch-up. |
| 7 | User edits language during window, then changes back to original before hydration | language stays in touched. Hydration skips it. Catch-up sends current (original) value. config.json unchanged. Slight overhead (one no-op RPC) but correct. |
| 8 | FAB open in another tab, user changes language in Options during hydration window | FAB sees storage onChanged (storage write went through pre-hydration). FAB usePrefs re-renders with new language. FAB UI translations switch. Independent of host state. |
| 9 | Hydration completes via non-success branch (`response.status !== 'success'`) | prefsHydratedRef set to true (fallback path). Catch-up runs — RPC sent to host. If host then returns success on retry, no issue. If host stays broken, storage is still correct. |

Manual verification only — no test infrastructure exists for Options.tsx integration scenarios. PageReader vitest setup is open follow-up #4.

## 6. Out of scope

- **Eliminating the hydration window itself** (proposed "fix 4" during brainstorming). Considered: skip waiting for host get_config when dh_prefs in storage is non-empty. Rejected: storage and host can diverge (user copies config.json across machines without reload, or Reset clears storage but host kept). Catching that divergence requires the merge step. Keeping the merge means keeping the window. This spec accepts the window and makes edits-during-window correct.

- **PrefsContext refactor** (`2026-05-21-prefs-context-refactor-design.md`). The larger refactor would centralize all prefs state in a single context provider and eliminate the inner-vs-outer state duplication that makes this bug possible. This spec is the tactical fix; the strategic fix remains open. Notes: if PrefsContext lands, `userTouchedFieldsRef` becomes a context field; the host merge logic moves to context reducer; persistPrefs becomes a context action. Spec defers this because the refactor is ~300 lines and the bug is shipping pain now.

- **Optimistic conflict resolution** (e.g., user changes language to `en` during window, host config has `zh`, hydration merges and the catch-up RPC tells host `en`, but what if host config changed to `de` between the time we read it and the catch-up?). Not a real scenario for DH: Options is the only mutator of config.json's `extension_preferences` block; nothing else races. If a parallel host-side process started writing config.json we'd have other problems first.

- **Telemetry on catch-up frequency**. Adding `trackEvent('hydration_catchup', { fieldCount })` would let us measure how often this code path runs in practice. Worth doing as a follow-up to validate the fix is needed, but not blocking implementation.

## 7. Files touched

Only `extension/src/components/Options.tsx`. Estimated diff size:

- +1 ref declaration (~5 lines incl. comment)
- +15 lines of `&& !userTouchedFieldsRef.current.has(...)` guards
- +6 inline `userTouchedFieldsRef.current.add('fieldName')` in Pattern C onChange handlers
- +2 lines in `updatePref` to mark patch keys
- +1 line in `handlePrefChange` to mark `name`
- +12 lines for catch-up RPC block (success branch + 2 fallback branches)
- +3 lines in `handleReset` to mark all keys
- ~20 lines net change in `persistPrefs` (rewrite for three-segment structure, mostly moving code into conditionals)
- –1 line: remove the existing `console.warn` early-return in persistPrefs (segment 2 silently skips instead)

Estimated total: **~60 lines net add**, no deletions of behavior.

## 8. Rollout

Single commit on `master`, no version bump (stays `2.0.70-beta.4`). Manual smoke test by Bo covering matrix scenarios #1, #2, #4, #5, #6 (critical path). Scenarios #3, #7, #8, #9 are nice-to-have verification.

If anything regresses, single-revert is safe — this commit doesn't touch any other file or change the on-disk format of dh_prefs / config.json.

After merge, follow-up #11 stays closed (separately landed in `42cd649`). Follow-up #7 (PrefsContext refactor) remains open and its spec gains an "after the hydration-window fix lands" prerequisite.
