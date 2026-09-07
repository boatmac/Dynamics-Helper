# Dynamics Helper Development Handoff

Updated: 2026-09-07. This existing file is the single development recovery entry.
Read `../AGENTS.md` for execution rules. Older contents are retained in Git at
`6413dbad9bd258bb04cf313610d602b68424e091`; do not execute their restart steps.

## Current Mode

Latest user correction: remain in the LOCAL development checkout and complete a
bounded milestone before considering Cloud PC transfer. This supersedes the
earlier immediate-Cloud-PC direction. Do not equate documentation cleanup with
successful B2 product delivery. The user approved the bounded local diagnosis
milestone recorded below, not implementation. Update experiments and tool
migration remain paused. The user has now
confirmed global OpenCode Superpowers removal from the MyCasesKit session also
applies to Dynamics Helper. Do not repeat that removal here. Pi installation,
other tool/skill changes, machine configuration, pushes, and publication remain
unauthorized. The user subsequently approved one local commit of the 35 Markdown
changes, as recorded in the local commit boundary below.

## OpenCode Restart Decision

- User-confirmed on 2026-09-07: `obra/superpowers` registration was removed from
  `~/.config/opencode/opencode.json` in the MyCasesKit session. This is an explicit
  cross-project decision, not an inferred MyCasesKit workflow requirement.
- The OpenCode-specific cache was moved to
  `C:\Users\zhaobo\AppData\Local\Temp\opencode\superpowers-removal-20260907-220129`.
  This session checked that the registration is absent and backup directory
  exists; it did not repeat removal or audit the backup contents.
- No project-local `opencode.json`, `opencode.jsonc`, or `.opencode` directory was
  found in this development checkout, the other `Dynamics-Helper` checkout, or
  checked parents through `C:\MyWorkbench`. Here `.superpowers` contains only
  `sdd` progress records, not a plugin loader. Plan text is not runtime loading.
- Per the user's report, other tools' Superpowers installations, product skills,
  source, tests, and designs were not removed. Pi and `mattpocock/skills` were not
  installed. Do not install either or alter those other tools as a follow-up.
- Already injected instructions remain in this old OpenCode session. Exit
  OpenCode, restart, and create a NEW session; do not resume this session to try
  to unload them. Do not use Superpowers automatic orchestration meanwhile.

## Repository Identity

| Role | Last verified location and state |
| --- | --- |
| Development source | `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`, branch `hardening/plan-d-runtime-installer` |
| Product source checkpoint | `6413dbad9bd258bb04cf313610d602b68424e091` (B2 version and qualification preparation) |
| Other local checkout | `C:\MyWorkbench\Repository\Dynamics-Helper`, `master` at `bfedc9f`; NOT the current development branch |
| Completed alignment release | Linked worktree `C:\MyWorkbench\Repository\Dynamics-Helper-alignment-rc`, branch `release/alignment-2.0.75-beta.1`, HEAD `fcc21f2` |

The development source is a normal checkout with its own `.git`; the alignment
RC is its linked worktree. At recovery audit the development branch was 51
commits ahead of its local tracking ref. No server fetch was performed. The
Cloud PC source-checkout path and agent setup are not yet verified; do not assume
that its installed product directory is a source repository.

When transferred, use the exact cleanup commit approved for transfer, whose
ancestry includes the product checkpoint above. Run only read-only Git identity
and status checks first. Report discrepancies instead of checking out, resetting,
installing, or running tests to force agreement.

## Historical Uncommitted Interruption State

Before the documentation commit, HEAD was
`6413dbad9bd258bb04cf313610d602b68424e091`. At entry to this follow-up,
18 tracked Markdown files were modified, none staged, with no untracked files.
They contain the prior handoff/runbook cleanup, updated failure evidence, history
notices and execution rules. This follow-up additionally neutralizes remaining
Superpowers-specific instructions in existing plans; it does not erase the
earlier uncommitted edits. Use `git status --short` for the final exact file list.

At this follow-up's completion, 35 tracked Markdown files are modified and none
are staged. The 17 additional plan files change only their workflow-plugin header
(plus one tool-bound paragraph in Plan E). No tracked source, test, build or
installer file changed. `git diff --check` passed; no product tests were run.

Three ignored local progress records also received historical-entry notices:
`.superpowers/sdd/plan-d-reliable-update-progress.md`,
`plan-d-restart-handoff-2026-08-26.md`, and
`plan-d-registration-quiescence-progress.md` in that same directory. They are
not required on Cloud PC. There is no uncommitted product implementation or
Defender fix. Documentation static checks are not a new product test result.

## Product Goal And Delivery State

The original goal was deterministic prompt-source alignment: remove duplicate
workspace instruction injection, select DH-specific OR repository instructions,
keep Custom User Prompt separate, and make the selection understandable in
Options. This foundation does not implement MyCases Stage 0/1 orchestration.

