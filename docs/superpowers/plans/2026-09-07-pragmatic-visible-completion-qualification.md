# Pragmatic Visible Completion Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing qualification runbook and results ledger with the approved pragmatic visible-completion design, without executing qualification.

**Architecture:** Keep one common checklist and three scenario differences in the runbook; keep historical, source-only, and current artifact evidence separate in the ledger. Preserve concrete safety guards and fail-closed execution barriers. Prepared/reviewed guards do not remove remaining execution barriers or permit operator assertions.

**Tech Stack:** English Markdown, existing PowerShell/DevTools documentation, read-only Git diff and text inspection. No production-code changes, TDD, new tests, harness, or placeholder scripts are needed for this documentation edit.

---

## Scope And Inputs

- Worktree: `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`.
- Approved authority: `docs/superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md` (159 lines).
- Product and residue authority: `docs/superpowers/specs/2026-09-05-visible-update-completion-design.md`, especially **Cross-Version Rollback Qualification**.
- Documentation alignment is complete in `docs/plan-d-pragmatic-cloud-pc-runbook.md` and `docs/plan-d-pragmatic-cloud-pc-results.md`; this plan records documentation completion only.
- The preparation-status follow-up below supersedes earlier missing-guard requirements, without authorizing execution or changing the approved designs.
- Do not modify the approved designs, historical evidence, production code, version carriers, or package inputs.
- No commit, tag, push, publish, build, packaging, dependency installation, cloud connection/mutation, browser operation, process termination, distribution, or workstation migration.
- Documentation alignment does not authorize any of those boundaries. Do not resurrect the abandoned qualification draft.

### Task 1: Align Current Runbook Rules

**File:** Modify `docs/plan-d-pragmatic-cloud-pc-runbook.md` only.
**Sections:** **Safety Contract**, **Scope And Evidence Rules**, **Qualification Entry Gate**, **Artifact Identity**, **Installer Commands**, **Establish `plan-d-b1`**, **Controlled Candidate Start**, **Terminal Verification And Cleanup**, and **Scenarios 1-3**.

- [x] **Step 1: Replace stale task-number authorization and add the common checklist.**

Use this current-status wording in **Scope And Evidence Rules**:
> NOT EXECUTION READY. This document aligns qualification rules only. B2 identity and five current artifact gates remain PENDING. Every future artifact, distribution, process, browser-cleanup, and installer mutation boundary requires its own explicit approval and reviewed concrete guards.

Insert **Common Qualification Checklist** before **Establish `plan-d-b1`** with the approved design's nine gates: Authorization, Artifact, B2 automated gates, Environment, Baseline, Product, Functionality, Completion, Closure.
Require immutable B1/B2 source/version/ZIP SHA-256 identities, exact complete locally copied packages, installed frozen Host, disposable non-customer cloud PC, public beta discovery disabled, verified versions/registration/capabilities/integrity, and PASS/FAIL-only smoke evidence.
Retain historical A as evidence only and leave the old PC unchanged. Qualification does not authorize publication or migration.
Preserve every existing blocking `throw` in **Qualification Entry Gate**, **Artifact Identity**, and the unprepared B2 installer block; do not fill artifact placeholders or claim the old blocks are executable.

- [x] **Step 2: Replace forced-bubble instructions with the exact visible sequence.**

Replace **Status Bubble Qualification Precondition** with **Visible Completion Observation Order** and replace the cloud paragraph in **Completion Lifecycle Evidence** with:
> After B2 reloads, first open the FAB menu and observe its terminal banner. Close the menu before it completes eight visible seconds, then foreground Options for approximately eight continuous visible seconds. Options is the intended winning surface. Return to FAB to verify global disappearance; refresh FAB and Options and use the reviewed read-only projection to verify non-replay, durable public/stored idle, and no candidate URL.

Add immediately after it:
> Do not open or foreground Options for terminal inspection, capabilities, integrity, or smoke checks before this observation sequence: it can consume completion first. Keep other qualifying surfaces from winning. If the intended winning surface was missed, record that fact; never invent timing evidence or seed fake completion. A closed red dot is not observation. Never send a manual completion ACK or treat its response as live authority.

