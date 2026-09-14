# Beta Channel Toggle in Extension Options

> Status: spec approved 2026-05-11. Ready for implementation planning.
> Owner of this spec: this brainstorming session.
> Implementation will follow via `writing-plans`.

## 1. Problem

The current updater (`host/dh_native_host.py:406-475`) calls
`https://api.github.com/repos/boatmac/Dynamics-Helper/releases/latest`.
That endpoint **silently filters out prereleases** server-side. As a
consequence, every release published with `release_helper.py ... --prerelease`
(e.g. `2.0.70-beta`) is invisible to every running DH installation, including
the developer's own. There is currently no way for a user to opt in to
beta updates.

A second, latent bug compounds this: the semver parser at line 451 does
`[int(x) for x in tag_name.split(".")]`. The moment we ever land a tag like
`2.0.70-beta`, this raises `ValueError` and the update check crashes.

## 2. Goals / Non-goals

### Goals

1. Add a single user-facing toggle in extension Options:
   `☐ Receive beta updates (pre-release versions)`.
2. When the toggle is on, the host's update check considers prereleases
   as candidates alongside stable releases.
3. The toggle state is persisted in the host's `config.json` (so host
   knows the setting even when the extension is closed and an automatic
   startup check runs).
4. Comparison of versions like `2.0.70` vs `2.0.70-beta` follows semver
   ordering: any stable release is "newer than" a prerelease that shares
   its `(major, minor, patch)` triple; `2.0.71-beta` is newer than `2.0.70`.
5. No regressions for users on stable: with the toggle off, behaviour
   is identical to today (calls `/releases/latest`).

### Non-goals

- Channel-style UI (radio buttons, dropdowns, multiple channels). YAGNI
  for a 2-state preference.
