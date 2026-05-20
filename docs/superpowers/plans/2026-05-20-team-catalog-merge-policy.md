# Team Catalog Merge Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flat-merge personal + team bookmarks at the top level (no wrapper folder), personal wins on label collisions, with team items shown read-only in the Options bookmark manager.

**Architecture:** A pure `mergeMenus(personal, team)` helper drops team items whose top-level label collides with any personal label, then appends survivors to personal's end. MenuLogic (FAB) and Options (manager UI) both consume this merged view. Personal items always occupy the merged array's first N slots, so existing path-based mutation handlers (`setItems(prev => updateItemAt(path, ...))`) keep working unchanged - they target personal-only state by array index, and personal indices in merged === personal indices in personal-only. Team items can never be mutation targets (existing `isTeamItem` ternary in renderRow already renders Lock + 'Team' badge in place of edit/add/delete buttons). One drop-target guard on `moveItem` prevents drag-drop from landing on a team item.

**Tech Stack:** TypeScript / React 19 / Vite. No backend / Python changes.

**Spec:** `docs/superpowers/specs/2026-05-20-team-catalog-merge-policy-design.md`

**Repo conventions:**
- Extension build: `cd extension && npm run build` (outputs to `extension/dist/`)
- After every commit, working tree clean
- One commit per task
- Extension has no automated test infrastructure - verification is manual

---

## File Structure

| File | Responsibility |
|---|---|
| `extension/src/components/MenuLogic.ts` | Add module-scope `mergeMenus(personal, team): MenuItem[]` pure helper. Rewrite `loadItems()` to call mergeMenus instead of wrapping team in a folder. Stop reading `teamLabel`. |
| `extension/src/components/Options.tsx` | Subscribe to `dh_team_items` via existing storage listener (already listens to it for FAB sync via MenuLogic — Options needs its own subscription). Add `teamItems` state, computed `mergedItems` via useMemo. Render `mergedItems` instead of `items` at line 1715. Pass `items.length` (personal-only) into `EmptyDropZone` so drop-zone math stays personal-only. Guard `moveItem` against drop paths that land on team items. |
| `host/*.py` | UNTOUCHED. |

Out of scope per spec § 2: deep merge of same-label folders, local editing of team items, per-item override / hide, FAB visual distinction for team items.

---

## Tasks

### Task 1: Add `mergeMenus` helper + rewrite MenuLogic flat merge

**Files:**
- Modify: `extension/src/components/MenuLogic.ts`

- [ ] **Step 1: Read current `loadItems()` to anchor the changes**

```powershell
Get-Content extension/src/components/MenuLogic.ts | Select-Object -Skip 69 -First 76
```

Expected: shows current `loadItems()` (lines 70-144 pre-edit). The block to replace starts at line 112 with `// 2. Load team items from cache` and ends at line 143 (the `return personalItems` at the end of step 3).

- [ ] **Step 2: Add `mergeMenus` helper at module scope**

Open `extension/src/components/MenuLogic.ts`. Below the `MenuItem` interface definition (around line 16) and above `useMenuLogic` (around line 18), add:

```typescript
/**
 * Flat-merge personal and team items at the top level.
 *
 * Order: personal first (preserves user order), then team items in their
 * manifest order. Team items whose top-level label matches any personal
 * item's top-level label are dropped entirely (including their subtree).
 * No deep merge - if both have a "Favorite" folder, the team's Favorite
 * and all its children are silently omitted (per spec § 2 non-goals).
 *
 * Important invariant: personal items always occupy the first
 * `personal.length` slots of the result. Callers that index into the
 * merged array using personal-only paths (e.g. setItems(prev =>
 * updateItemAt(path, ...))) remain correct without translation.
 *
 * Pure function: no I/O, no side effects.
 */
export function mergeMenus(personal: MenuItem[], team: MenuItem[]): MenuItem[] {
    const personalLabels = new Set(personal.map(item => item.label));
    const teamFiltered = team.filter(item => !personalLabels.has(item.label));
    return [...personal, ...teamFiltered];
}
```