In **Controlled Candidate Start**, retain B1 Options/DevTools candidate seeding and normal Worker Stop/wake, but remove the instruction to keep Options foreground through terminal completion; after start, leave Options non-foreground before B2 terminal display.
Replace its "After any reload ... Reopen Options DevTools" instruction with "After B2 reload, perform Visible Completion Observation Order before reopening Options DevTools for terminal inspection."
Move the opening Options-dependent checks in **Terminal Verification And Cleanup** after that sequence; capture transaction identity before reload and use read-only disk evidence without foregrounding Options prematurely.
Remove current requirements to enable, snapshot, restore, or reread the Status bubble preference throughout Scenarios 1/2 and terminal instructions. Do not remove the unrelated harmless Options smoke persistence/restore check.
Keep the existing URL-presence-only projection. Replace mounted-time language, including Scenario 3, with continuous visible-time wording; no cold-start bubble is required.
Keep exact 7,999/8,000 ms, visibility epochs, stale callbacks, transport failures, StrictMode cleanup, duplicate ACKs, and new-protocol rollback-to-Retry as automated evidence, not a new cloud timing framework.

- [x] **Step 3: Replace Scenario 2 outcomes and retry rules without weakening process guards.**

In **Scenario 1**, require committed B2, matching finalization, full allowed residue checks, smoke checks, and the shared visible checklist; any other outcome fails.
In **Scenario 2**, preserve **Read-Only Watchers**, **One-Shot Original-Runner Interruption**, **Zero-Executor Checkpoint**, and **Recovery-Runner Witness** concrete identity/authority checks.
Replace the recovery conclusion and **Retry Rules** with this disposition table:

| Allocated transaction outcome | Disposition |
| --- | --- |
| Exact original-runner interruption, zero-executor proof, recovery witness, committed B2, every B2 gate passing | PASS; stop attempts |
| Safe verified B1 rollback with all three witnesses | SAFE_ROLLBACK_INCONCLUSIVE; guarded cleanup before any remaining attempt |
| Safe verified B1/B2 terminal with any witness missing, and no failed required gate | INTERRUPTION_EVIDENCE_INCONCLUSIVE; version-specific settlement before any remaining attempt |
| Preparing/activating error, post-allocation abort, recovery-required, mixed/integrity/residue failure, or B2 lifecycle/smoke failure | FAIL; stop qualification, no next transaction; separately approved guarded settlement only |

Add: "Count an attempt when DH_UPDATE_START allocates and durably exposes its transaction identity. Every allocated transaction counts, including aborts. Fix pre-allocation setup failures before start; they do not count. At most three allocated transactions, never a fourth."
Add: "After three inconclusive attempts, use BLOCKED: SAFE_ROLLBACK_INCONCLUSIVE only if all three dispositions exactly match; otherwise use BLOCKED: INTERRUPTION_EVIDENCE_INCONCLUSIVE. FAIL always takes precedence."
Delete automatic rerun/rebaseline and Retry instructions that contradict failure-stop rules. Safe B1 rollback is never B2 one-shot/rollback PASS evidence; B1 lacks the new ACK protocol.

- [x] **Step 4: Add non-executable settlement contracts and unconditional installer ordering.**

Add **Per-Attempt B1 Rollback Cleanup Contract** after **Retry Rules**, explicitly labeled:
> GUARD PREPARED; ISOLATED CHECKS PASSED; INDEPENDENT REVIEW PASSED; NOT EXECUTION READY. Real cleanup remains PENDING. This preparation status is not permission to remove browser state; manual assertions cannot substitute for the guard or independent operation approval.

Require the captured transaction's canonical rolled-back `updates/finalization-ack.json`; matching verified B1 Host/Extension; strict own-data browser keys `{kind, update, outcome}` without `transactionId`; `complete/rolled-back`; and exact B2 candidate identity with its privately verified strict HTTPS ZIP URL.
Require the full governing residue allowlist: fixed matching ACK only; no active authority, transaction/receipt contents, cursor/scratch, RunOnce, status-host registration, runner, or status-host process. Optional namespace parents must be plain non-reparse directories with zero entries.
Only the concrete reviewed guard, after remaining readiness gates and separate operation approval, may remove exactly `dh_update_state`, normally Stop/wake the Worker, prove public/stored idle/no URL, and permit rebuilding B1. Never bulk-clear storage or delete recovery evidence.
Retain **One-Time Private B1 Completion Cleanup** unchanged as the separate historical committed-B1 identity/guard; it cannot be reused or parameter-swapped for a rolled-back attempt. Neither guard substitutes for the other.
Add to **Installer Commands**, the terminal-to-next-scenario paragraph, and the first step of every scenario:
> Before any cross-scenario baseline installer, the previous transaction must already be safely settled and browser state must be durable idle with no URL, regardless of its disposition. An installer does not clear Chrome storage. If this cannot be proved, stop; any necessary recovery installer is a separate, explicitly approved settlement operation, not a next-scenario baseline.

For safe committed B2 missing witnesses, require normal visible UI ACK and durable idle/no URL before B1 reinstall. A failed lifecycle is FAIL, never an inconclusive retry opportunity.
Preserve all concrete path-type, reparse, exact-process, registry-read, enumeration, integrity, and terminal-byte checks. Unreadable/uncertain namespaces are not empty; never guess a PID.

