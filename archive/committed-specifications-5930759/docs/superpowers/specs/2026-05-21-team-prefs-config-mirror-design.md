# ADR: Team Catalog Prefs Mirrored to Host `config.json` + `extension_preferences` snake_case Normalization

**Status**: Accepted
**Date**: 2026-05-21
**Supersedes**: [`2026-05-20-team-catalog-user-config-design.md`](2026-05-20-team-catalog-user-config-design.md) (partial — only the "do not mirror" stance)

## Context

### The original rule (now reversed)

`AGENTS.md` §3 historically said:

> Team catalog preferences (`prefs.teamCatalogEnabled`, `prefs.teamManifestUrl`): These are NOT mirrored to host `config.json` — team catalog is a purely extension-side feature; the host process never reads team data.

The rationale at the time was: host doesn't read these → don't bother shipping them across the Native Messaging boundary.

### The pain that surfaced

When a user (the project owner, dogfooding v2.0.70-beta.2):

1. Wipes `chrome.storage.local` (or moves to a new machine / clears Chrome cache),
2. The host `config.json` is intact and faithfully restores 11 fields (rootPath, language, primaryColor, log level, etc.),
3. But `teamCatalogEnabled` / `teamManifestUrl` / `team` / `teamLabel` are **lost** because they were never persisted to host config.

This breaks the user mental model that `config.json` is the **backup-of-truth** for Options configuration. The user expected backup → restore → everything works, but team catalog setup had to be redone from scratch every time.

### Additional discovery during fix

Existing `extension_preferences` has **inconsistent naming**: 5 snake_case keys (`auto_analyze_mode`, `user_prompt`, `enable_status_bubble`, `beta_channel_enabled`, `log_level`) coexisting with 5 camelCase keys (`useWorkspaceOnly`, `primaryColor`, `buttonText`, `offsetBottom`, `offsetRight`) and one ambiguous `language`. This is purely historical accident — different authors added fields at different times without convention enforcement.

The mixed style isn't user-visible but creates friction for AI agents and future contributors reading the host code or config files.

## Decision

### D1. Reverse the "do not mirror" stance

All 4 team catalog prefs are now mirrored to host `config.json`:

| TS-side `prefs` key | host-side `extension_preferences` key |
|---|---|
| `teamCatalogEnabled` | `team_catalog_enabled` |
| `teamManifestUrl` | `team_manifest_url` |
| `team` | `team` |
| `teamLabel` | `team_label` |

Host treats these as **passive holders** — it never reads or acts on them. The purpose is purely backup/restore parity.

### D2. Establish "Options config persistence principle"

`config.json` is **the canonical backing store** for Options page configuration. New Options fields default to being mirrored to `extension_preferences` unless explicitly excluded.

Current exclusions (3):
- `userInstructions` — already persisted as `copilot-instructions.md`
- `userPrompt` — already persisted as `user_prompt.md`
- `dh_items` (bookmark menu) — currently only in `chrome.storage.local`

These exclusions are open for future review (see follow-ups in `2026-05-11-beta-channel-toggle.md`).

### D3. Normalize naming to snake_case

5 historical camelCase keys are renamed:

| Old (camelCase) | New (snake_case) |
|---|---|
| `useWorkspaceOnly` | `use_workspace_only` |
| `primaryColor` | `primary_color` |
| `buttonText` | `button_text` |
| `offsetBottom` | `offset_bottom` |
| `offsetRight` | `offset_right` |

Rationale: Python host follows PEP 8 (snake_case). The mixed style was never intentional; this normalization completes the unification.

### D4. No backward-compat migration

Pre-v2.0.70 `config.json` files have the 5 camelCase keys. Post-upgrade, those keys are simply **ignored** by the new reader code. The values still exist in `chrome.storage.local` (untouched), so the first Save Changes click after upgrade rewrites them with the new snake_case names. The transition window: 1 click.

We explicitly chose **not** to write a migration layer because:
- The user base is currently ~1 (project owner) — migration code is heavier than the impact.
- The "first Save Changes regenerates" behavior is self-healing and discoverable.
- Carrying migration logic forward adds permanent maintenance cost for a one-time concern.

## Consequences

### Positive

1. **Backup/restore parity restored** — `config.json` now faithfully represents 15 Options fields (11 existing renamed + 4 new team). Copy `config.json` to a new machine → all settings come back.
2. **Convention established** — Future Options fields automatically land in `config.json` without per-field debate. New contributors have a clear rule.
3. **Naming consistency** — All `extension_preferences` keys are snake_case, matching host Python idiom.

### Negative

1. **manifest URL contains SAS token** — `teamManifestUrl` typically includes Azure Blob SAS token (e.g. `?sp=r&se=...&sig=...`). This token is now written to `%LOCALAPPDATA%\DynamicsHelper\config.json` in plaintext. This is **the same security posture as `chrome.storage.local`** (both are plaintext on disk, readable by any process with user-context access). The attack surface modestly widens because Python tools that scan `%LOCALAPPDATA%` may now see the URL. **Token redaction is a follow-up** (tracked in `2026-05-11-beta-channel-toggle.md`).
2. **First-Save data loss window** — Between upgrading to v2.0.70 and the user clicking Save Changes for the first time, the 5 renamed fields fall back to `DEFAULT_PREFS` (because old camelCase keys are no longer read). For the project owner this is acceptable (verified during planning). For future users this may surprise — communicate in release notes.
3. **Shared function reuse, not refactor** — Save-triggered fetch (Task 2 in the implementation plan) reuses `syncTeamCatalogOnStartup()` directly rather than extracting a shared helper. Future changes to startup behavior automatically affect the Save path; reviewers must be aware.

### Neutral

1. **Host does not read 4 new team fields** — They're stored but inert. If a future feature wants host-side team awareness (e.g. team-scoped Kusto queries), this ADR has already paid the cost of getting them across the boundary.

## Implementation pointers

- `extension/src/components/Options.tsx` — `extension_preferences` write block (≈line 757) and host→prefs read block (≈line 666)
- `host/dh_native_host.py:801` — only host-side code path that actually reads a renamed key (`use_workspace_only`)
- `AGENTS.md` §3 — rule text updated in this commit
- `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` — follow-ups (SAS token redaction, markdown→config.json merge consideration, bookmarks.json separation)

## References

- Plan thread `Options.tsx:dh_prefs` storage dump (project owner, 2026-05-21) — proved chrome.storage.local persisted team prefs correctly; root cause for "fetch teams not running" was Save did not trigger SW manifest fetch (separate from this ADR; see implementation Task 2).
- v2.0.70-beta.2 release notes (pending) — must call out the first-Save behavior.
