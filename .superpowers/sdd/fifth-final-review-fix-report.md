# Dynamics Helper Fifth Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `e1fb39c0ef81fbb873e0e653f3d37661cc3300b3`
**Product/test/spec commit:** `77df5ec7fe04e39c8d31d1537572a2672b201f71` (`fix(review): preserve asynchronous intent ownership`)
**Tracked evidence commit:** follows this report
**Expected final ahead/behind:** 33 ahead, 0 behind `origin/master`

## Status

All four fifth-review Important findings were fixed in one coordinated TDD
wave. The committed product tree passes isolated focused/full Host, focused/full
Extension, production build, isolated compileall, diff/static scans, and
temporary break-and-fail mutations.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

1. **Unreadable/sparse Custom User Prompt:** `get_config` reports
   `user_prompt_unreadable` and omits `extension_preferences.user_prompt` for
   unreadable/invalid UTF-8. Modern Options preserves the Chrome mirror; legacy
   hydration is used only without `prompt_source_status`. Top-level
   `user_prompt` is an immutable sparse revision/value token sent only for an
   explicit edit, clear, or Reset. Host distinguishes omission from explicit
   empty; unrelated updates leave bytes unchanged, explicit replacement/clear
   repairs, and generation-safe health refresh clears the warning.
2. **Mirror post-commit actions:** team sync, clear, Reset, and manifest fetch
   are stable action identities carried through compatible newer mirror
   snapshots. The writer waits until older in-flight writes drain and the
   latest repair snapshot commits, settles before dispatch to prevent duplicate
   recursion, and cancels incompatible enabled/URL/team actions. Reset survives
   unrelated post-reset edits.
3. **Async team UI generations:** Options initial and storage-follow-up cache
   reads capture enabled/URL/team plus a UI generation and revalidate before
   applying manifest list, selected items, or timestamp. `useMenuLogic()` uses
   latest-only mount/storage loads and invalidates on unmount. Delayed A cannot
   overwrite B or reset-empty state.
4. **FAB spinner/timer identity:** hydration exposes full pending identity and
   FAB derives analyzing state from the local request ID or current hydrated
   pending. Request ID is created before ownership/timer, a new request replaces
   the old timer, and timeout/response/catch/finally mutate only matching
   ownership. Stale A cannot clear B or display A timeout; B completion clears B.

## TDD and Mutation Evidence

Initial RED evidence included: invalid UTF-8 health remained `ok` and published
false empty; unrelated Options payloads always carried `user_prompt`; prompt
intent API lacked immutable identity; delayed team/Reset mirror callbacks lost
their actions; a newer callback could dispatch before an older write drained;
delayed Options/Menu A reads replaced B; and stale FAB A response/finally
cleared B.

Temporary mutations were restored immediately:

| Area | Temporary mutation | Observed failure |
|---|---|---|
| Prompt health | Substituted `""` when `_user_prompt_raw` was omitted | Unreadable get-config test found `user_prompt: ""` |
| Mirror actions | Removed inherited actions from newer mirror intents | Delayed team-sync carry test observed zero dispatches |
| Team UI | Removed MenuLogic load-generation comparison | Delayed A load replaced TEAM B with TEAM A |
| FAB ownership | Allowed any local request to clear in `finally` | A response made B Analyze button enabled |

Additional RED proof locked explicit-null Host rejection and newer-callback-first
mirror ordering. The corrected tests passed after restoration.

## Final Verification

- Focused Host with isolated `LOCALAPPDATA` and `PYTHONPATH=host`: **132/132 passed**.
- Full Host discovery with isolated `LOCALAPPDATA`: **204/204 passed**.
- Focused Extension review suite: **158/158 passed across 7 files**.
- Full Extension: **248/248 passed across 17 files**.
- Production build: exit 0, **2,216 modules transformed**, **13 artifacts listed**.
- Isolated `python -m compileall -q host`: exit 0 with no diagnostics.
- `git diff --check`, sparse prompt scans, action ownership scans, and request-ID ownership scans: passed.
- Product commit was verified clean at `77df5ec`, 32 ahead/0 behind before this evidence commit.

## Concerns

- Existing jsdom `chrome-extension://items.json` fetch diagnostics and
  Node/Vite/Browserslist warnings remain pre-existing non-gating noise.
- Legacy nested `extension_preferences.user_prompt` remains Host fallback-only
  when top-level `user_prompt` is absent; modern Options never emits it.
- Optional authenticated marker smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
