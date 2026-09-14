# Team Preferences Persistence

Status: Implemented. Current persistence contract; decision labels D1-D4 remain
stable.

## Context

`%LOCALAPPDATA%\DynamicsHelper\config.json` is the canonical backing store for
Options configuration. Browser `dh_prefs` is a local mirror used for rendering and
cross-tree subscriptions. Clearing browser storage must not require re-entering
ordinary preferences that the Host can restore.

Team fetching is an Extension concern, but that does not exclude team preferences
from Host backup/restore. The credential field has a narrower portability contract
than ordinary settings.

## Decision

### D1. Mirror team preferences

All four team preferences are mirrored:

| TypeScript `prefs` key | Host `extension_preferences` key |
|---|---|
| `teamCatalogEnabled` | `team_catalog_enabled` |
| `teamManifestUrl` | `team_manifest_url` in memory/IPC only |
| `team` | `team` |
| `teamLabel` | `team_label` |

Host is a passive holder for catalog behavior; it does not fetch team manifests
or merge bookmarks. It does encrypt/decrypt the URL at its persistence boundary.
On disk, `team_manifest_url_encrypted` replaces the plaintext field. Only that
DPAPI form is valid persisted credential data.

### D2. Establish "Options config persistence principle"

New Options preferences default to Host `extension_preferences` mirroring unless
explicitly excluded. Other existing Host settings, such as `root_path`, retain
their own established top-level schema; this contract does not relocate them.

The three exclusions are:

- `userInstructions`: separate `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
- `userPrompt`: separate `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`.
- `dh_items`: personal bookmark tree in `chrome.storage.local`, not Host config.

Instant persistence has no Save button. Selects, checkboxes, and toggles
use `updatePref` on change. Text/number/color fields update state on change and
persist on blur. Team URL blur validates before a fetch is requested.

`persistPrefs` creates immutable intents for the single-flight, coalescing
`dh_prefs` queue. Host writes and carried actions run only after the successful
latest mirror commit. Callback storage errors and Host results are inspected;
failed intent remains visibly unsaved, and session-refresh failure is distinct
from durable config-save failure.

Hydration merges only untouched fields. Pre-hydration edits can update the local
mirror but cannot send default-derived Host writes or fetch a manifest. Catch-up
uses the same queue and successful-commit callback, never a state-updater side
effect. See [hydration §4/§5](options-hydration.md).

Prompt fields are sparse writes: omitted means no write; explicit empty content
truncates the corresponding canonical markdown file. Null/non-string prompt
values fail before persistent writes. Explicit edits, clears, and Reset carry
revision/value tokens; unrelated preference updates omit both prompt fields.

Reset creates one tokenized transaction. The latest default-derived mirror and
matching Host durable acknowledgment precede Worker cleanup. Cleanup retry does
not resend acknowledged defaults; generation checks preserve newer edits.

### D3. Normalize naming to snake_case

`buildHostConfigPayload` translates camelCase preferences to Host snake_case.
The five translated preference names are:

| TypeScript preference key | Host key |
|---|---|
| `useWorkspaceOnly` | `use_workspace_only` |
| `primaryColor` | `primary_color` |
| `buttonText` | `button_text` |
| `offsetBottom` | `offset_bottom` |
| `offsetRight` | `offset_right` |

Unchanged single-word names such as `language`, `model`, and `team` follow the
same convention. TypeScript preference keys do not change to snake_case.

### D4. No backward-compat migration

The Host reader does not restore those five historical camelCase keys from
pre-normalization config. Normal field persistence writes current names; it
does not recover values already lost during an old restore. No migration script
is defined here.

## Consequences

### Positive

Ordinary preferences restore from Host config after browser-cache loss.
Team enable/selection metadata follows the same persistence policy as other
Options settings, and field naming is consistent at the Host boundary.

### Negative

1. The manifest URL is a credential, not portable backup data. DPAPI is bound to
   the Windows user/machine context; copying config to another account or machine
   cannot be advertised as restoring a usable URL. A failed decrypt leaves the
   disk blob intact on read and requires re-entry. Browser storage remains
   plaintext; the credential must not appear in diagnostics.
2. Legacy camelCase restore is intentionally unsupported for the five keys in
   D3. Normal persistence uses current values rather than reconstructing history.

### Neutral

`teamLabel` remains stored even though the flat menu does not use a team wrapper.
Catalog cache ownership stays in the Service Worker. Mirroring preferences grants
neither Options nor the Host ownership of `dh_team_items`.

## Implementation pointers

- `Options.tsx`: `buildHostConfigPayload`, hydration merge, `persistPrefs`,
  `writePrefsMirror`, and the independent Reset transaction.
- `host/dh_native_host.py`: config read/write and secret-boundary transforms.
- [Team configuration](team-catalog-configuration.md): cache
  identity, Worker ownership, and retry outcomes.
- [URL encryption](team-manifest-url-encryption.md): exact
  persisted secret schema and failure handling.

## References

`AGENTS.md` defines the durable project persistence rules. This is a current
contract, not permission to run tests, change product state, or publish a release.