| Work | Committed / verified evidence | Delivery state |
| --- | --- | --- |
| Alignment-only | Released tag `v2.0.75-beta.1`, source `488f6f5`; historical Host 210/210, Extension 343/343, paired build/frozen checks | Existing independent release; do not reopen it as unfinished Plan D work |
| Reliable updater | Plan A/B/C connected to production; complete-version verification and rollback implemented | A-to-B1 succeeded; later B1-to-B2 failed under Defender |
| Visible completion | Implementation through `cf016b7`; only a real foreground surface visible continuously for eight seconds can acknowledge completion | Automated verification passed; successful B2 cloud lifecycle NOT demonstrated |
| B2 candidate | Version `2.0.76-beta.2`, source bound to `6413dba`; Host 666/666, Extension 997/997, builds, frozen probe and static checks passed | Built, NOT published, NOT qualified for delivery |

Exact package identities and execution evidence are in
[the results ledger](plan-d-pragmatic-cloud-pc-results.md). B2 was built before
its source-binding commit; matching packaged inputs were subsequently checked.
Do not describe it as a rebuild from that commit. Tests are historical results
for those inputs, not tests run in the new Cloud PC development environment.

## Last Product Failure

Normal B1-to-B2 transaction `ed2ff2cbbb31e571d69fc361d83777e2` failed on
2026-09-07 when Defender reported `Behavior:Win32/Persistence.A!ml` and quarantined
Host/recovery executables. The user allowed an action; the product then reported
rollback. Host and Extension were verified as packaged B1. Reported ACK outcome
was rolled-back; active/cursor were absent and transaction/receipt counts zero.
Full strict residue checks and durable browser idle were not completed.

The temporary private distribution was deleted and its URL returned 404. Do not
reuse it. Defender's CURRENT allow/override state is unknown: the last requested
read-only preference check has no returned result. Do not treat either a past
UI label or an assistant assertion as current configuration evidence.

A/B1 frozen module comparison found only the product version constant changed;
the other observed differences were packaging metadata. Defender engine/platform
versions were unchanged, security intelligence differed, and cloud intelligence
retrieval preceded detection. Six inspected configuration events concerned
`ToastOrSsoTrigger`, not identified protection switches. These observations do
not prove a false positive or a specific rule trigger. No Defender fix is
implemented. Code signing, report submission, RunOnce changes, and a replacement
updater architecture are NOT approved solutions.

## Authority And Historical Documents

| Topic | Reference and effect |
| --- | --- |
| Prompt behavior | `superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md`, implemented foundation |
| Reliable update scope | `superpowers/specs/2026-09-01-plan-d-reliable-auto-update-design.md`, accepted scope including explicit deferrals |
| Completion behavior | `superpowers/specs/2026-09-05-visible-update-completion-design.md`, supersedes mounted-time consumption |
| Qualification criteria | `superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md`, accepted criteria, NOT permission to operate |
| Current failure/evidence | `plan-d-pragmatic-cloud-pc-results.md` |
| Update-operation boundary | `plan-d-pragmatic-cloud-pc-runbook.md`, paused; no runnable migration recipe |

Plans record how previous work was attempted or implemented. Unchecked boxes,
skill invocations, old paths, and embedded commands do not constitute new work.
Do not revive retired evidence executors, bootstrap/registration protocols, or
repeat unavailable Task 6/7 evidence. Those reports remain UNRECOVERABLE; current
tests cannot reconstruct their historical execution order.

## Verified User Agreements

Original OpenCode session: `ses_09bdb9891ffevkOeLrt2sCXWpm`. Dates below are UTC+8.
These are lookup keys, not requirements to keep using OpenCode.

| Date | Agreement / evidence |
| --- | --- |
| 07-15 | Prompt scope approval: `msg_f652a5837001lq1n2K7k269cNQ`; original scope: `msg_f642467980015qEjCUW2qpY6k4` |
| 08-25 | More than ten hours without results caused shutdown; user challenged scope and observability: `msg_036c69cfe001ROwdCS93hj0QQg` |
| 08-31 | At most three review rounds, then report; over five minutes is not a wait-for-approval gate; full suites report N/total: `msg_05800e097001DowFq7QTAzUQpF` |
| 08-31 | Imperfect functionality may be acceptable, partially implemented functionality is not: `msg_0581ab6f9001O71XhzWgiNhDu1` |
| 09-01 | Minimal reliable-update scope accepted: `msg_05c14ce8d001ke6Mjvwr7PWkC6`, responding to `msg_05c12c5c4001aP5TuDCKZaolbH` |
| 09-01 | User again challenged unmonitored subagents: `msg_05da486b2001NfbWB4aIuf5El1`; 2-3 minute reporting was the assistant's subsequent commitment, not a user quotation |
| 09-05 | Visible-completion design approved: `msg_0716bc30f0012g1HnSLUaHrteq` |
| 09-07 | Do not expand simple work: `msg_07aa486c4001SYZYhV3lDYZjMz`; no meaningless continue prompts: `msg_07b76743d0011CJcLc861Fpuwo` |
| 09-07 | Local build, private normal-update trial, then local commit approvals: `msg_07aa4d900001UR01VPUVW2Cnfg`, `msg_07afdaf7d001XuvGYbgXCSXqrx`, `msg_07b27ecf500126yystWfZR2TQT`; no B2 push/tag/publication approval |
| 09-07 | Stop product work for recovery/migration preparation: `msg_07c10baed0011QV8uunipULjM3`; later instruction clarifies Cloud PC, not local, as the intended development environment |