- Forced downgrade when toggling off. If a user is on `2.0.70-beta` and
  toggles the setting off, they STAY on `2.0.70-beta` until a stable
  release that is "newer than" it ships (i.e. `2.0.70` or `2.0.71`).
  This matches npm and most package managers and avoids reinventing a
  rollback path (DH's self-updater is forward-only by design).
- Surfacing a "you are on beta" badge in the FAB / Options. Could be a
  follow-up; not blocking this feature.
- Allowing users to pin to a specific channel like "beta only" or
  "alpha". Not asked for, no use case.

## 3. Design

### 3.1 Data model

#### `chrome.storage.local`

Add key `betaChannelEnabled: boolean`. Default: `false`. This key is set
by Options.tsx whenever the user toggles the checkbox; the FAB does not
read it directly (it's host-side state of record).

#### Host `config.json`

Add key `beta_channel_enabled: bool`. Default: `false`. Lives in the
host's existing JSON config (see `_load_config` / `_save_config` plumbing
around `dh_native_host.py:1137`). The extension pushes updates via the
existing `update_config` action; host persists by the existing pipe.

#### Authority

Host's `config.json` is the source of truth at update-check time. The
extension copy in `chrome.storage.local` exists only so Options.tsx can
render the right initial checkbox state without an immediate round-trip
to the host on tab open. On every Options "save" / toggle-change, both
copies update.

### 3.2 UI

In Options.tsx, in the existing "General" tab (the tab that already
holds Markdown Preview and Log Level), add one new row:

```
[☐] Receive beta updates (pre-release versions)
    Beta versions include new features and fixes before they ship to
    stable. They may also be less tested. Toggling off does not
    downgrade you from a beta you are already on; you will return to
    stable when the next stable version is released.
```

Same visual treatment as the existing Markdown Preview toggle. Pull
strings through `t('key')` and add the keys to `src/utils/translations.ts`
(both `en` and `zh`).

Telemetry: emit a single `trackEvent('Beta Channel Toggled', { enabled: true|false })`
on change so we can see adoption.

### 3.3 Host update-check changes

Two endpoints, picked at runtime:

| Setting | Endpoint | GitHub behaviour |
|---|---|---|
| `beta_channel_enabled: false` | `/releases/latest` | Server excludes prereleases. One JSON object. Today's behaviour. |
| `beta_channel_enabled: true`  | `/releases?per_page=10` | Returns up to 10 most recently created releases including prereleases. Array. |

For the new branch:

1. Fetch the array.
2. Iterate. For each release, try to parse `tag_name` with the new
   `_parse_version()`. Skip releases whose tag we cannot parse (defensive).
3. Find the highest version (by semver ordering, see § 3.4) that is
   strictly greater than the local `VERSION`.
4. If one exists, behave exactly as today (extract the `.zip` asset,
   send `update_available` message to extension, etc.).

`per_page=10` is a defensive bound: 10 is more than enough to catch
the current highest version even if we recently shipped 4-5 betas in
a row, and avoids dragging back hundreds of historical releases on a
project that lives a long time.

### 3.4 Semver parsing & comparison

New helpers in `dh_native_host.py`:

```python
def _parse_version(tag: str) -> tuple[tuple[int, int, int], tuple[str, ...]] | None:
    """Parse "2.0.70" or "2.0.70-beta" or "2.0.70-beta.2".
    Returns ((major, minor, patch), prerelease_parts) or None if tag is
    not a recognisable version. Leading 'v' is stripped."""

def _version_gt(remote_tag: str, local_tag: str) -> bool:
    """True iff remote semver-strictly-greater-than local.
    Comparison rules per https://semver.org/#spec-item-11:
      - compare (major, minor, patch) numerically;
      - if equal AND one has prerelease parts and the other doesn't,
        the one WITHOUT prerelease wins (i.e. 2.0.70 > 2.0.70-beta);
      - if both have prerelease parts, compare them left-to-right:
        numeric parts numerically, alphanumeric parts ASCII-lexically,
        numeric < alphanumeric, missing-after-shorter < present-after-longer."""
```

The existing comparison block at `dh_native_host.py:451-454`
collapses to a single `_version_gt(tag_name, VERSION)` call. The
`try/except ValueError` around that block goes away — `_parse_version`
returns `None` instead of raising; the caller skips unparseable tags.

### 3.5 Test coverage

New file `host/test_version_parse.py`. Minimum cases:

| Case | Expectation |
|---|---|
| `_parse_version("2.0.70")` | `((2,0,70), ())` |
| `_parse_version("v2.0.70")` | same as above |
| `_parse_version("2.0.70-beta")` | `((2,0,70), ("beta",))` |
| `_parse_version("2.0.70-beta.2")` | `((2,0,70), ("beta","2"))` |
| `_parse_version("not-a-version")` | `None` |
| `_version_gt("2.0.71", "2.0.70")` | `True` |
| `_version_gt("2.0.70", "2.0.70")` | `False` |
| `_version_gt("2.0.70", "2.0.70-beta")` | `True` (stable > prerelease same triple) |
| `_version_gt("2.0.70-beta", "2.0.70")` | `False` |
| `_version_gt("2.0.71-beta", "2.0.70")` | `True` |
| `_version_gt("2.0.70-beta.2", "2.0.70-beta.1")` | `True` |
| `_version_gt("2.0.70-beta", "2.0.70-beta.1")` | `False` (per semver 11.4.4: a larger set of prerelease fields has higher precedence when all preceding identifiers are equal, so `beta.1` > `beta`) |

End-to-end behaviour test of the endpoint switch is left to manual
verification (mocking GitHub responses in `unittest` is more friction
than it's worth for a 2-branch conditional; the real-API surface is
already exercised every time the user clicks "Check for update").

## 4. Change manifest

| File | Change |
|---|---|
| `extension/src/components/Options.tsx` | Add checkbox row + state + onChange (push to host via existing `update_config`). |
| `extension/src/utils/translations.ts` | + 3 keys (`betaChannelLabel`, `betaChannelHint`, `betaChannelToggleAria`) in `en` and `zh`. |
| `extension/src/utils/telemetry` usage in Options.tsx | One `trackEvent('Beta Channel Toggled', {enabled})` per change. |
| `host/dh_native_host.py` | New `_parse_version()` and `_version_gt()`; rework `check_for_updates` to switch endpoint by `config.beta_channel_enabled`; iterate when array; drop `try/except ValueError` around the old int-split. |
| `host/dh_native_host.py` `_load_config` / config defaults | Ensure `beta_channel_enabled` defaults to `False` for existing users. |
| `host/test_version_parse.py` (new) | Cases listed in § 3.5. |
| `AGENTS.md` § 3 Frontend code style — User Edit Protection | Mention the new setting as a routine preference (no special guard needed). One-line note. |
| `USER_GUIDE.md` Options section | Document the new toggle in the user-facing way. |
| `DEVELOPER_GUIDE.md` Updater section (if such a section exists; otherwise skip) | One paragraph on the channel switch. |

## 5. Migration & backward compat

- Existing users have no `beta_channel_enabled` in their `config.json`.
  `_load_config` must treat the missing key as `False` (current default
  semantics, equivalent to today's behaviour).
- Existing users have no `betaChannelEnabled` in `chrome.storage.local`.
  Options.tsx must treat the missing key as `False`.
- No data migration script needed; both defaults are safe and conservative.

## 6. Rollout

The feature can be shipped in either a stable or a beta release; both paths self-validate:

- **Ship in stable (e.g. `2.0.70`)**: every user receives the toggle. Beta channel
  is dormant until someone opts in. First beta release after that proves the
  channel works end-to-end.
- **Ship in beta (e.g. `2.0.70-beta`)**: only users who have *already* opted in to
  beta updates receive it. The developer (who installs locally) is one such user
  and can validate the channel immediately. Users on stable are unaffected; they
  pick up the toggle automatically when the next stable release ships (which will
  include the same code).

There is no chicken-and-egg problem because at least one beta-channel-aware
installation already exists at the moment we publish (the developer's local
install), so any beta release we publish is verifiable end-to-end.

**Recommended sequencing (chosen for lowest risk to existing users):** ship in
stable first if there are concurrent breaking changes (e.g. SDK 0.3.0 upgrade);
otherwise either ordering works.

## 7. Open questions / deferred

- Should we eventually surface a "you are running a beta" indicator
  somewhere (FAB tooltip, Options badge)? Deferred — does not block.
- Should we tighten the `per_page=10` to a smaller number once usage
  data shows the typical lookback distance? Deferred — 10 is cheap.
- Should we add a "channel" concept to support future channels
  (alpha, nightly)? Explicitly out of scope. Revisit if/when there's
  demand.
