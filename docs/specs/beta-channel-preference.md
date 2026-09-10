# Beta Channel Preference

Status: Implemented. Current contract; this is not an implementation queue.

## 1. Problem

Stable-only discovery hides prereleases. The implemented opt-in lets users
receive beta candidates without changing the default stable channel.

## 2. Goals / Non-goals

- A single checkbox controls whether discovery includes prereleases.
- Default is `false`; absent or unreadable Host configuration uses stable-only
  discovery.
- Disabling the checkbox does not downgrade an installed beta. Only a strictly
  newer eligible release is offered.
- No alpha/nightly channel selector or version pinning is defined here.
- Channel selection does not authorize installation or bypass update integrity,
  capability, transaction, or recovery checks.

## 3. Design

### 3.1 Data model

| Location | Key | Role |
|---|---|---|
| `chrome.storage.local.dh_prefs` | `betaChannelEnabled` | Options preference mirror |
| Host `config.json.extension_preferences` | `beta_channel_enabled` | Discovery-time setting |

The Host reads its canonical config when checking for updates. The field is not
a top-level Host key or a standalone browser-storage key. Options hydrates from
the Host while preserving fields touched during hydration.

Instant persistence applies: the checkbox calls `updatePref` on change;
there is no Save button. `persistPrefs` routes the immutable preference intent
through the single-flight, coalescing `dh_prefs` queue. Host dispatch waits for
the successful latest mirror commit and the hydration gate. Failures are
inspected rather than assumed saved.

### 3.2 UI

General contains the beta checkbox and a localized warning that prereleases may
be less tested. Turning it off leaves the installed version unchanged until an
eligible newer stable release is available. Labels and hints use `t()` with
English and Chinese translations.

The change handler emits `Beta Channel Toggled` with `{ enabled: boolean }`.
This is an ordinary preference, not a scraped field requiring an
`isUserEdited` guard; the Options hydration touched-field guard still applies.

### 3.3 Host update-check changes

Paths below are relative to the product's GitHub Releases API endpoint.

| Setting | Endpoint | Candidate input |
|---|---|---|
| Off | `/releases/latest` | Stable release object |
| On | `/releases?per_page=10` | Bounded release list including prereleases |

`check_for_updates` normalizes the response to a list and delegates candidate
selection to `_select_update_candidate`. Selection requires a strictly newer
normalized version and exactly one direct HTTPS ZIP asset. Invalid candidates
are not accepted simply because their version is highest. The bounded list is
not an exhaustive history search.

Discovery is separate from execution. The Service Worker owns update state and
serializes manual-check authorization; checks are allowed only after hydration
in `idle`, `available`, or `complete`. A check initiation reply is not the
discovery result, and discovery must not become `DH_UPDATE_START`.

### 3.4 Semver parsing & comparison

`_parse_version` accepts the product's numeric version triple with optional
prerelease identifiers and leading `v`; unrecognizable versions return `None`.
`_version_gt` compares triples numerically, then prerelease precedence:

- Stable wins over prerelease at the same triple.
- Numeric prerelease identifiers compare numerically and precede nonnumeric
  identifiers; nonnumeric identifiers compare lexically.
- Equal prefixes favor the longer prerelease identifier list.
- Equal versions are not newer.

Examples: `2.0.70 > 2.0.70-beta`, `2.0.71-beta > 2.0.70`, and
`2.0.70-beta.2 > 2.0.70-beta.1 > 2.0.70-beta`.

### 3.5 Test coverage

`host/test_version_parse.py` covers parsing and precedence, including invalid
input, leading `v`, equality, stable/prerelease ordering, and numeric suffixes.
Candidate acceptance and Worker authorization have separate update contracts;
parser coverage alone does not establish a safe install.

## 4. Change manifest

Current owners are `Options.tsx` for the control and preference payload,
`translations.ts` for localized text, and `host/dh_native_host.py` for the config
read and release discovery. The Service Worker remains the update coordinator.

## 5. Migration & backward compat

Missing preference values mean `false`; no channel migration is needed.
Existing installed betas are not rolled back by opting out. Transactional
rollback after a failed installation is a different operation from channel
selection.

## 6. Verification boundary

This specification describes implemented behavior, not a release instruction.
Documentation maintenance uses static checks; runtime verification requires its
applicable reviewed scope. No test, build, installation, or publication result
is implied by this document.