Synthetic continue messages, compaction summaries, and subagent dispatches are
not user approvals. Another project's agreements do not automatically apply;
the explicitly shared OpenCode removal decision above is the stated exception.

## Deferred Cloud PC Transfer Boundary

Not the current task. These constraints apply only after the local milestone is
complete and a later transfer is explicitly approved.

Transfer the approved Git branch/history and this tracked context, not a copy of
the entire local workbench. Do not copy `node_modules`, venv, build/dist caches,
`.scratch`, old task controllers, agent configuration, credentials, or local
registry/browser/AppData state into the new source checkout.

Keep original sessions, necessary private logs, and exact A/B1/B2 artifacts in
separate private retention on the source machine; preserve them before deleting
or uninstalling anything. The tracking summaries here and in the ledger suffice
to start read-only orientation. Historical Temp tests and ignored progress notes
are optional evidence to consult, not startup dependencies or CI gates. No
evidence has been newly backed up or transferred by this documentation cleanup.

No project runtime/build dependency requires OpenCode or obra/superpowers.
Switching coding agents must not replace the product's Copilot SDK/CLI. Pi's
Windows shell, instruction loading, task monitoring, and compaction behavior
still need confirmation before product execution is enabled.

## Local B2 Diagnosis Milestone

The user approved diagnosis and a minimal repair recommendation only: reuse
existing comparisons, Defender events, and verification results; no product
edits, full-suite reruns, commits/pushes, cloud trials, security changes, or
updater redesign. This milestone is complete; implementation is not approved.

### Evidence And Recommendation

- Established: the normal B1-to-B2 transaction failed under runtime Defender
  quarantine. Restored B1 packaged integrity is verified; full settlement and
  current allow/override state remain unknown. Those are operational limits,
  not separately diagnosed code defects.
- Established: the recorded frozen comparison is A versus B1, NOT B1 versus B2.
  It found 691/692 PYZ payloads identical, with only the product version differing;
  it does not establish byte-identical executables or identical environments.
- A focused source comparison of B1 `5abe35a` against HEAD `6413dba` found no
  differences in `host/update_service.py`, `host/update_recovery.py`,
  `host/update_platform.py`, `host/update_engine.py`,
  `host/native_registration.py`, or `host/update_entrypoint.py`. This is a source
  comparison of six files, not another frozen-artifact equivalence claim.
- Browser prepare selects `RunnerSource.CURRENT` in `UpdateService.prepare`.
  `install_recovery_tree` copies the installed B1 Host into the runner/status
  roles. B2 candidate probes execute too; the transaction is not exclusively
  B1 execution. Changing only B2's updater cannot retroactively change B1's
  recovery preparation or launch during this incoming update.
- The inspected detached launch uses direct `CreateProcessW`; the probe uses
  `shell=False`; frozen registration and RunOnce name executables directly.
  Reported `cmd` detections do not identify a shell call to remove from this path.
- Hypotheses only: changed detection intelligence, unsigned identity, RunOnce,
  copied executable roles, or their sequence caused the verdict. Affected-item
  lists and temporal proximity do not establish the triggering operation or a
  false positive. No incident-backed source defect was identified.

Recommendation: NO product patch at this point (product change-file set: empty).
Do not remove RunOnce, rename recovery roles, switch launch mechanisms, sign
artifacts as an assumed cure, or redesign recovery to manufacture a deliverable.
Keep validated packages, transaction ownership/journaling, complete rollback,
user-file protection, detached recovery/next-logon recovery, and receipt/ACK
ordering unchanged. These mechanisms cannot guarantee recovery while their
required executables/runtime or backup bytes are unavailable under quarantine.

### Single Evidence Gap And Minimal Acceptance

The one repair-decision gap is attribution of this existing detection to a
specific DH-controlled operation and responsible executable/process, rather
than only resources subsequently reported as affected. Current allow state and
settlement must not be substituted for that causal evidence.

