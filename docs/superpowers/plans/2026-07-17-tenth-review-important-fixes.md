# Tenth Review Important Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Host-committed Reset ownership through newer edits and make every reviewed extension error fallback string-only.

**Architecture:** Options stores a reset transaction state machine separately from coalescing preference actions; its retry control resumes only safe SW/local phases. A single pure utility selects trusted string error candidates at all reviewed boundaries without coercion.

**Tech Stack:** React 19, TypeScript 5.9, Chrome Extension APIs, Vitest 3, Testing Library, Python 3.13 unittest

## Global Constraints

- Work only in `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec` from starting head `b9cb024`.
- Use TDD and retain RED, GREEN, and restored mutation evidence.
- Do not push, tag, publish, version, package, change registry state, access real `%LOCALAPPDATA%\DynamicsHelper`, or touch MyCases.
- Preserve `errorKind`, `httpStatus`, and `error_code` allowlists.
- A Host-committed reset token must never send Host reset/default preferences twice.

---

### Task 1: Reset Transaction Ownership

**Files:**
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/utils/translations.ts`

**Interfaces:**
- Consumes: existing preference mirror queue, tokenized Host `update_config`, `RESET_EXTENSION_STATE`, bookmark queue
- Produces: `ResetTransaction` with `host-pending | host-committed | sw-pending | local-cleanup-pending | complete`, plus an explicit cleanup retry action

- [x] **Step 1: Write failing transaction probes**

Add tests where Host commits, language changes to `en` before the SW callback,
the callback becomes stale/superseded, and Retry cleanup preserves the original
token without another Host/default write. Repeat with saved refresh failure and
assert the separate warning remains until a later acknowledged update supersedes
it.

- [x] **Step 2: Run RED**

Run:
`npm run test:run -- src/components/Options.test.tsx -t "Host-committed reset transaction|saved refresh-failed reset transaction" --reporter=dot`

Expected: FAIL because retry ownership is discarded or a fresh Reset runs.

- [x] **Step 3: Implement the minimal state machine**

Define the transaction ref and phase transitions in `Options.tsx`. Keep initial
Host dispatch as the mirror action, persist Host acknowledgment into the
transaction before generation checks, and route SW/local failures to the stored
retry action. Add localized Retry cleanup copy and keep normal Reset fresh.

- [x] **Step 4: Run GREEN and reset-focused regressions**

Run:
`npm run test:run -- src/components/Options.test.tsx src/background/resetExtensionState.test.ts --reporter=dot`

Expected: PASS.

- [x] **Step 5: Prove phase persistence**

Temporarily remove the Host-committed phase write, rerun the targeted probe and
observe failure, restore the source, and rerun GREEN.

- [x] **Step 6: Commit**

Commit tests and implementation as `fix(reset): preserve committed cleanup ownership`.

### Task 2: Shared String-Only Error Selector

**Files:**
- Create: `extension/src/utils/safeErrorText.ts`
- Create: `extension/src/utils/safeErrorText.test.ts`
- Modify: `extension/src/background/analyzeBridge.ts`
- Modify: `extension/src/background/analyzeBridge.test.ts`
- Modify: `extension/src/background/serviceWorker.ts`
- Modify: `extension/src/utils/configUpdateResult.ts`
- Modify: `extension/src/utils/configUpdateResult.test.ts`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`

**Interfaces:**
- Produces: `safeErrorText(candidates: readonly unknown[], fallback: string): string`
- Contract: first non-empty string, otherwise fixed fallback, with no candidate coercion

- [x] **Step 1: Write failing pure and boundary probes**

Cover valid string precedence and throwing/secret objects, arrays, functions,
and symbols. Add inner Analyze persistence, outer/inner config update, prompt
health, FAB nested response, and Service Worker normalization assertions.

- [x] **Step 2: Run RED**

Run focused utility, Analyze, Options, and FAB tests. Expected: FAIL at current
`String(...)` and interpolation/truthy-fallback paths.

- [x] **Step 3: Implement and apply the utility**

Add the pure selector and replace every reviewed error extraction while keeping
metadata allowlists and valid strings unchanged.

- [x] **Step 4: Run GREEN**

Run:
`npm run test:run -- src/utils/safeErrorText.test.ts src/utils/configUpdateResult.test.ts src/background/analyzeBridge.test.ts src/components/Options.test.tsx src/components/FAB.promptSourceErrors.test.tsx --reporter=dot`

Expected: PASS.

- [x] **Step 5: Prove no coercion**

Temporarily restore `String(...)` in one selected boundary, run its malicious
probe and observe failure, restore the utility call, and rerun GREEN.

- [x] **Step 6: Commit**

Commit as `fix(errors): share string-only fallback selection`.

### Task 3: Documentation And Final Evidence

**Files:**
- Modify: `.superpowers/sdd/ninth-final-review-fix-report.md`
- Create: `.superpowers/sdd/tenth-final-review-fix-report.md`
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`

**Interfaces:**
- Consumes: final committed code, exact command output, commit IDs, test totals
- Produces: corrected ninth-wave claims and tenth-wave durable handoff evidence

- [x] **Step 1: Run final verification**

Use fresh approved temp roots for every Host process and run focused Host, full
Host, full Extension, build, source-only compileall, static scans, version/
generated-output checks, and `git diff --check`. Skip authenticated smoke.

- [x] **Step 2: Correct documentation**

Replace ninth-wave overclaims with the actual limitation and point to the tenth
fix. Document explicit transaction phases, cleanup Retry UX, and the shared
string-only boundary.

- [x] **Step 3: Write the tenth report**

Record starting/final heads, commits, RED/GREEN/mutation evidence, exact totals,
build results, constraints, concerns, and pending broad review.

- [x] **Step 4: Verify and commit evidence**

Run final diff/static checks and commit as `docs(verification): record tenth review fixes`.
