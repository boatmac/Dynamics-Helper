# Team Catalog Merge Policy: Flat Merge with Personal-Wins

> Status: spec drafted 2026-05-20.
> Builds on `docs/superpowers/specs/2026-05-20-team-catalog-user-config-design.md`.
> Implementation will follow via writing-plans after user approves.

## 1. Problem

After end-to-end verification of the team-catalog user-config feature
(spec from earlier today), four UX issues surfaced that all stem from
one architectural decision: the original design put team bookmarks
**inside a wrapper folder** at the top of the menu, treating the team
as a distinct "source" the user navigates into.

User's observed problems:

1. **Wrapper folder is undesired.** Team items appear under a "Data and
   AI PoD Team" parent folder in the FAB. The user wants team items
   merged into the top-level menu, indistinguishable in position from
   personal items.
2. **Options bookmark manager doesn't show team items at all.** Only
   personal `dh_items` are rendered there. FAB shows N items, Options
   shows N-7. Inconsistent.
3. **No personal/team conflict resolution.** If both personal and team
   have a "Favorite" folder at the top level, the wrapper-folder design
   sidesteps the question (they coexist at different paths). A flat
   merge makes the collision visible and must be handled.
4. **Team switch is immediate.** Picking from the dropdown synchronously
   fetches and overwrites `dh_team_items`. The user feared this could
   destroy personal data — but in practice personal items are in a
   separate storage key (`dh_items`) and are never touched. The fear is
   based on the wrapper-folder visual model where "team data" appears
   to occupy a slot in the menu.

All four reduce to the same fix: **merge personal + team menus at the
top level, with personal winning on label collisions**, applied
consistently in both FAB and Options UI.

## 2. Goals / Non-goals

### Goals

1. FAB renders team items at the top level, intermixed with personal
   items, with no wrapper folder.
2. Options bookmark manager renders the same merged view; team items
   are visibly distinguished (lock icon / dimmed) and not editable
   (no drag, no rename, no delete from the Options UI).
3. When personal and team have a top-level item with the same label,
   the personal one wins. The team's entire same-name subtree is
   dropped (no deep merge — see § 2 non-goals).
4. Switching teams remains immediate (no behavioural change). Personal
   data (`dh_items`) is never touched by team operations — the existing
   storage separation already guarantees this.

### Non-goals (YAGNI)

- **Deep merge of same-label folders.** If personal has `Favorite/A`
  and team has `Favorite/B`, we do NOT produce `Favorite/{A, B}`. The
  whole team `Favorite` subtree is dropped. Reasoning: deep merge raises
  ordering, duplicate-handling, and cycle-detection questions that are
  not worth the complexity for current scale (single team, ~7 top-level
  items). Revisit if a real conflict pattern emerges.
- **Editing team items locally.** Team items are pure read-through from
  the manifest URL. To customize, the user works with their team admin
  (manifest source).
- **Per-item override / hide.** The collision rule already lets a user
  hide a team item by adding a personal item with the same label, which
  is a serviceable workaround.
- **Visual distinction in the FAB itself.** Team items in the FAB look
  identical to personal items (the spec § 2.1 above is explicit about
  "indistinguishable in position"). Lock-icon / "Team" badge only
  appears in the Options manager where edit affordances would otherwise
  exist.

## 3. Design

### 3.1 Merge algorithm

```typescript
function mergeMenus(personal: MenuItem[], team: MenuItem[]): MenuItem[] {
    const personalLabels = new Set(personal.map(item => item.label));
    const teamFiltered = team.filter(item => !personalLabels.has(item.label));
    return [...personal, ...teamFiltered];
}
```

Key properties:

- **Order**: personal items first (preserves their existing order), team
  items appended after personal in their manifest order.
- **Conflict resolution**: top-level label match — team item dropped
  entirely. No partial / deep merge.
- **`source` field preserved**: team items in the merged result still
  carry `source: 'team'`; personal items carry `source: 'personal'` (or
  `undefined` — both are treated as personal in UI).
- **Pure function**: no I/O, no side effects, easy to unit test (if we
  ever add test infra — see follow-up in beta-channel plan).

### 3.2 MenuLogic.ts changes

