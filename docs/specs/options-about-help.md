# Options About & Help

Status: Implemented. Current informational UI contract. No About-specific
preference, Host RPC, or version format is introduced.

## 1. Problem / Motivation

Options provides discoverable product documentation, release/support links, and
a log-location helper alongside current version/update information. Users do not
need to know repository paths to find these resources.

## 2. Goal

The seventh sidebar section, `about`, consolidates information and help. It is
read-only with respect to configuration: viewing it writes no preference and
does not hydrate configuration again. Its buttons can invoke existing update
requests, open links, or copy a literal path; "read-only" does not mean those
explicit actions have no effects.

## 3. Non-goals (YAGNI)

- No in-app changelog viewer, full license display, or contributor management.
- No Host "open logs folder" action or automatic log collection/upload.
- No new update coordinator or persisted About state.
- Header version/update status remains available from all tabs; it is not moved
  exclusively into About.

## 4. Design

### 4.1 Navigation

`SectionId` includes `about`. Its `data-section="about"` sidebar button follows
Bookmarks after a separator, uses the `Info` icon and `t('aboutHelp')`, and
selects the existing conditional content pane. Initial selection remains General.

### 4.2 Content blocks

**About:** localized app name and tagline; Extension version always displays,
while Host version displays only when available. Do not invent a Host version
from the Extension value.

**Updates:** Check for updates reuses `handleCheckUpdates` and `canCheckUpdates`;
the applicable update/retry action reuses `handleUpdate`, `showUpdateAction`,
and `canStartUpdate`. Header and About project the same state. A check's
initiation reply is not a discovery result and must not initiate installation.

The Service Worker is the persisted update-state authority. Manual checks are
authorized only in hydrated `idle`, `available`, or `complete`, rechecked in
its serialized path. UI does not write `dh_update_state`, reload the extension,
or declare completion independently. Completion acknowledgment requires eight
continuous foreground-visible seconds for the rendered Options completion
status, uses the exact transaction identity, and leaves state changes to the
Worker's committed broadcast. About does not create a competing acknowledgment.

**Links:** each opens with `target="_blank" rel="noopener noreferrer"`.

| Label | Destination | Icon |
|---|---|---|
| User Guide | `https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md` | `BookOpen` |
| GitHub / Releases | `https://github.com/boatmac/Dynamics-Helper/releases` | `Github` |
| Report a bug | `https://github.com/boatmac/Dynamics-Helper/issues/new` | `Bug` |

**Help:** brief timeout guidance points to General / Analyze Timeout. Host
disconnect guidance points to browser restart or repair/reinstallation; this
does not authorize mixing individual installed files or deleting update evidence.
Persistent recovery guidance requires the matching complete installer.

**Log helper:** displays `%LOCALAPPDATA%\DynamicsHelper` and identifies
`native_host.log`. Copy path copies that literal directory string, which Explorer
can expand; it does not read logs, resolve another account's profile, open a
folder, or upload evidence. Success feedback follows successful clipboard write.

**Privacy:** `t('privacyNote')` links to the User Guide's
`#security--privacy` section. The scope is Analyze payload/context and composed
Custom User Prompt redaction before send. Product Core and the selected editable
system-instruction snapshot follow their separate exact-source contract; the
short UI note is not a promise that every file or every transmitted byte is
redacted, nor that all browser/Host data is encrypted.

### 4.3 State / persistence

Active section and copy feedback are transient UI state. About adds no `prefs`
key, `chrome.storage` record, or `update_config` write. Clipboard access runs
only from the explicit click handler, with errors handled rather than showing
an unconditional success message.

Existing shared update handling may communicate with the Worker and Host. That
reuse does not weaken the hydration, update-suppression, or transaction gates.
The six Options hydration invariants remain unchanged.

### 4.4 i18n

Labels, help text, and feedback use `t()` with English and Chinese translations.
Keys include `aboutHelp`, `aboutTagline`, `checkForUpdates`, `openUserGuide`,
`viewOnGitHub`, `reportABug`, `helpTroubleshooting`, `issueTimeout`,
`issueDisconnected`, `collectLogs`, `collectLogsDesc`, `copyPath`, `copied`,
`privacyNote`, and `securityPrivacy`. Existing update strings are reused.

### 4.5 Styling

The section follows existing Options conventions: icon-bearing heading,
slate borders, teal accents, and ordinary link/button affordances. The links use
the existing responsive grid; this feature does not redesign sidebar navigation.

## 5. Testing

Existing Options coverage includes activating `data-section="about"` and showing
Extension version information. Relevant contracts also include conditional Host
version, safe external-link attributes, clipboard outcomes, and reuse of gated
update controls. These are not additional hydration invariant numbers.

Documentation-only work uses static checks and makes no new runtime verification
claim. Runtime verification requires its applicable reviewed scope.

## 6. Docs (Definition of Done)

The UI destinations above remain the product's help entry points. The
[sidebar contract](options-navigation.md) defines section
order and shared ownership. This specification defines current behavior, not a
queue of edits to other guides or a release checklist.