- [x] **Step 5: Correct Scenario 3 safety status and add all-outcome distribution closure.**

Above Scenario 3's user-file capture/comparison and sentinel blocks, insert:
> GUARD PREPARED; ISOLATED CHECKS PASSED; INDEPENDENT STATIC REVIEW APPROVED. Narrow guards cover exact canonical roots/ancestors, regular-file and non-reparse checks, error-propagating existence/enumeration, and sentinel creation/absence verification. Real-environment verification remains PENDING; do not execute them. No operator assertion can make these snippets execution-ready.

Specify fixed sentinel `_internal/dh-cloud-pc-sentinel.txt`: require safe plain parents and confirmed prior absence; never overwrite an existing entry. Validate protected `config.json`, `copilot-instructions.md`, and `user_prompt.md` including absence, rejecting unsafe roots/files and unreadable paths both before and after repair.
Keep fingerprints private and in memory only. Require the same complete B2 installer twice, exit 0 plus `SUCCESS: Update Complete!`, sentinel absent, identical protected-file set/bytes, verified matching B2, and smoke PASS.
Record `installer-repaired B2`, not updater commit; lifecycle is `N/A - no terminal completion notice` only if none exists, otherwise use the shared visible sequence before Options-based inspection/smoke.
Do not introduce executable destructive code in this status sync. Guard preparation/review is complete; real-environment verification and separate operation approval remain future readiness gates. Leave existing unprepared-block throws intact.
Add **Private Distribution Closure** before **Environment Handoff**:
> On PASS, FAIL, abort, or BLOCKED, the distributing operator must verify privately recorded ownership before revoking this run's access and removing only its private object/container as applicable. Never delete shared resources or revoke unrelated access. Cleanup failure or uncertain ownership means cleanup BLOCKED and no operational closure; do not broaden retries. Distribution cleanup is separate from product settlement and must preserve journals, backups, finalization evidence, and browser state.

**Verification:** Read only the named changed sections and their diff. Trace Scenario 1, Scenario 2 committed/rollback/missed-witness/failure paths, and Scenario 3 from baseline to closure; no path may foreground Options early, treat B1 rollback as PASS, bypass settlement, or execute an unprepared block.

### Task 2: Separate Ledger Evidence And Add Attempt/Closure Records

**File:** Modify `docs/plan-d-pragmatic-cloud-pc-results.md` only.
**Sections:** **Scope**, **Artifact Identity**, **Historical B1 Automated Gate Evidence**, **Current B2 Automated Gates**, **Cloud PC Scenarios**, and new sections immediately before **Environment Handoff**.

- [x] **Step 1: Preserve history and insert a separate source-evidence section.**

Leave A/B1 artifact rows, all historical automated/baseline/transaction rows, and the earlier 951/181/55 source note unchanged. Do not relabel the technically committed historical B1 update as failed.
Insert **Visible Completion Source Verification** before **Current B2 Automated Gates**, using:
> Source implementation ends at cf016b7: Extension 997 passed; focused tests 227 passed; TypeScript and local Extension build passed; isolated Host suite 666 total, 665 passed and one environment-gated frozen-runtime skip. The skip is not PASS. Full-suite React act warnings and the stale Browserslist notice remain disclosed. These are source-only results, not evidence for an unbuilt B2 ZIP.

Keep B2 source/hash/result and all five current gate rows PENDING: Host full suite, Extension full suite, Extension production build, Frozen Host build/probe, Static/reachability checks. Keep all three scenario results PENDING and handoff rows unchanged.
In **Scope**, add "NOT EXECUTION READY; historical evidence and source tests do not satisfy current B2 artifact gates or authorize operations."

- [x] **Step 2: Replace current scenario criteria and add an empty attempt ledger.**

Replace **Cloud PC Scenarios** prose with Task 1's committed-B2-only Scenario 1/2 PASS rules and Scenario 3's installer-repaired/N/A distinction; retain the unexecuted scenario rows.
Use "Completion lifecycle: FAB menu observed, closed before eight seconds, foreground Options observed for approximately eight continuous visible seconds, global disappearance, refreshed FAB/Options non-replay, durable public/stored idle and no URL; no manual ACK."
Remove current forced-bubble/preference-restoration and B1 rollback-to-Retry PASS requirements, without editing historical smoke restoration evidence.
Insert **Scenario 2 Allocated Attempts** with this header and separator only; no prefilled attempt rows:
| Ordinal | Transaction ID | Interruption witnessed | Zero executor proved | Recovery witnessed | Terminal version/outcome | Gates | Disposition | Cleanup/baseline readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
State "Append only actually allocated transactions, at most three. Apply the runbook disposition table and aggregate BLOCKED rules verbatim; FAIL stops and takes precedence. Prepared/reviewed guards do not establish real cleanup readiness; environment verification, separate authorization, and execution evidence remain PENDING."

