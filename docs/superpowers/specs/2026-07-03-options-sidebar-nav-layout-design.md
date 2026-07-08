# Options page layout: sidebar-nav restructure (v2.0.74)

> Author date: 2026-07-03. Design for rebalancing the Options page from the
> current two-column (narrow config left / bookmark editor right) layout to
> a Vivaldi-style left **sidebar navigation** + wide content area. Approved
> via an interactive HTML mockup.

## 1. Problem

The Options page is a 12-column grid: config sections stacked in a narrow
`col-span-5` left column, the bookmark editor in `col-span-7` on the right.
As config grows (Model & Performance was the latest addition) the left
column gets ever taller while the right bookmark panel stays short —
visually unbalanced, and the config fields are cramped in 5/12 width
(User Instructions / User Prompt textareas, model dropdowns).

## 2. Design (approved from mockup)

**Left sidebar nav (fixed, ~208px) + right content area (fills the rest).**
Only the selected section renders in the content area, always full width.

Nav order:
1. **通用 / General** — behavior: auto-analyze, status bubble, beta channel, analyze timeout, log level, language
2. **外观设置 / Appearance** — buttonText, primaryColor, offsetBottom, offsetRight (FAB look/position) + preview
3. **Copilot 配置 / Copilot** — rootPath, useWorkspaceOnly, skillDirectories, mcpConfigPath, userInstructions, userPrompt
4. **模型与性能 / Model & Performance** — model, reasoningEffort, contextTier, refresh (its own tab, split out of Copilot)
5. *(separator)*
6. **团队目录 / Team Catalog** — teamCatalogEnabled, teamManifestUrl, team select, sync/refresh
7. **书签管理 / Bookmarks** — the existing bookmark editor (drag-drop tree), now full-width

Key wins: the nav is a fixed short list (never grows with config); content is
always comfortably wide; the bookmark tree gets full width; adding future
config = a new section, never a taller column.

## 3. Implementation approach (Options.tsx)

**This is a shell swap, NOT a logic change.** Every field's JSX, state,
hydration merge, `persistPrefs`/`updatePref` wiring, the model-list fetch,
team catalog sync, and the bookmark editor all move UNCHANGED into their
sections. Only the outer container structure changes.

1. Add `const [activeSection, setActiveSection] = useState<'general' |
   'appearance' | 'copilot' | 'model' | 'team' | 'bookmarks'>('general')`.
2. Replace the outer `grid grid-cols-1 lg:grid-cols-12` wrapper with:
   - a flex row: `<nav>` (sidebar, fixed width) + `<div>` (content, flex-1).
   - The sidebar renders the 7 nav items (icon + label from `lucide-react`
     + `t(...)`), highlighting `activeSection`, with the separator before
     Team.
3. Wrap each existing section block in `{activeSection === '<id>' && (...)}`.
   The current left-column sections (behavior, appearance, team, copilot)
   and the right-column bookmark editor are re-parented into these guards.
   **Split** the Model & Performance sub-block out of the Copilot section
   into its own `model` section.
4. Content area is a flex column with `overflow-y: auto`; the bookmarks
   section's tree flexes to fill height and scrolls (matches the mockup).
5. New i18n keys as needed for any nav labels not already present
   (`behavior`, `appearance`, `copilotConfig`, `modelPerformance`,
   `teamCatalog` mostly exist; add a `bookmarks`/`generalTab` if missing).

**Preservation checklist (must stay identical):**
- `userTouchedFieldsRef` marking on every field's onChange/onBlur.
- `prefsHydratedRef` guard + hydration merge from `get_config`.
- `persistPrefs` / `updatePref` / `handlePrefBlur` call sites.
- Model list fetch on mount + cache + refresh + error banner.
- Team catalog fetch/sync/error handling.
- Bookmark editor (dnd, add/edit/delete, collapse) and its `dh_items` write.
- Reset button behaviour.

## 4. Risks & mitigation

- **Large-file JSX surgery.** Options.tsx is ~2600 lines with deep nesting;
  moving section boundaries risks unbalanced tags. Mitigation: move one
  section at a time, `npm run build` after each move to catch JSX errors
  immediately; keep the field JSX byte-identical (only change the wrapper).
- **State that spanned both columns.** All prefs state is component-level
  (not column-scoped), so sections can render conditionally without moving
  state. Verified: no state lives inside the column divs.
- **First-render section.** Default `general` so the page opens on a
  populated tab.

## 5. Testing

- `npm run build` green after each section move + final.
- `npm run test:run` — existing Options tests (hydration invariants,
  collapse folders) must still pass; they assert behaviour, not layout, so
  they should be unaffected. If any test queried a DOM structure that moved,
  update the query (not the invariant).
- Manual smoke: each nav section renders its fields; edits persist; model
  fetch + team sync + bookmark dnd still work; Reset still clears.

## 6. Scope / out of scope

- **In:** the sidebar-nav shell + section re-parenting + Model split-out.
- **Out:** any field behaviour change, any new config, responsive/mobile
  breakpoints beyond keeping the existing `lg:` behaviour sane (the Options
  page is a desktop settings surface).

## 7. Rollback

Pure front-end restructure in one (or a few) commits. `git revert` restores
the two-column layout. No host, config, or storage changes.
