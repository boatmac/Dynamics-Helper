# Pragmatic Visible Completion Qualification Design

> **Current status:** Accepted qualification criteria, not an active plan. The
> B2 build/gates below described as pending are historical: local checks later
> passed and the normal cloud update failed under Defender. Remaining scenarios
> were not run. See `docs/plan-d-pragmatic-cloud-pc-results.md` and start at
> `docs/session-handoff-2026-07-15.md`. Local diagnosis and the offline attribution
> check are complete, not B2 delivery; no evidence-backed code fix was identified.
> Product work remains paused and Cloud PC transfer is deferred. New work requires
> separate approval. Retained future-tense language grants no execution permission.

## Scope And Authority

The user approved the checklist-based approach on 2026-09-07: one common
checklist, three scenario differences, and at most three interruption attempts.
This document records that design for written review. It is not an executable
runbook or permission to change versions, build artifacts, distribute packages,
install, stop processes, modify browser state, publish, or change the old PC.

Product semantics and cross-version rules remain defined by
[the visible-completion design](2026-09-05-visible-update-completion-design.md).
This document simplifies qualification organization, not those safety rules.
The abandoned qualification draft is not authority and must not be restored.

After written review, a short implementation plan will update the existing
[runbook](../../plan-d-pragmatic-cloud-pc-runbook.md) and
[results ledger](../../plan-d-pragmatic-cloud-pc-results.md). Until those changes
are reviewed, the historical procedures are not ready for execution. No new
fault harness, persistent controller, or cross-reload watcher is introduced.

## Evidence Boundary

Product implementation ends at `cf016b7`: 997 Extension tests and 227 focused
tests passed, TypeScript and the local Extension build passed, and the isolated
Host suite ran 666 tests with 665 passing and one environment-gated skip.
The skipped frozen-runtime test is not a PASS. Full-suite React act warnings
and the stale Browserslist notice remain disclosed in the implementation record.

These are source-verification results, not evidence for a B2 ZIP that has not
been built. Current B2 artifact identity, its five gates, and all three cloud
scenarios remain `PENDING`; preserve historical A/B1 evidence separately.

Automated tests own exact 7,999/8,000 ms timing, stale callback rejection,
visibility epoch resets, transport failures, StrictMode cleanup, duplicate ACKs,
and new-protocol rollback-to-Retry behavior. Cloud checks are approximate
integration evidence, not a second timing or fault-injection test framework.

## Common Checklist

| Gate | Required evidence before proceeding |
| --- | --- |
| Authorization | Explicit approval for the next version/artifact, distribution, or cloud mutation boundary; design approval alone permits none of these |
| Artifact | Immutable B1 and B2 source/version/ZIP SHA-256 identities; use the exact verified complete packages |
| B2 automated gates | `Host full suite`, `Extension full suite`, `Extension production build`, `Frozen Host build/probe`, and `Static/reachability checks`, all current and exactly PASS |
| Environment | Disposable cloud PC, no customer data, installed frozen Host, complete locally copied installers, public beta discovery disabled; old PC unchanged |
| Baseline | Before each scenario, establish and verify complete B1 using its matching installer; browser candidate/terminal state must also meet the reviewed baseline guard |
| Product | Matching Host/Extension versions, expected registration and capabilities, packaged/verified integrity, and the scenario's exact terminal evidence |
| Functionality | Analyze and Options smoke pass using non-customer inputs; record only PASS/FAIL |
| Completion | Apply the visible-completion checklist to a committed B2 terminal result |
| Closure | Record the disposition and clean only the private distribution resources owned by this qualification run |

An installer does not clear Chrome storage. The existing B1 terminal state
therefore needs a separately reviewed, exact historical-state cleanup before
the first transaction. Do not reuse the per-attempt rolled-back-state guard for
that initial committed B1 state. If either baseline guard cannot establish its
expected identity and safe terminal condition, stop and preserve evidence.

## Visible Completion Checklist

1. After B2 reloads, open the FAB menu and observe its terminal banner. Do not
   require a cold-start bubble or change the Status bubble preference.
2. Before that surface completes its eight-second interval, close the menu and
   move to foreground Options. Options is the intended winning surface; observe
   its completion for approximately eight continuous visible seconds.
3. Return to FAB and verify global disappearance. Refresh FAB and Options and
   verify non-replay, durable `idle`, and absence of the candidate URL using the
   reviewed read-only inspection. Never send a manual completion ACK.

Do not leave another qualifying foreground surface visible long enough to
consume the result before this observation. If it does, record that the winning
surface was not observed as intended rather than inventing timing evidence;
do not seed a fake completion to repair the record.
Only the open terminal menu, an actually visible exact-transaction completion
bubble, or foreground Options counts. A closed red dot is not observation.

## Three Scenarios