Current behaviour (`buildMenu`, after Task 6's commit `383082f`):

```typescript
// 2. Load team items from cache
let teamFolder: MenuItem | null = null;
if (Array.isArray(teamData.dh_team_items) && teamData.dh_team_items.length > 0) {
    const teamLabel = teamData.dh_prefs?.teamLabel || 'Team';
    teamFolder = {
        type: 'folder', label: teamLabel, icon: 'building',
        source: 'team', children: teamData.dh_team_items,
    };
}
// 3. Merge
if (teamFolder) return [teamFolder, ...personalItems];
return personalItems;
```

Becomes:

```typescript
// 2. Load team items from cache
const teamItems: MenuItem[] = Array.isArray(teamData.dh_team_items)
    ? teamData.dh_team_items
    : [];
const teamCatalogEnabled = teamData.dh_prefs?.teamCatalogEnabled === true;

// 3. Merge: personal-first, team appended; team items with a label
// matching any personal item's top-level label are dropped (personal wins).
if (teamCatalogEnabled && teamItems.length > 0) {
    return mergeMenus(personalItems, teamItems);
}
return personalItems;
```

`teamLabel` is no longer used and the existing pref `teamLabel` (stored
in `dh_prefs`) becomes dead. Leave it in storage for now (no migration
cost); remove the write site in `handleTeamChange` (Options.tsx).

### 3.3 Options bookmark manager changes

Current behaviour: `items` state holds personal items only (read from
`chrome.storage.local.dh_items`). The book manager component renders
`items` directly.

The existing code already supports `source === 'team'` checks for
read-only rendering (Options.tsx:246 `isTeamItem`, 255 `canDrag:
!isTeamItem`, 415-417 lock icon + 'Team' label). These were written for
the old wrapper-folder design (team items appeared under the wrapper).
They will work as-is for the flat-merged view — we just need to feed
the manager a merged item list.

Changes:

- Compute a **derived merged view** for rendering:
  ```typescript
  const mergedItems = useMemo(() => {
      if (!prefs.teamCatalogEnabled || !Array.isArray(teamItems) || teamItems.length === 0) {
          return items;
      }
      return mergeMenus(items, teamItems);
  }, [items, teamItems, prefs.teamCatalogEnabled]);
  ```
- Pass `mergedItems` to the rendering tree instead of `items`.
- **Mutations (add/edit/delete/reorder) still target `items` only.**
  The existing handlers (line 246-255 et al.) already check
  `isTeamItem` and bail. The new risk is that a personal-item handler
  could accidentally see team items in the `mergedItems` array and try
  to mutate them by index — verify all handler call paths use the
  item's own identity (label or generated ID) not array index.

### 3.4 No data-model changes

Storage stays the same:

- `dh_items` — personal items, full read/write
- `dh_team_items` — team items, populated by `syncTeamBookmarks`
- `dh_prefs.teamCatalogEnabled`, `dh_prefs.teamManifestUrl`,
  `dh_prefs.team` — preferences (unchanged)
- `dh_prefs.teamLabel` — **no longer read by render code** but still
  written by `handleTeamChange`. Future cleanup; not in this scope.

### 3.5 Edge cases

| Scenario | Behaviour |
|---|---|
| Toggle OFF | `mergeMenus` not invoked; only personal items render. (Existing behaviour from earlier spec; preserved.) |
| Toggle ON, no manifest URL | Only personal items render (`teamItems` is empty). |
| Toggle ON, manifest URL but team not selected | Only personal items render (`teamItems` is empty). |
| Toggle ON, team selected, fetch failed | `teamItems` is whatever was last cached. If never cached, empty. Render falls back to personal-only. No error in the FAB (errors stay in Options' Refresh status row). |
| Personal has 7 items + team has 7 items, no collisions | FAB shows 14 items at top level: 7 personal first, then 7 team. |
| Personal has "Favorite" + team has "Favorite" | FAB shows 7 + 6 = 13 items (team "Favorite" dropped entirely, including its subtree). |
| User adds a personal item with the exact label of a team item | After save, that team item disappears from FAB and Options (personal-wins). To "un-hide" the team item, user deletes the personal item with that label. |

### 3.6 Code changes by file

| File | Changes |
|---|---|
| `extension/src/components/MenuLogic.ts` | Add `mergeMenus(personal, team)` helper at module scope. Replace the `teamFolder` block with flat merge per § 3.2. Stop reading `teamLabel`. |
| `extension/src/components/Options.tsx` | Add `mergedItems` derived state via `useMemo`. Render `mergedItems` instead of `items` in the bookmark manager UI. Verify no mutation handler indexes into the merged array (each must target `items` by identity). Optionally drop the `teamLabel` write in `handleTeamChange`. |
| `extension/src/utils/translations.ts` | No new strings — the existing `Lock`/`Team` UI already has its label per Options.tsx:417. |
| `host/*.py` | UNTOUCHED. Team merge is a pure extension concern. |

### 3.7 Telemetry

No new events. The merge happens client-side at render; counting how
many team items got dropped by personal collisions would be useful
adoption signal but is out of scope for this spec.

## 4. Testing

Manual verification (extension has no automated test infra):

1. **Toggle OFF baseline**: FAB shows personal items only, no merge.
2. **Toggle ON, no team**: FAB shows personal items only.
3. **Toggle ON, team selected, no label collision**: FAB shows
   `personal_count + team_count` items at top level. Inspect order:
   personal first, team second.
4. **Toggle ON, team selected, one label collision** (e.g. both have a
   "Favorite" folder): FAB shows `personal_count + team_count - 1`
   items. The team's "Favorite" subtree is absent.
5. **Options manager view**: same item count as FAB. Team items have
   the lock icon and "Team" label visible. Drag attempts on team items
   do nothing. Edit/delete options not shown for team items.
6. **Add a personal item with a team item's label**: after Save Changes,
   FAB count drops by 1 (the team item that now collides is hidden).
   Delete that personal item: team item re-appears.
7. **Switch team**: dropdown change triggers Refresh → new `dh_team_items`
   → FAB re-renders with new merge. Personal items unchanged in storage
   AND in the rendered list (verify by checking a known personal item
   stayed in the same position).
8. **Toggle OFF after team configured**: team items disappear from FAB
   and Options manager. Personal items unchanged.

## 5. Rollout

Ships in the same release cycle as the user-config feature
(v2.0.70-beta.3 prerelease, then v2.0.71 stable). No staged rollout —
the change is small and the data model is unchanged.

## 6. Open questions / deferred

- **Sort interleaving**: should team items respect a position hint
  from the manifest (e.g. `position: 'top' | 'bottom'`)? Today team
  appends after personal unconditionally. Defer until requested.
- **Personal-wins versus team-wins**: hard-coded personal-wins. A
  per-user preference could let "team admin" users prefer team-wins.
  YAGNI for now.
- **Cleanup of dead `teamLabel` pref**: minor migration task; defer.
