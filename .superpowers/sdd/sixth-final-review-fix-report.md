# Dynamics Helper Sixth Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `0faf6493df81d7aaad70da63ac05eb25e8b57257`
**Product/test/docs commit:** `adeb9eff1781a2bebdcae7ba8055fa4279d64bf7` (`fix(review): make async commit truth durable`)
**Tracked evidence commit:** follows this report
**Expected final ahead/behind:** 35 ahead, 0 behind `origin/master`

## Status

All three Important and two Minor sixth-review findings were fixed in one TDD
wave. The committed product tree passes isolated focused/full Host, focused/full
Extension, production build, source-only compileall, diff/static scans, and one
temporary break proof per finding category.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

1. **Durable preference mirror actions:** Options now owns one single-flight,
   coalescing `dh_prefs` queue. It checks callback-scoped
   `chrome.runtime.lastError`, runs neither Host nor carried actions on failure,
   retains unsettled identity-compatible actions for retry, and executes only
   the newest successful intent after all older work drains. Passive hydration
   remains generation-gated. The Chrome mock now simulates storage-set and
   runtime-message `lastError` only during the matching callback.
2. **Reset response truth:** Reset carries default team identity, request
   generation, and reset token. The Service Worker returns captured
   `committed|stale|failed` truth and validates default prefs before each clear.
   Options checks transport, outer status, inner status, identity, generation,
   token, and current local generation. Only a current committed response clears
   local bookmark UI and shows success. Failure retains current values with a
   persistent incomplete warning and retry intent; a newer edit cannot be
   cleared by the old callback.
3. **FAB hash ownership:** `latestRequestId` remains owned throughout response
   processing. The safety timer stays active, and ownership is rechecked after
   `hashCaseId`; stale hash success/rejection produces no A UI, duration, menu
   close, or outcome telemetry while B remains analyzing and can complete.
4. **Host prompt read scope:** `_get_session_config` reads/migrates/hydrates
   `user_prompt.md` only for `include_prompt_status=True`. Analyze uses the
   canonical read helper exactly once per request; a file change is observed on
   the next Analyze. Options hydration still returns the canonical value.
5. **`user_instructions` presence:** a dedicated sentinel distinguishes absence
   from explicit null. Present null/non-string values fail with
   `config_saved: false` before config or file writes; absence performs no
   instruction write. Existing sparse explicit-empty and legacy-alias behavior
   remains intact.

## TDD and Mutation Evidence

Initial RED evidence was observed before production changes:

- storage-set rejection still dispatched selected-team and Host work, and two
  rapid intents started two concurrent `storage.set` calls;
- stale/failed/transport Reset responses still removed local data and claimed
  success; the pure Reset response helper did not exist;
- deferred hash A rendered and emitted success over B;
- session-only config performed a Custom User Prompt read;
- explicit-null `user_instructions` was accepted and allowed config writes.

Temporary post-GREEN mutations were restored immediately:

| Area | Temporary mutation | Observed failure |
|---|---|---|
| Mirror durability | Ignored storage `lastError` | Failed write dispatched team sync; expected zero calls |
| Reset truth | Accepted non-committed `syncStatus` | Stale Reset removed `dh_items`; expected no cleanup |
| FAB ownership | Disabled post-hash request-ID check | Stale A popover rendered over B |
| Prompt read scope | Forced health/prompt hydration on every config read | Session-only no-read assertion observed a health/read call |
| Presence sentinel | Exempted explicit null from type validation | Null instructions returned success instead of `config_saved: false` |

Each mutated test was rerun after restoration and passed in the final focused and
full gates.

## Final Verification

Every Host process used a fresh temporary `LOCALAPPDATA`, `TEMP`, and `TMP`;
focused Host also used `PYTHONPATH=host`.

- Focused Host (`prompt_sources`, `prompt_session`, `session_workspace`,
  `sdk_compat`, `debug_prompt_isolation`): **135/135 passed**.
- Full Host discovery: **207/207 passed**.
- Focused Extension (`Options`, `FAB.spinner`, `resetExtensionState`):
  **114/114 passed across 3 files**.
- Full Extension: **261/261 passed across 18 files**.
- Production build: exit 0, **2,217 modules transformed**, **13 artifacts
  listed**.
- Isolated source-only `compileall` excluding `host/venv`: exit 0 with no
  diagnostics.
- `git diff --check 0faf649..adeb9ef`, version checks, stale-mutation scans, and
  generated-dist status: passed.
- Product commit was clean at `adeb9ef`, 34 ahead/0 behind before this evidence
  commit.

The first compileall attempt incorrectly traversed `host/venv` while redirecting
all bytecode into a long Windows temporary path and produced third-party
`FileNotFoundError` diagnostics. It is rejected evidence. The accepted rerun
used `compileall -x "[\\/]venv[\\/]" host` with a short isolated bytecode root
and passed cleanly.

## Concerns

- Existing jsdom `chrome-extension://items.json` fetch diagnostics and
  Node/Vite/Browserslist warnings remain pre-existing non-gating noise.
- A failed Reset may have completed an idempotent subset of Service Worker
  cleanup; Options reports incomplete and retrying Reset safely repeats it.
- Optional authenticated marker smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