- [ ] **Step 3: Replace the team-folder block in `loadItems()`**

Find the block (currently lines 112-143):

```typescript
    // 2. Load team items from cache
    let teamFolder: MenuItem | null = null;
    try {
        if (chrome?.storage?.local) {
            const teamData = await new Promise<any>((resolve) => {
                chrome.storage.local.get(['dh_team_items', 'dh_prefs'], resolve);
            });
            // Respect the team-catalog toggle: when disabled, do not surface
            // cached team data in the FAB even if dh_team_items still exists.
            // Spec 2026-05-20-team-catalog-user-config-design.md  3.7:
            // "Disabling the toggle hides team data ... but does not delete
            //  the local cache - turning it back on restores your previous
            //  selection."
            const enabled = teamData.dh_prefs?.teamCatalogEnabled === true;
            if (enabled && Array.isArray(teamData.dh_team_items) && teamData.dh_team_items.length > 0) {
                const teamLabel = teamData.dh_prefs?.teamLabel || 'Team';
                teamFolder = {
                    type: 'folder',
                    label: teamLabel,
                    icon: 'building',
                    source: 'team',
                    children: teamData.dh_team_items,
                };
            }
        }
    } catch (_) { }

    // 3. Merge: team folder first, then personal items
    if (teamFolder) {
        return [teamFolder, ...personalItems];
    }
    return personalItems;
```

Replace with:

```typescript
    // 2. Load team items from cache
    let teamItems: MenuItem[] = [];
    try {
        if (chrome?.storage?.local) {
            const teamData = await new Promise<any>((resolve) => {
                chrome.storage.local.get(['dh_team_items', 'dh_prefs'], resolve);
            });
            // Respect the team-catalog toggle: when disabled, do not surface
            // cached team data in the FAB even if dh_team_items still exists.
            // Spec 2026-05-20-team-catalog-user-config-design.md § 3.7.
            const enabled = teamData.dh_prefs?.teamCatalogEnabled === true;
            if (enabled && Array.isArray(teamData.dh_team_items)) {
                teamItems = teamData.dh_team_items;
            }
        }
    } catch (_) { }

    // 3. Flat-merge: personal first, team appended, label collisions
    // resolved by personal-wins (team's same-label item dropped entirely).
    // See mergeMenus() docstring + spec § 3.1.
    return mergeMenus(personalItems, teamItems);
```

Note the changes:
- `teamFolder` (the wrapper `MenuItem`) is gone.
- `teamLabel` is no longer read (dead field; cleanup deferred per spec § 6).
- The `length > 0` check is gone too — `mergeMenus(personal, [])` correctly returns personal items, so no special case needed.

- [ ] **Step 4: Build**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build. No TypeScript errors.

- [ ] **Step 5: Commit**

```powershell
git add extension/src/components/MenuLogic.ts
git commit -m "feat(extension): flat-merge team items into FAB top level

Drops the wrapper folder design (user reported it felt like an
extra navigation step instead of additional bookmarks). Team items
now appear at the top level of the FAB intermixed with personal
items.

Adds module-scope mergeMenus(personal, team) helper with the
personal-wins-on-label-collision semantic from spec § 3.1. Pure
function, no I/O. Personal items always occupy the first
personal.length slots of the merged result - existing path-based
mutation handlers in Options.tsx do not need translation because
their indices into personal-only state remain valid.

The dh_prefs.teamLabel pref is no longer read; cleanup deferred."
```

---

### Task 2: Render merged view in Options bookmark manager

**Files:**
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Find the existing `teamItems` state and `renderList(items)` site**

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "useState<MenuItem\[\]>\(\[\]\)|renderList\(items\)" | Select-Object LineNumber, Line
```

Expected: matches at line 520 (`teamItems` state) and line 1715 (`renderList(items)`).

- [ ] **Step 2: Verify the existing storage listener already covers `dh_team_items`**

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "dh_team_items" | Select-Object LineNumber, Line | Select-Object -First 5
```