The proposed verification, subsequently approved and completed below, was one offline correlation
of already-retained private records for transaction
`ed2ff2cbbb31e571d69fc361d83777e2`: match the first detection to available process
identity/parentage, executable role/hash, and transaction phase/action. Do not
repeat A/B1 comparisons, export cloud evidence anew, run an update, alter security,
or collect customer/prompt content. A timestamp match alone is insufficient.
If existing records have no operation-level attribution, report the gap as
unresolved and stop; do not presume ordinary Defender events expose an internal
rule verdict or add diagnostic code without separate approval.

Minimum acceptance for that verification is either a traceable operation-to-code
attribution strong enough to propose a specific remedy, or an explicit negative
finding that the retained records cannot support one. Even attribution does not
prove a proposed change prevents future detection. Later approved focused,
isolated regression checks can establish the changed behavior and preserved
recovery contracts; neither static analysis nor local tests establish Defender
compatibility, historical full settlement, or successful B2 cloud delivery.

Historical B2 Host 666/666, Extension 997/997 and frozen/build gates are reused,
not rerun. This milestone performed read-only source/evidence inspection and
updated only this recovery entry; its existing uncommitted edits were preserved.

### Approved Offline Attribution Check: Complete

The user approved the bounded offline check after the diagnosis report. Existing
repository documentation/progress records and relevant retained files under the
approved local Temp workspace were inspected; no new cloud export, live event
query, update, test, or security operation was performed.

- One retained private XML export was located. Its six events are all event
  5007, records 6353-6356 and 6512-6513, concerning `ToastOrSsoTrigger`. It contains
  none of detection/action/intelligence events 1116, 1117, or 2010 and none of
  records 6522-6526. Event-system execution PID fields are not an attribution of
  the offending DH process or operation.
- The results ledger retains the reported first-detection timeline and rollback
  ACK fields, but not raw detection records or a causal process/operation chain.
  No saved incident journal, canonical ACK, or incident Host-log copy was located
  within the bounded search. Existing export/comparison scripts are not evidence
  output and were not executed. No raw private paths or XML were copied here.
- Result: the located retained evidence cannot attribute the verdict to a
  specific DH-controlled operation. This is a bounded not-located finding, not
  proof that no other privately retained record exists. The negative acceptance
  branch is satisfied; the causal gap remains unresolved and the check is closed.

Recommendation remains no product patch. B2 qualification remains FAIL, restored
B1 integrity remains verified, and full settlement/current allow state remain
unknown. Do not repeat this evidence search or collect fresh evidence without a
separately defined and approved scope. Only this recovery entry was updated.

## Local Documentation Closeout

The user was unsure whether other incident records existed and approved local
documentation closeout, not further investigation. The results ledger and the
September 7 qualification plan/design now describe completed local diagnosis,
deferred Cloud PC transfer, and paused product work instead of immediate Cloud PC
handoff preparation. Historical evidence and qualification criteria are retained.

Before the local commit approval, the stage outcome was reviewable, uncommitted
documentation: alignment remains
delivered, B2 local gates remain historical PASS, cloud qualification remains
FAIL, and no evidence-backed code remedy is available. Diagnosis/documentation
completion does not qualify B2 for delivery. No further record search, test run,
tool installation, migration, commit, or push is authorized by this closeout.

Static closeout checks passed: working-tree whitespace diff check, bounded
current-status consistency review, and seven local reference targets. Git emitted
only LF-to-CRLF notices; no line-ending conversion was performed. Product tests
and builds were not run. All existing uncommitted changes remain preserved.

## Next Single Action

Remain in the LOCAL checkout
`C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`. The user approved
one local documentation commit. Verify and report that commit and the worktree,
then stop and await a new user decision. No code repair is
recommended on present evidence; there is no remaining authorized evidence or
implementation task. Do not repeat global removal, start Cloud PC transfer,
install Pi, or infer a new update trial.

The user reports having started a new session, but it initially read the old
master checkout. That old checkout's clean status and July handoff do not describe
this work. This documentation checkpoint preserves the 35-file cleanup and
diagnosis outcome; it is not a B2 release or a product change. Push, publication,
tool installation, migration, and cloud operations remain unauthorized.

## Local Commit Boundary

The user explicitly approved the proposed local commit of all 35 Markdown
changes after documentation closeout. Complete added/deleted diff review found
documentation-only scope and no actual credentials, private delivery URLs, or
customer content in additions. Retired procedures remain available in Git at
the product checkpoint; no product source or executable was removed.

This approval covers only staging those reviewed files, one local documentation
commit, and read-only post-commit verification. The product source checkpoint
remains `6413dba`; use Git to obtain the documentation commit identity rather than
treating that product checkpoint as the new HEAD. Do not amend automatically or
start another task after committing. No tests/builds or remote operations are
part of this checkpoint.