- [x] **Step 3: Add closure accounting without secrets or invented outcomes.**

Insert **Private Distribution Closure** with "Status: PENDING; no operational closure claimed" and record requirements for eventual outcome, ownership-check result, run-owned access revocation, object/container cleanup, and separate product-settlement status.
Require closure handling on PASS/FAIL/abort/BLOCKED; uncertainty/failure is cleanup BLOCKED, never broader deletion. Store ownership identifiers privately, not in ledger columns.
Extend the final privacy sentence to exclude private URLs/SAS, cloud account/resource identifiers, user-file hashes/contents, case identities, prompts, screenshots, and full logs. Public evidence is immutable artifact identity plus sanitized check results only.

**Verification:** Compare historical rows byte-for-byte in the diff; current B2's five gates and three scenario results must remain PENDING. Check no attempt rows or successful cleanup are invented, source counts are separate, and all four closure outcomes are covered.

### Task 3: Static Review Only

**Files:** Review both edited documents above against both design inputs; no additional file edits.

- [x] **Step 1: Check scope and whitespace using read-only Git commands from the stated worktree.**

Run `git status --short`, `git diff --stat`, and `git diff --check` separately. Expected: runbook/results alignment plus this plan's status record; preserve unrelated pre-existing changes, including the approved spec; whitespace check exits 0. Inspect each document's scoped diff, not full giant runbook blocks.
- [x] **Step 2: Audit requirement coverage and safety barriers without executing embedded commands.**

Use targeted text searches for `bubble`, `mounted`, `restore`, `Options`, `rolled-back`, `Retry`, `throw`, `BLOCKED`, and `PENDING`; inspect matches in context rather than demanding zero matches. Historical wording, legitimate smoke restoration, and retained guards are intentional.
Confirm FAB-first ordering at every post-reload/terminal/repair entry; three allocated attempts maximum; unconditional safe settlement/idle before cross-scenario installers; FAIL-stop precedence; distinct initial committed-B1 and prepared/reviewed per-attempt rollback guards; and ownership-checked all-outcome cleanup.
Confirm concrete existing guards and unprepared-block throws survive, Scenario 3 snippets remain blocked, and no manual assertion, placeholder script, new harness/controller/watcher, or destructive executable code was added.
- [x] **Step 3: Report documentation coverage and unresolved readiness blockers.**

Report B2 identity/five gates/scenarios still PENDING; per-attempt B1 cleanup and Scenario 3 path guards prepared with isolated checks and independent review passed, not real-environment qualification. Existing artifact/installer/entry barriers remain. State NOT EXECUTION READY. Do not run tests/builds, commit, operate the cloud PC, or offer qualification results as part of this static review.

## Preparation Status Follow-Up

- [x] Synchronize preparation/review status only across runbook, results, and this plan; checked tasks mean documentation completion, not qualification or execution approval.
- B1 rollback guard: reported PS 54 passed / JS 75 passed and independent review passed; earlier 18 deferred-case RED checks resolved by the 30-second deadline fix. Runbook code markers: `DH-B1-ROLLBACK:PS` / `DH-B1-ROLLBACK:JS` BEGIN/END.
- Scenario 3 guards: reported 27 mock tests passed and independent static review APPROVED. Runbook code markers: `DH-S3:HELPERS`, `CAPTURE`, `CREATE`, `ABSENCE`, `COMPARE` BEGIN/END. See [Guard Preparation Evidence](../../plan-d-pragmatic-cloud-pc-results.md#guard-preparation-evidence).
- Tests exist only as Temp files, not repeatable repository tests or CI gates; no new harness. This sync does not rerun them or change guard code. Real Windows PowerShell 5.1, reparse/ACL behavior, and OS Known Folder queries remain unverified. Quiescent point-in-time checks retain non-atomic TOCTOU limitations.
- Six blocking throws remain unchanged: Qualification Entry Gate, B2 Artifact-Hash Placeholder, Complete B2 Installer Placeholder, One-Shot Original-Runner Interruption, Zero-Executor Checkpoint, Recovery-Runner Witness.
- Historical/source evidence is unchanged. B2 immutable source/ZIP identity, all five B2 artifact gates (Host full suite, Extension full suite, Extension production build, Frozen Host build/probe, Static/reachability checks), real scenarios, and closure remain PENDING. Exact B1/B2 versions and installed frozen Host remain mandatory; every operational boundary still requires its own explicit authorization. NOT EXECUTION READY.
