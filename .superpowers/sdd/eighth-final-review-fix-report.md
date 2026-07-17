# Dynamics Helper Eighth Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `87278d54bc4f75a24250e011e2a5322f8b805c46`
**Product/test/docs commits:**
- `0a23315fd9dcc3893e14c5343383722214b23b01` (`fix(review): preserve personal reset and retry truth`)
- `fcc6467b5788ccb896a448b4ce58f5146b1311c8` (`fix(review): align reset cache status truth`)
**Tracked evidence commit:** the commit containing this report
**Expected final ahead/behind:** 41 ahead, 0 behind `origin/master`

## Status

All three Important eighth-review findings were fixed through TDD. The clean
product head passes focused/full isolated Host, focused/full Extension,
production build/TypeScript, source-only compileall, static ownership and
allowlist scans, generated-output checks, and restored mutation proof for each
finding.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

### 1. Reset Versus Personal Bookmark Mutations

- `mutatePersonalItems` is the single Options entry point for every personal
  add, edit, delete, move, import, collapse, and Reset intent. It increments
  `bookmarkGenerationRef` synchronously and applies functional updates against
  `itemsRef`, avoiding stale React closures.
- `queueBookmarkStorage` is the sole Options `dh_items` set/remove boundary.
  Captured write snapshots and Reset removal execute in one recoverable Promise
  queue, so a delayed remove finishes before a newer write instead of deleting
  it afterward.
- Reset captures the personal bookmark generation separately from its existing
  default preference identity, team generation, and reset token. Shared
  Service Worker team/analysis cleanup may commit, but personal removal,
  packaged-default reload/write, and success UI each recheck the captured
  bookmark generation across every asynchronous boundary.
- A newer personal mutation cancels only personal cleanup, retains its storage
  and UI snapshot, clears any stale success toast, and shows persistent partial
  truth: some shared state may already be cleared. A new Reset is a safe retry
  with a fresh generation/token.
- Stored `dh_items: []` is authoritative in both Options and `useMenuLogic`, so
  deleting the final bookmark does not resurrect packaged defaults on reload.
  An absent key still loads defaults; a normal committed Reset removes the key,
  reloads collapsed packaged defaults, and writes them through the same queue.

### 2. Error Kind Preservation

- `normalizeNativeHostResponse` leaves success `data` unchanged.
- Error normalization allowlists fallback text, normalized `error_code`, string
  `errorKind`, and finite numeric `httpStatus`. Request IDs, arbitrary objects,
  payloads, secrets, and malformed metadata are not forwarded.
- Host-shaped outer `list_models` errors traverse the normalizer/Service Worker
  response shape into Options. `auth` selects the re-auth UI, while
  `unavailable` and `unknown` select generic retry UI.

### 3. Manifest Retry State

- `lastSuccessfulManifestUrlRef` and tokenized
  `manifestFetchInFlightRef` are separate. Same-URL concurrent blurs coalesce,
  but no URL is marked successful before its callback.
- Only a current token, current enabled/URL/team identity, matching response
  identity/generation, and `committed` or `unchanged` status promote success.
- Auth/network/transport/generic failure, `failed`, `stale`, and `skipped`
  outcomes release only their own in-flight token and remain retryable. A
  first-time user without a selected team follows the same rule.
- An old URL A callback cannot clear or complete URL B. Starting a different
  URL invalidates the prior success marker because every URL-change request
  uses `resetCache`; therefore A refetches after failed B cleared A's cache.
  Reset and explicit URL clear likewise invalidate successful URL state.

## TDD Red Evidence

Every production change followed a failing test:

- **Bookmark generation/storage:** the first Options RED produced **7 failed,
  105 passed**. Delayed committed Reset removed newer add/edit/import/collapse/
  reorder snapshots (received `[]`), invoked removal after delete, and deleted a
  newer write after deferred remove. Follow-up REDs caught false complete copy,
  stored-empty default resurrection, and stale success toast after a later
  partial Reset.
- **Error metadata:** the normalizer plus Options path produced **6 failed, 1
  passed** in the selected run. Expected `errorKind`/`httpStatus` were absent,
  and Options could not retain auth/unavailable/unknown classification.
- **Manifest retry state:** the initial selected matrix produced **7 failed, 3
  passed**. Same-URL blur after auth/network/transport/stale/skipped did not send
  a second request; old A/new B and no-team retry cases were also suppressed.
  Follow-up REDs caught transport/generic warning loss, Reset cache invalidation,
  and A-to-failed-B-to-A cache return.

## Restored Mutation Proof

Each temporary mutation was applied only for its target run and restored
immediately:

| Finding | Temporary mutation | Observed failure |
|---|---|---|
| Bookmark generation | Replaced `bookmarkResetIsCurrent` with an unconditional `true` | Delayed Reset removed the newer add snapshot and returned `[]` instead of the captured newer items |
| Error classification | Suppressed the `errorKind` allowlist field | Host auth normalization omitted `errorKind: 'auth'`; the end-to-end Options target failed |
| Manifest terminal truth | Marked every success envelope as last-successful, including `stale` | Same-URL retry after stale remained at one sync instead of dispatching the second request |

After restoration, the three named targets passed together. No temporary
mutation remains in the committed tree.

## Final Verification

All final commands ran from clean product head
`fcc6467b5788ccb896a448b4ce58f5146b1311c8`. Every Host process used fresh
temporary `LOCALAPPDATA`, `TEMP`, and `TMP` below the approved OpenCode temp
parent; focused Host also set `PYTHONPATH=host`.

- Focused Host (`prompt_sources`, `prompt_session`, `session_workspace`,
  `sdk_compat`, `debug_prompt_isolation`, `model_config`): **143/143 passed**.
- Full Host discovery: **207/207 passed**.
- Focused Extension (`Options`, `MenuLogic.teamCache`, `analyzeBridge`,
  `teamManifestSync`, `resetExtensionState`, `teamCatalog`): **207/207 passed
  across 6 files**.
- Full Extension: **303/303 passed across 18 files**.
- Production build/TypeScript: exit 0, **2,217 modules transformed**, **13
  artifacts listed**.
- Source-only `compileall` excluding `host/venv`: exit 0 with no diagnostics.
- `git diff --check 87278d5..HEAD`: passed.
- Generated `extension/dist` status/diff: clean and untracked from this work.
- Versions unchanged: package/Host `2.0.74-beta.4`; Chrome manifest `2.0.74`
  with `version_name` `2.0.74-beta.4`.
- Static scans: no raw personal `setItems` in Options; exactly one centralized
  `dh_items` set/remove helper; no obsolete `lastFetchedManifestUrlRef`; no
  restored mutation literals.

The Host product code did not change, but focused and full Host gates were rerun
as required.

## Concerns

- Existing jsdom `chrome-extension://items.json` fetch diagnostics and
  Node/Vite/Browserslist warnings remain pre-existing non-gating noise.
- A partial Reset intentionally means shared team/analysis state may already be
  cleared while a newer personal bookmark mutation is retained. The warning now
  states this explicitly; retry starts a fresh full Reset intent.
- Manifest URL changes intentionally invalidate prior success when the new
  request starts because `resetCache` has already made the previous cache
  unusable. Returning to the prior URL therefore fetches again.
- Optional authenticated marker smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
