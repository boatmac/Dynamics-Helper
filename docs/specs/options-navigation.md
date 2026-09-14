# Options Navigation

Status: Implemented. Current Options shell and behavior-preservation contract.

## 1. Problem

Options uses a fixed-width left sidebar and one wide content pane so configuration
editors and the bookmark tree do not compete in narrow side-by-side columns.
Navigation changes presentation, not preference ownership or persistence timing.

## 2. Design

The current sidebar is `w-52` (approximately 208 px), with a flexible `min-w-0`
content pane. Only the active section's controls render. Section selection is
transient component state and initially `general`.

| Order | Section ID | Current content |
|---|---|---|
| 1 | `general` | Auto-analyze, status bubble, beta channel, Analyze Timeout, log level |
| 2 | `appearance` | Language, FAB text/color/offsets, live preview |
| 3 | `copilot` | Root, Repository ONLY, skills, MCP, editable instructions and user prompt |
| 4 | `model` | Model, reasoning effort, context tier, catalog refresh/status |
| 5 | `team` | Catalog enable, manifest URL, team selection, sync/refresh/status |
| 6 | `bookmarks` | Personal editor plus read-only merged team view |
| 7 | `about` | Product/version information, links, help, existing update controls |

Separators precede Team Catalog and About & Help. Model & Performance is its own
tab, not embedded in Copilot. Language is in Appearance, which matters to tests
that must select that tab before querying the language control.

Navigation buttons use stable `data-section` IDs, localized `t()` labels, and
`lucide-react` icons. The active button has the established teal highlight;
inactive buttons retain the slate presentation. Separators are not sections.

## 3. Implementation approach (Options.tsx)

`OptionsInner` remains the shared owner of current preferences, refs, hydration,
catalog state, and bookmark state. Conditional section rendering does not create
independent persistence owners. Navigating away from a field does not authorize
discarding the user's intent or rerunning initial Host hydration.

The content pane gives the bookmark tree its own scrollable area. The header
continues to expose product versions and update status/actions regardless of
the active section. About provides a second presentation of existing update
requests, not a second update coordinator.

The following behavior stays independent of the shell:

- Instant persistence: selects/checkboxes/toggles on change, text/number/
  color fields on blur; there is no Save button.
- Field changes mark touched keys before hydration can merge a stale Host value.
- Preference writes use `persistPrefs` and the single-flight coalescing mirror
  queue. Host sends and carried actions wait for the successful latest commit.
- Catch-up runs through a revision-gated effect and inspected callback, never
  from a React state-updater side effect.
- Model loading is page-mount/cache-aware with explicit Refresh and visible
  classified errors; a tab switch is not a new model-request authority.
- Team sync stays Worker-owned and identity/generation-bound; URL blur validates
  before fetching, and stale cache reads cannot update the new selection.
- Personal edits use `mutatePersonalItems` and its serialized queue. Team nodes
  are read-only; the merged view must never be saved as `dh_items`.
- Reset waits for the latest mirror and matching Host durable acknowledgment
  before cleanup, never resends acknowledged defaults on cleanup retry, and
  protects newer edits.

## 4. Risks & mitigation

The durable risk is behavioral drift when controls move: a relocated handler
can lose touched marking, blur persistence, or identity checks. Review the
existing handler wiring rather than copying old illustrative implementations.

Page-level state outlives conditional fields; edits and pending operation state
must remain coherent across tabs. Layout alone is not evidence that storage or
Host persistence completed successfully.

The implementation is a desktop settings shell with a fixed sidebar, not a new
mobile-navigation system. No mobile drawer or breakpoint redesign is claimed.
Textareas and the content pane retain their existing sizing behavior.

## 5. Testing

Static review checks section IDs/order, selected-section guards, the Appearance
language control, header availability, and preserved field handler wiring.
Behavioral coverage remains in existing Options tests, including the six
hydration invariants in
[hydration §4 and §5](options-hydration.md).

Layout queries may navigate to a field's section, but the underlying assertions
must not be weakened because a control moved. Bookmark collapse, team read-only
guards, model failures, and Reset ordering remain behavioral contracts, not
visual smoke substitutes.

This document does not require a build after every section edit or authorize an
unfiltered test suite. Documentation-only maintenance uses static checks; runtime
verification requires its own applicable scope.

## 6. Scope / out of scope

The shell defines navigation and section placement. It introduces no Host RPC,
config field, storage migration, or different preference lifecycle. About's
content contract is in
[About & Help](options-about-help.md).

## 7. Compatibility

Section IDs are UI identities, not persisted preferences. Existing Host config,
prompt files, personal bookmarks, and team preferences retain their established
formats. A layout change is not permission to revert data or product behavior.