Expected: includes a line around 672 where `chrome.storage.local.get(['dh_team_synced', 'dh_team_items'], ...)` reads it into state on mount. Confirms `teamItems` state IS populated.

- [ ] **Step 3: Add `mergeMenus` import and `mergedItems` derived state**

At the top of `Options.tsx`, find the existing import from `./MenuLogic`:

```typescript
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';
```

Replace with:

```typescript
import { useMenuLogic, MenuItem, resolveDynamicUrl, mergeMenus } from './MenuLogic';
```

Then locate the line where the component's main return JSX starts (search for `<DndProvider`). Just before that return, add a `useMemo` to compute the merged view. The exact insertion point: find the closing `};` of the most recent `useEffect` or callback before `return (`. Add this block:

```typescript
    // Merged view for the bookmark manager. Personal items are editable;
    // team items render with a Lock icon (existing isTeamItem branch in
    // renderRow at line ~419) and cannot be dragged (canDrag: !isTeamItem
    // at line ~259). Personal items always occupy the first items.length
    // slots so path-based handlers (setItems(prev => updateItemAt(...)))
    // remain correct without translation.
    // Spec § 3.3 / § 3.5.
    const mergedItems = React.useMemo(() => {
        const teamCatalogEnabled = prefs.teamCatalogEnabled === true;
        if (!teamCatalogEnabled || !Array.isArray(teamItems) || teamItems.length === 0) {
            return items;
        }
        return mergeMenus(items, teamItems);
    }, [items, teamItems, prefs.teamCatalogEnabled]);
```

If `React` is not imported as default (only specific hooks are imported like `import { useState, useEffect, useRef } from 'react'`), add `useMemo` to the destructured import:

```typescript
import React, { useState, useEffect, useRef, useMemo } from 'react';
```

then use `useMemo(...)` directly instead of `React.useMemo(...)`. Check the existing import line and adapt.

- [ ] **Step 4: Switch the render call to `mergedItems`**

Find line 1715:

```typescript
{renderList(items)}
```

Replace with:

```typescript
{renderList(mergedItems)}
```

The `items.length === 0` check at line 1705 stays on `items` (personal-only) — that "no bookmarks" empty state is meant to prompt the user to start adding personal bookmarks, not be hidden by team items.

`EmptyDropZone` at line 1717 keeps `items.length` (personal-only) so that dropping at the very end of the list lands in personal slot N (== items.length), not in the team-items region.

- [ ] **Step 5: Guard `moveItem` against drop targets on team items**

Find the `moveItem` function definition (around line 1008):

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "const moveItem" | Select-Object LineNumber, Line
```

Read the function body to understand its shape. The guard goes at the very top of `moveItem`. Add:

```typescript
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
        // ... existing moveItem body unchanged
```

(Paste the existing body after the guard. Do not modify the rest of the function.)

- [ ] **Step 6: Build and visually verify**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build.

Deploy to prod and reload Edge extension:

```powershell
$src = (Resolve-Path "extension/dist").Path
$dst = "$env:LOCALAPPDATA\DynamicsHelper\extension"
robocopy "$src" "$dst" /MIR /NFL /NDL /NJH /NJS /NP /NC /NS 2>&1 | Out-Null
"deployed"
```

- [ ] **Step 7: Commit**

```powershell
git add extension/src/components/Options.tsx
git commit -m "feat(extension): merge team items into Options bookmark manager

The manager now renders the same merged view as the FAB: personal
items first, then team items appended (personal-wins on label
collisions). Team items render with the existing Lock icon and
'Team' badge in place of edit/add/delete buttons (renderRow at
line ~419) and cannot be dragged (canDrag: !isTeamItem at line
~259) - both pre-existing.

mergedItems is computed via useMemo from (items, teamItems,
prefs.teamCatalogEnabled). When the toggle is off or no team data
is cached, mergedItems === items so the manager looks exactly like
before.

