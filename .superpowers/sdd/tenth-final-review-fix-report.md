# Dynamics Helper Tenth Whole-Branch Review Fix Report

**Date:** 2026-07-17
**Branch:** `docs/prompt-scope-cleanup-design`
**Required starting head:** `b9cb0246a4e4e04c23580850150c6df03680edcc`
**Product/test commits:**
- `257f28245f7bd089304aa20a20ea67b4bfe22785` (`fix(reset): preserve committed cleanup ownership`)
- `7979279d347f57ca5bcd684abe71b4db78283e37` (`fix(errors): share string-only fallback selection`)
**Tracked evidence commit:** this report/design/plan/documentation update
**Expected final ahead/behind:** 50 ahead, 0 behind `origin/master`

## Status

Both Important tenth-review findings are fixed through TDD at clean product head
`7979279`. Focused and full isolated Host, focused and full Extension,
production build/TypeScript, source-only compileall, static ownership/coercion,
version/generated-output, diff checks, and both restored mutations pass.

No push, tag, publish, version, package, registry, real
`%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred. Optional
authenticated smoke remained skipped because safe model/session isolation was
not guaranteed. Controller broad whole-branch review remains pending.

## Finding Mapping

### 1. Host-Committed Reset Ownership

- Options owns one `ResetTransaction` independently from preference mirror
  actions. It captures reset token, default Team identity, request generation,
  bookmark generation, retry action, and phase:
  `host-pending|host-committed|sw-pending|local-cleanup-pending|complete`.
- The initial mirror action owns only the first tokenized Host dispatch. Durable
  Host acknowledgment (`success: true` or `config_saved: true`) advances the
  transaction before newer-generation/supersession checks.
- Once Host commits, that transaction never resends Host and never writes
  `DEFAULT_PREFS` again. The warning's explicit Retry cleanup button resumes the
  stored SW or local action with the same token. The normal Reset button always
  starts a fresh token/default/Host transaction.
- SW retries retain default identity validation. A changed current identity
  returns stale without shared-state mutation. Local Team collapse and personal
  bookmark cleanup have separate generation gates; newer preferences/bookmarks
  are not cleared or rewritten.
- A retry after language changes to `en` preserves UI/storage `en`, performs no
  additional `dh_prefs` write, sends no second tokenized Host update, and reports
  cleanup completion truthfully. The same holds for `config_saved: true` plus
  refresh failure; its Host commit is durable before cleanup supersession.

### 2. Shared String-Only Fallback Selector

- `safeErrorText(candidates, fallback)` returns the first non-empty string
  unchanged or a trusted fallback. It never calls `String`, `toString`, template
  coercion, JSON serialization, or logging on candidate objects, arrays,
  functions, symbols, or nullish values.
- The selector covers Analyze rejection plus inner/outer persistence,
  `normalizeNativeHostResponse`, inner/outer `configUpdateResult`, Options prompt
  health and immediate transport/storage/team/update warnings, FAB nested
  analysis/native/outer/catch/update paths, and Service Worker immediate Analyze
  metadata/rejection handling.
- Valid string errors/messages preserve precedence and content. Malformed values
  use fixed/localized safe fallbacks. Success `data`, normalized `error_code`,
  string `errorKind`, and finite numeric `httpStatus` allowlists are unchanged.

## TDD RED Evidence

- **Reset ownership:** the three selected transaction probes produced **3
  failed, 146 skipped**. No Retry cleanup control existed, saved-refresh/local
  supersession lost the warning/action contract, and Reset still doubled as
  retry.
- **String selector:** the first focused run produced **9 failed, 2 passed, 188
  skipped**, plus **2 unhandled throwing-conversion errors**. Failures directly
  identified `String(...)` in Analyze/config/Options and implicit interpolation
  in FAB. Pure selector import was missing as expected.
- One attempted combined GREEN command exceeded the 120-second tool timeout and
  returned no output. It is rejected evidence. Isolated pure/background, FAB,
  and Options reruns then passed before the complete focused suite.

## Restored Mutation Proof

| Finding | Temporary mutation | Observed failure |
|---|---|---|
| Reset transaction phase | Replaced durable Host-commit transition with `null` | Target failed before any `RESET_EXTENSION_STATE` message (`Reset message not sent`) |
| String-only selector | Replaced selector loop with `String(candidates[0] ?? fallback)` | Secret-bearing object's throwing `toString` failed the malicious-value test |

Both mutations were restored immediately. Their targeted tests passed after
restoration, and static scans found neither mutation literal in the committed
tree.

## Final Verification

All accepted product verification ran from committed head
`7979279d347f57ca5bcd684abe71b4db78283e37`.

- Focused Host (`prompt_sources`, `prompt_session`, `session_workspace`,
  `sdk_compat`, `debug_prompt_isolation`, `model_config`): **143/143 passed** in
  7.686s.
- Full Host discovery: **207/207 passed** in 7.707s.
- Focused Extension (`Options`, `FAB.spinner`, `FAB.promptSourceErrors`,
  `analyzeBridge`, `resetExtensionState`, `configUpdateResult`,
  `safeErrorText`): **210/210 passed across 7 files**.
- Full Extension: **340/340 passed across 19 files**.
- Production build/TypeScript: exit 0, **2,218 modules transformed**, **13
  artifacts listed**, built in 10.58s.
- Source-only `compileall -q -x "venv" host`: exit 0 with no diagnostics.
- `git diff --check b9cb024..HEAD`: passed.
- Static source scan found no direct `String(error/message)`, truthy
  error/message fallback, old `pendingResetRetryActionRef`, or restored mutation
  literal.
- Generated `extension/dist` remained ignored/untracked with no tracked diff.
- Versions unchanged: package/Host `2.0.74-beta.4`; Chrome manifest `2.0.74`
  with `version_name` `2.0.74-beta.4`.
- All isolated Host/compileall scratch roots under the approved OpenCode temp
  parent were removed after their processes exited.

The first Node version command was malformed by PowerShell quote parsing and is
rejected evidence. The corrected command passed. The Host product code did not
change, but both isolated Host gates were rerun as requested.

## Documentation Corrections

- The ninth report now states that its reset retry remained coupled to a mirror
  action and that its string-only claim covered only the outer Native response
  normalizer.
- `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, the release draft, and
  the handoff now describe current phased transaction/Retry cleanup ownership
  and the shared no-coercion selector.
- The approved focused design and implementation plan are tracked under
  `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Concerns

- Reset transaction retry state is intentionally live-Options-page state; this
  fix does not add cross-page/reload persistence. That was not required by the
  review finding or approved design.
- If a newer personal bookmark generation exists, old-transaction bookmark
  defaults are intentionally not reapplied. Retry can finish only still-safe
  cleanup and remains visibly incomplete when newer-owned cleanup cannot be
  claimed complete.
- Existing jsdom `chrome-extension://items.json` fetch diagnostics, Node
  `module.register()` deprecation output, stale Browserslist data, and occasional
  asyncio slow-callback diagnostics remain pre-existing non-gating noise.
- Optional authenticated smoke was safely skipped.
- Controller broad whole-branch review remains pending; focused/self-review
  evidence does not substitute for it.
