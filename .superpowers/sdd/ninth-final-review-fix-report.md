# Dynamics Helper Ninth Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `cec901dc28074091e533be764cf2dbc4ba7c49fd`
**Product/test commits:**
- `5596afa0bbc2635e517428878c98b65cbd2b983d` (`fix(reset): require host commit before cleanup`)
- `9763b2e32af3805fb6ae998663e8bc2e532e37bc` (`fix(bookmarks): retain failed persistence intent`)
- `d88c206f2484cde7824c3c3b48473a3ea3c729a7` (`fix(team): normalize no-team manifest identity`)
- `f5d4acca883acf8b9ea0d0db76cc01f37f8fa994` (`fix(native): restrict error fallbacks to strings`)
**Tracked evidence commit:** this report/handoff/release update
**Expected final ahead/behind:** 47 ahead, 0 behind `origin/master`

## Status

All four Important ninth-review findings were fixed through TDD. The clean
product head passes focused/full isolated Host, focused/full Extension,
production build/TypeScript, source-only compileall, static ownership/identity/
allowlist checks, generated-output checks, and one restored mutation proof per
finding.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

### 1. Reset Two-Phase Commit

- One reset token now appears in both the default-derived Host `update_config`
  payload and `RESET_EXTENSION_STATE` payload.
- The latest default `dh_prefs` mirror must commit before the Host call. The SW
  phase is not dispatched until the matching Host decision is durable:
  `success: true` or `config_saved: true`.
- Host storage/transport/unsaved failure performs no SW destructive reset and
  leaves persistent incomplete/config warnings. A saved session-refresh failure
  continues to SW while its separate refresh warning remains visible.
- Completion requires the matching SW response identity/generation/token and
  `syncStatus: 'committed'`. Failed/stale/transport/superseded responses never
  display completion.
- Once Host has committed, retry uses the same token and runs only the SW phase.
  An explicit retry after a newer preference edit preserves that edit rather
  than reapplying defaults or resending the Host reset.

### 2. Personal Bookmark Storage Failure

- `queueBookmarkStorage` inspects callback-scoped Chrome `lastError` for both set
  and remove. It retains the newest complete immutable write/removal intent and
  absorbs only the queue tail for continuity.
- Failed writes leave the newer menu visible while a storage snapshot proves a
  reload would still contain the older menu. A localized persistent warning
  states that bookmark changes are not saved without exposing raw storage text.
- A later bookmark mutation captures/coalesces the newest UI snapshot, retries
  through the same queue, and clears the bookmark warning only after success.
- Deferred Reset removal followed by a newer failed write retains the newer UI,
  suppresses Reset completion, and recovers on the next mutation. Failed Reset
  removal likewise remains incomplete and recovers on Reset retry.
- Reset, bookmark, and config warnings compose instead of hiding one another.

### 3. No-Team Manifest Identity

- Every Options current and response team comparison normalizes optional values
  as `(team || '')`, including manifest fetch, selected sync/refresh, clear, and
  Reset response paths.
- No-team `committed` and `unchanged` responses, including responses with an
  omitted `teamId`, promote the URL to successful and deduplicate the next blur.
- Auth/network/failed outcomes surface existing localized error truth and remain
  retryable. Stale/skipped responses also remain retryable.
- A no-team callback captured before a team selection cannot complete or release
  the selected-team request afterward.

### 4. String-Only Error Fallback

- `normalizeNativeHostResponse` uses string `error`, then string `message`, then
  fixed `Native Host error`.
- Object, array, function, and null values are neither forwarded nor coerced.
  A secret-bearing object's `toString` spy remains uncalled, and the secret is
  absent from the response, console calls, and Options warning.
- Success `data`, normalized `error_code`, string `errorKind`, finite numeric
  `httpStatus`, and valid string fallback behavior remain unchanged.

## TDD RED Evidence

Every production change followed a failing test:

- **Reset:** the selected initial matrix produced **7 failed, 129 skipped**
  because no tokenized Host reset request existed. The stricter newer-edit/SW
  retry test then failed with one SW request instead of two, exposing dropped
  retry ownership before the implementation was corrected.