EmptyDropZone receives items.length (personal-only) so dropping
at the bottom lands after the last personal item, not somewhere
in the team region.

moveItem gets a defensive guard: if hoverPath[0] >= items.length
(i.e. drop target is in the team region), the move is ignored
with a console.warn. canDrop on team rows is the primary defense
(via canDrag: !isTeamItem); this guard catches edge cases where
React-DnD might still produce such a path."
```

---

### Task 3: Manual end-to-end verification

**Files:** none modified.

The plan deliberately uses manual verification (extension has no
automated test infra). Each scenario maps to a spec § 4 case.

- [ ] **Step 1: Toggle OFF baseline**

In Edge: `edge://extensions` → Dynamics Helper → Reload.

Open Options → toggle Team Catalog OFF if it's not already. Save Changes.

Expected:
- Options bookmark manager shows only personal items (count matches before-toggle-was-introduced).
- FAB shows only personal items.

- [ ] **Step 2: Toggle ON, team selected, no label collision**

Toggle ON. Confirm Manifest URL is set + team selected. Click Refresh if `dh_team_items` is empty.

Pick a team whose bookmarks have NO label that matches any personal top-level item. (If unsure, temporarily rename one of your personal top-level items to ensure uniqueness.)

Expected:
- FAB top level shows `personal_count + team_count` items. Personal first.
- Options manager shows the same count. Team items have lock icon + "Team" badge instead of edit/delete buttons.

- [ ] **Step 3: Toggle ON, team selected, with label collision**

Add a personal top-level item with the exact label of a team top-level item. Save Changes.

Expected:
- FAB count drops by 1 (the team item that now collides is hidden).
- Options manager shows the same drop.
- The team item's subtree is gone entirely from the FAB (no merged children, no rename).

Delete the colliding personal item. Save.

Expected: the team item re-appears.

- [ ] **Step 4: Drag-drop within personal items**

In Options manager, drag a personal item to a new position among other personal items.

Expected: drop succeeds. Reordering reflects in Save Changes → FAB after reload.

- [ ] **Step 5: Drag-drop attempts on team items**

Try to drag a team item.

Expected: cursor shows not-allowed; no drag starts (`canDrag: !isTeamItem` at line ~259 blocks this).

Try to drop a personal item onto a team item region.

Expected: drop is ignored. Open Edge DevTools → Console for the extension's Options tab. Should see `[Options] moveItem ignored: hover path targets team region` warning.

- [ ] **Step 6: Toggle OFF after configured**

Toggle OFF, Save.

Expected:
- Options manager reverts to personal-only view (team items gone).
- FAB reverts to personal-only.
- Storage cache (dh_team_items) preserved — verify via SW Console: `chrome.storage.local.get(['dh_team_items'], r => console.log('preserved:', Array.isArray(r.dh_team_items) && r.dh_team_items.length > 0))`. Expected: `preserved: true`.

- [ ] **Step 7: Toggle ON again**

Toggle ON, Save.

Expected: team items reappear in both FAB and Options manager. No re-fetch needed (uses cached data).

- [ ] **Step 8: No commit needed (verification only)**

---

### Task 4: Final cross-check

**Files:** none modified.

- [ ] **Step 1: Build clean**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean.

- [ ] **Step 2: Working tree + commits**

```powershell
git status
git log --oneline -5
```