| Scenario | Difference from the common checklist | PASS condition |
| --- | --- | --- |
| 1. Uninterrupted B1 to B2 | Start the exact private B2 candidate from verified B1; do not interrupt | Committed B2, matching finalization evidence, allowed terminal residue only, all product/smoke/completion checks pass |
| 2. Interrupted recovery | Capture and interrupt the exact original runner, prove a zero-executor interval, then observe the recovery runner under separately approved process boundaries | Recovery commits B2 with all three interruption witnesses and every common B2 gate passing |
| 3. Matching-installer repair | From verified B1, record user-file fingerprints privately in memory, install full B2, add the reviewed harmless sentinel, then rerun that same complete B2 installer | Installer exit 0 and success marker, sentinel absent, user-file set and bytes unchanged, matching verified B2 and smoke pass |

For Scenario 3, the sentinel is `_internal/dh-cloud-pc-sentinel.txt`. The protected
file set is `config.json`, `copilot-instructions.md`, and `user_prompt.md`,
including presence/absence. Do not persist their contents or hashes in the
ledger. Report the repaired product as `installer-repaired B2`, not an updater
commit. If there is no completion result, its lifecycle check is `N/A`, not PASS.

Identity, path type, reparse-point, process-query, registry-read, enumeration,
or integrity uncertainty fails closed. Never guess a PID or treat an unreadable
namespace as empty. The later runbook must retain concrete guards for these
checks, not replace them with an operator assertion.

## Bounded Interruption Attempts

A new transaction counts once `DH_UPDATE_START` allocates and durably exposes
its identity. Setup failure before allocation does not count and must be fixed
before start. Every allocated transaction counts, including an operator abort.
No fourth attempt is allowed, and each mutation still needs its own approval.

| Attempt outcome | Disposition and next action |
| --- | --- |
| Exact interruption, zero-executor proof, recovery witness, committed B2, all gates pass | `PASS`; stop Scenario 2 attempts |
| Safe B1 rollback with complete interruption evidence | `SAFE_ROLLBACK_INCONCLUSIVE`; guarded cleanup and baseline rebuild only if another attempt remains |
| Safe B1/B2 terminal but any interruption witness missing | `INTERRUPTION_EVIDENCE_INCONCLUSIVE`; perform the version-specific cleanup below before any permitted retry |
| Preparing/activating error, post-allocation abort, recovery-required, mixed/integrity/residue failure, or B2 lifecycle/smoke failure | `FAIL`; no next transaction; stop qualification and investigate, with matching-installer settlement only under reviewed guards and approval |

Safe B1 rollback restores code without the new ACK protocol and cannot prove
one-shot rollback behavior. Before a retry, require the captured transaction's
canonical rolled-back `updates/finalization-ack.json`, matching verified B1,
strict old browser state `{kind, update, outcome}` with the exact B2 candidate,
and the full terminal residue allowlist from the governing design. Active,
transaction/receipt contents, cursors/scratch, RunOnce, status-host registration,
and executor processes must be absent; optional empty parents must be plain
non-reparse directories. Only then may the approved guard remove exactly
`dh_update_state`, normally Stop/wake the Worker, verify public/stored idle with
no URL, and re-establish B1. Never bulk-clear storage or recovery files.

A safe committed B2 with missing witnesses must first complete the normal
visible UI ACK and reach durable idle/no URL before reinstalling B1. A failed
lifecycle check is FAIL, not an evidence-inconclusive retry opportunity.

After three inconclusive transactions, record
`BLOCKED: SAFE_ROLLBACK_INCONCLUSIVE` only if all three have that exact
disposition; otherwise record `BLOCKED: INTERRUPTION_EVIDENCE_INCONCLUSIVE`.
A FAIL always takes precedence and must never be relabeled inconclusive.

The ledger has at most three attempt rows: ordinal, transaction identity,
interruption/zero-executor/recovery-witness booleans, terminal version/outcome,
gate result, disposition, and cleanup/baseline readiness. Do not prefill rows
or record a transaction that was never allocated.

## Cleanup And Delivery Boundary

The operator performing an approved private distribution owns its cleanup.
Record resource ownership privately at creation. On PASS, FAIL, abort, or BLOCKED,
verify that ownership before revoking this run's access and removing its private
object/container as applicable. Do not delete a shared resource or revoke
unrelated access. If cleanup fails or ownership is uncertain, report cleanup as
blocked and do not claim operational closure; do not retry with broader scope.

Distribution cleanup is separate from product recovery settlement. It must not
delete transaction journals, backups, finalization evidence, or arbitrary
browser state. Any matching-installer repair or guarded browser cleanup remains
a separately approved operation even after a failed qualification attempt.

Public evidence contains artifact identity and sanitized check results only:
no private URLs/SAS, cloud account/resource identifiers, user-file hashes,
case numbers, customer content, prompts, or full logs. Keep operational secrets
out of the repository, including this design and the future plan.

The next documentation change aligns the existing runbook and ledger with this
design, removes obsolete forced-bubble/mounted-time/B1-rollback-PASS instructions,
and preserves historical evidence. Product code, version carriers, packaging,
cloud execution, publication, and workstation migration remain outside that
documentation change. Passing cloud qualification will not itself authorize
release or migration.