- **Bookmarks:** the selected first run produced **3 failed, 137 skipped**: no
  persistence alert existed, deferred Reset/remove ordering did not reach the
  intended retry truth, and the localization key returned itself. Follow-up
  coverage locked failed remove and successful recovery.
- **No-team identity:** after correcting a frozen-fixture setup error, both
  no-team `committed` and `unchanged` tests dispatched a second request instead
  of deduplicating; failed/stale/skipped retry controls already worked.
- **String-only fallback:** the pure boundary produced **6 failed, 18 skipped**
  for object/array/function/null, secret object, and string-message precedence.
  The Options target rendered the secret object via coercion instead of the safe
  fallback.

## Restored Mutation Proof

Each temporary mutation was applied only for its named run and restored
immediately:

| Finding | Temporary mutation | Observed failure |
|---|---|---|
| Reset Host gate | Allowed uncommitted reset actions through normal mirror settlement | Unsaved Host target observed SW Reset before a tokenized Host request |
| Bookmark warning | Changed failure transition to clear/false | Failed latest snapshot target could not find the persistent bookmark alert |
| No-team identity | Restored raw `prefsRef.current.team === teamId` | Committed no-team blur dispatched twice instead of deduplicating |
| Native fallback | Restored truthy `msg.error || msg.message` forwarding | Secret-bearing object was returned instead of `Native Host error` |

All four targets passed after restoration. Static mutation scans found no
temporary literal in the committed tree.

## Final Verification

All final product commands ran from clean head
`f5d4acca883acf8b9ea0d0db76cc01f37f8fa994`. Every Host process used a fresh
temporary `LOCALAPPDATA`, `TEMP`, and `TMP` below the approved OpenCode temp
parent. Focused Host additionally set `PYTHONPATH=host`; all three scratch roots
were inspected and deleted after the runs.

- Focused Host (`prompt_sources`, `prompt_session`, `session_workspace`,
  `sdk_compat`, `debug_prompt_isolation`, `model_config`): **143/143 passed** in
  8.865s.
- Full Host discovery: **207/207 passed** in 8.313s.
- Focused Extension (`Options`, `MenuLogic.teamCache`, `analyzeBridge`,
  `teamManifestSync`, `resetExtensionState`, `teamCatalog`): **231/231 passed
  across 6 files**.
- Full Extension: **327/327 passed across 18 files**.
- Production build/TypeScript: exit 0, **2,217 modules transformed**, **13
  artifacts listed**, built in 7.13s.
- Source-only `compileall` excluding `host/venv`: exit 0 with no diagnostics.
- `git diff --check cec901d..HEAD`: passed.
- Generated `extension/dist` remained ignored and had no tracked diff.
- Versions unchanged: package/Host `2.0.74-beta.4`; Chrome manifest `2.0.74`
  with `version_name` `2.0.74-beta.4`.
- Static scans passed for normalized team identity, string-only native fallback,
  exactly one `dh_items` write/remove boundary, and absent mutation literals.

The first static/version commands attempted to invoke a standalone `rg` binary,
which was not present on this PowerShell `PATH`; those commands are rejected
evidence. The accepted reruns used `git grep` for source scans and Node for
ownership/version assertions and passed. A separate focused rerun was also
reissued from `extension/` after one command was mistakenly launched from the
repository root; no Git operation in that failed command ran.

The Host product code did not change, but focused and full Host gates were rerun
as required.

## Concerns

- Existing jsdom `chrome-extension://items.json` fetch diagnostics, Node
  `module.register()` deprecation output, and stale Browserslist data remain
  pre-existing non-gating noise.
- The test Chrome mock auto-acknowledges tokenized reset Host updates only when a
  test does not explicitly defer that action. The new ordering/failure/staleness
  matrix explicitly defers Host callbacks, so the two-phase contract does not
  depend on that convenience path.
- A bookmark storage failure is visible and retryable within the current Options
  session, but a page close before successful retry necessarily loses the
  in-memory newer snapshot; the warning and storage-snapshot tests make that
  durability boundary explicit.
- Optional authenticated marker smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
