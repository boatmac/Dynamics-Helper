# Team Catalog Merge Policy: Flat Merge with Personal-Wins

Status: Implemented. Current contract for the FAB and Options bookmark views.
Catalog identity and synchronization are defined in the
[user configuration contract](team-catalog-configuration.md).

## 1. Problem

Personal and team bookmarks share one top-level menu without a synthetic team
wrapper. The merged presentation must never turn team synchronization into a
personal-data mutation or expose team entries as editable personal bookmarks.

## 2. Goals / Non-goals

### Goals

1. Personal items appear first, in their existing order; eligible team items
   follow in manifest order.
2. A team item's exact top-level label collision with any personal item removes
   that entire team item from the derived view, including all descendants.
3. Options renders the same flat merge as the FAB, but marks team items read-only
   with the lock/Team presentation. FAB does not add a source wrapper or badge.
4. Team selection and synchronization never overwrite `dh_items`.

### Non-goals (YAGNI)

There is no deep merge. If personal has `Favorite/A` and team has `Favorite/B`,
the result retains personal `Favorite/A`, not `Favorite/{A,B}`. This definition
retains the meaning of the source reference to spec §2 non-goals.

No team-wins option, sort interleaving, local team rename/delete, or per-item
override store is provided. Adding a personal item with the same exact label
hides the team item; removing that personal item reveals it again if eligible.

## 3. Design

### 3.1 Merge algorithm

`MenuLogic.ts::mergeMenus(personal, team)` is pure: construct a set of personal
top-level labels, filter team roots against it, then concatenate personal and
filtered team arrays. Matching is exact and case-sensitive; no trimming,
case-folding, descendant matching, or URL-based deduplication occurs.

Personal items always occupy the first `personal.length` slots. This preserves
personal-only index paths in the derived view. The function does not mutate
either input, persist the result, or deduplicate within either source.
Team nodes retain `source: 'team'`; missing source is treated as personal.

### 3.2 MenuLogic.ts changes

`useMenuLogic` loads personal items independently from the team cache. Team
items are eligible only when the catalog is enabled and cached manifest URL,
cached team ID, and current `dh_prefs` identity agree. A stale cache from another
URL or team is not a fallback for the current selection.

Initial and storage-change reads are generation-gated. A late read must not
replace current items or navigation with an older identity. Cache validity is
checked before calling the pure merge; `mergeMenus` itself is not an identity
validator.

### 3.3 Options bookmark manager changes

`items` remains the personal tree. `mergedItems` is a rendering projection only.
Team nodes cannot be dragged, renamed, deleted, or used as insertion targets;
guards apply in handlers as well as disabled controls. Personal mutations must
target the personal tree, not save the merged view.

All personal add/edit/delete/move/import/collapse and Reset intents use
`mutatePersonalItems` and its serialized storage queue. Failed set/remove
operations retain the newest complete intent for later retry and keep a
localized warning until a later successful mutation. Team catalog writes are
owned separately by the Service Worker.

### 3.4 No data-model changes

| Storage | Ownership |
|---|---|
| `dh_items` | Personal bookmarks, writable only through the personal queue |
| `dh_team_items` | Team cache, Service Worker mutation owner |
| `dh_prefs` | User preferences, Options mirror queue |
| `dh_team_manifest_url`, `dh_team` | Cache identity stamps, not preference authority |

`teamLabel` remains a mirrored preference for selection/restore parity. It is
not a wrapper-folder label, and this contract does not remove it.

### 3.5 Edge cases

| Scenario | Rendered result |
|---|---|
| Catalog off | Personal only, even if team cache exists |
| Missing URL or unconfigured team with no valid matching cache | Personal only |
| Fetch fails for current identity | Matching last-known-good cache may remain visible |
| URL/team identity differs from cache | Old team items are not rendered |
| Seven personal and seven team roots, no collision | Fourteen roots, personal first |
| One exact root-label collision in that example | Thirteen roots; whole colliding team subtree omitted |
| Personal storage explicitly contains `[]` | No packaged-default replacement; eligible team items still merge |

### 3.6 Code changes by file

Current owners: `MenuLogic.ts` defines merge and FAB cache eligibility;
`Options.tsx` owns the read-only editor projection and personal mutation queue;
`teamCatalog.ts` supplies serialized identity-bound cache operations to the
Service Worker. Host configuration mirroring does not perform a menu merge.

### 3.7 Telemetry

The merge itself emits no event and performs no I/O. Catalog diagnostics must
not disclose manifest/bookmark URLs, query strings, SAS credentials, or thrown
objects that could contain those values.

## 4. Testing

Regression coverage concerns order, exact label collision, subtree omission,
read-only team targets, personal path stability, identity changes during reads,
and failed personal persistence. Toggling or switching teams must leave the
personal tree unchanged. Existing Extension test infrastructure is applicable;
this is not a manual-only feature.

These are behavioral assertions, not an instruction to execute a suite during
documentation cleanup. No runtime verification result is claimed here.
