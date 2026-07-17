# Dynamics Helper Seventh Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `540283edcd03b64189a64368fe8fe984622e2033`
**Product/test/docs commit:** `85355f81ec01c75a1c26e49b391ba1d4911b768d` (`fix(review): harden storage commit truth`)
**Tracked evidence commit:** this report's `docs(verification): record seventh review fixes` commit
**Expected final ahead/behind:** 37 ahead, 0 behind `origin/master`

## Status

Both Important seventh-review findings were fixed through TDD. The product
commit passes focused/full isolated Host, focused/full Extension, production
build, source-only compileall, TypeScript/static checks, and a restored break
proof for each finding.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

1. **Hydration catch-up durability:** Catch-up creates a frozen config intent
   and a frozen `PrefsMirrorIntent`, then enters `writePrefsMirror`. Only the
   newest successful mirror invokes `onLatestCommit`, which performs the
   inspected Host update with `suppressTransportWarning: true`. Failed storage
   sends no Host update or action and retains the exact intent/visible issue.
   A later successful edit sends one latest payload; an older delayed catch-up
   cannot send over it.
2. **Team storage callback truth:** `setStorage` and `removeStorage` inspect
   `chrome.runtime.lastError` synchronously inside their callbacks and reject
   with fixed credential-safe errors. Manifest, changed-bookmark, 304 timestamp,
   selection/full clear, and Reset paths propagate failed truth. Failed selected
   responses include neither items nor `syncedAt`; Options therefore applies no
   success state. `queueTeamMutation` absorbs a rejected tail only for queue
   continuity, while the caller still receives rejection/failure and later
   queued work recovers.

## TDD and Break Evidence

Initial RED was observed before each production change:

- Both new catch-up tests saw one `update_config` while the passive hydration
  mirror was still deferred; expected zero. Options result: **2 failed, 102
  passed**.
- Team storage tests showed failed set/remove callbacks still producing
  `committed`, `unchanged`, successful clear, or successful Reset; request
  boundaries also leaked rejection and failed selected responses leaked cached
  items/timestamps. Team/Reset result: **9 failed, 45 passed across 3 files**.

Post-GREEN temporary mutations were restored immediately:

| Finding | Temporary mutation | Observed failure |
|---|---|---|
| Catch-up durability | Replaced queued catch-up mirror with direct `sendHostConfigUpdate` | Target test observed one early Host send; expected zero |
| Team storage `lastError` | Made `setStorage` resolve without inspecting scoped `lastError` | Failed bookmark mutation returned `committed` with changed items instead of `failed` |

After restoration, both targeted tests passed. Focused combined Extension then
passed **159/159 across 4 files**.

## Final Verification

Every Host process used fresh temporary `LOCALAPPDATA`, `TEMP`, and `TMP` under
the approved OpenCode temp parent. Focused Host also set `PYTHONPATH=host`.

- Focused Host (`prompt_sources`, `prompt_session`, `session_workspace`,
  `sdk_compat`, `debug_prompt_isolation`): **135/135 passed**.
- Full Host discovery: **207/207 passed**.
- Focused Extension (`Options`, `teamCatalog`, `teamManifestSync`,
  `resetExtensionState`): **159/159 passed across 4 files**.
- Full Extension: **272/272 passed across 18 files**.
- Production build: exit 0, **2,217 modules transformed**, **13 artifacts
  listed**.
- Isolated source-only `compileall` excluding `host/venv`: exit 0 with no
  diagnostics.
- TypeScript static checking ran through `npm run build` and passed.
- `git diff --check`, version checks (`2.0.74-beta.4` unchanged), direct
  catch-up/storage-wrapper scans, and generated-dist status passed.

The Host product code did not change, but both focused and full Host gates were
rerun as required.

## Concerns

- Existing jsdom `chrome-extension://items.json` fetch diagnostics and
  Node/Vite/Browserslist warnings remain pre-existing non-gating noise.
- A multi-stage selected sync may have committed a current manifest before a
  later bookmark mutation fails. The result remains failed with no selected
  success payload, and retry is identity-gated and safe.
- Optional authenticated marker smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