Expected: clean tree, 3 new commits (Task 1, Task 2, Task 4 doesn't commit).

- [ ] **Step 3: Confirm host untouched**

```powershell
git diff <plan-start-sha>..HEAD --stat -- host/
```

Expected: empty output. If anything in `host/` appears, something's wrong.

- [ ] **Step 4: Confirm no remaining `teamFolder` references**

```powershell
Get-ChildItem extension/src -Recurse -Include "*.ts","*.tsx" | Select-String "teamFolder"
```

Expected: zero matches.

- [ ] **Step 5: Confirm `mergeMenus` is exported and used**

```powershell
Get-ChildItem extension/src -Recurse -Include "*.ts","*.tsx" | Select-String "mergeMenus"
```

Expected: 3+ matches (definition in MenuLogic.ts, usage in MenuLogic.ts loadItems, import + usage in Options.tsx).

---

## Self-Review

(Reviewer applied per writing-plans skill.)

**Spec coverage:**

| Spec section | Implemented in task |
|---|---|
| § 2 Goal 1: FAB flat merge, no wrapper | Task 1 (loadItems rewrite) |
| § 2 Goal 2: Options shows merged view, team read-only | Task 2 (mergedItems + render switch) |
| § 2 Goal 3: personal-wins on label collision | Task 1 (mergeMenus algorithm) |
| § 2 Goal 4: switching team doesn't touch personal | Existing storage separation - no code change needed |
| § 2 Non-goals: deep merge / local edit / FAB visual distinction | Task 1 algorithm only does top-level label filter (no recurse); Task 2 reuses existing Lock-icon ternary; no FAB visual change |
| § 3.1 Merge algorithm | Task 1 step 2 (mergeMenus body) |
| § 3.2 MenuLogic changes | Task 1 |
| § 3.3 Options changes (mergedItems via useMemo) | Task 2 step 3 + 4 |
| § 3.4 Storage model unchanged | Verified by absence of storage-touching tasks |
| § 3.5 Edge cases | Task 3 steps 1-7 each map to a § 3.5 scenario |
| § 3.6 Per-file changes | File Structure table at top of plan |
| § 3.7 Telemetry (no new events) | No task — by absence |

**Placeholder scan:** none. Every step has either code blocks (for code changes) or exact commands (for verification).

**Type consistency:**
- `mergeMenus(personal: MenuItem[], team: MenuItem[]): MenuItem[]` — same signature in Task 1 (definition) and Task 2 (call site via import).
- `MenuItem` interface unchanged (the existing `source?: 'team' | 'personal'` field is what isTeamItem checks).
- `mergedItems` is local-component state in Options.tsx, named consistently across Task 2 step 3 (definition) and step 4 (consumer).

**Plan-specific gates:**
- Each file has one clear responsibility (MenuLogic = data assembly, Options = UI rendering, host = untouched).
- mergeMenus is module-scope and testable in isolation (pure function with no I/O).
- Task 1 + Task 2 are independent commits — Task 1 alone changes FAB behaviour; Task 2 alone (without Task 1) would not compile because mergeMenus wouldn't exist yet. Order matters; the plan order respects this.
- No restructuring beyond what the spec asked for. teamLabel cleanup is explicitly deferred (Task 1 step 3 comment + spec § 6).

---

## Notes for the executor

- Extension has no automated test infra. Task 3 is the verification gate; do not skip.
- Host code (`host/`) is NOT touched. If you find yourself editing `host/*.py`, stop and re-read the plan.
- The `source: 'team' | 'personal'` field on MenuItem was added in an earlier commit and is set by `stampTeamSource()` in teamCatalog.ts. Personal items have `source: undefined` (the existing isTeamItem check works because `undefined === 'team'` is false). Do not initialize personal items with `source: 'personal'` explicitly — keep the existing pattern.
- The `moveItem` guard in Task 2 step 5 is "defense in depth". The primary defense is `canDrag: !isTeamItem` which prevents team items from being drag sources, and the lock-icon ternary which means team rows don't expose drop affordances. The guard catches the edge case where React-DnD might still surface a hover path covering a team row.
- `setItems(collapseFolders(loadedItems))` at line 673 is the Options-side personal-items loader; it has its OWN `loadedItems` variable (unrelated to MenuLogic.loadItems). Options never reads `dh_team_items` into the editable `items` state — team items only enter the merged view through `teamItems` state + the `mergedItems` useMemo from Task 2. Personal `items` state stays personal-only at all times.
