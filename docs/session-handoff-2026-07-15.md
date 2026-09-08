# Dynamics Helper Development Handoff

Updated: 2026-09-08. This existing file is the single development recovery entry.
Read `../AGENTS.md` for execution rules. Older contents are retained in Git at
`6413dbad9bd258bb04cf313610d602b68424e091`; do not execute their restart steps.

## Current Mode

v2.0.76-beta.5 is now published as a GitHub prerelease (latest result below).
Historical beta3 local upgrade/repair follows. The user accepted the beta
qualification limits and tested local upgrade. The resulting mixed-install
integrity failure is confirmed below; the user approved one local full-installer
repair and verification, with no security changes or forced process termination.
Development stays in the LOCAL checkout; the approved Cloud PC product install
did not migrate development. Release authorization covers source/asset verification,
release notes, the intended branch/tag push and exact tested ZIP publication. It
does not authorize local installation, security changes, or stable publication.

The user confirmed global OpenCode Superpowers removal also applies here; do not
reload or repeat removal. No Pi installation, vendor sample submission, or
security bypass is authorized. The earlier 35-document commit was completed as
f283e2d and does not authorize a commit of the current product changes.

## Current Milestone Summary

- Alignment remains the independently delivered v2.0.75-beta.1 foundation.
- Local beta3 fixes remove unsafe startup Extension migration, exclude the two
  development-only Pydantic mypy plugins, and make installer failures preserve
  security policy, user data, and process ownership.
- Final package: `DynamicsHelper_v2.0.76-beta.3.zip`, 14,003,512 bytes, SHA-256
  `e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec`, under local
  Temp `dh-beta3-candidate-safe-installer-20260908`. It was built from f283e2d plus
  working changes, not an immutable release commit. Earlier beta3 is superseded.
- Cloud PC installation returned 0; config unchanged, editable prompts remained
  absent, installed Host/Extension beta3, real model-list Refresh successful.
  The user also reports Analyze works. The missing bubble was its disabled
  preference, not a confirmed regression; no bubble code change is needed.
- Basic use is restored. No explicit final Defender audit or automatic-update/
  interruption/recovery qualification is claimed. Historical B2 FAIL remains.
- All three later private distribution runs were deleted/closed. Retain private
  evidence and backups; do not rerun retired candidate-maintenance procedures.

Detailed sections below preserve chronological decisions and observations. Later
observations supersede earlier state descriptions, not their historical evidence.
Only Current Mode and Next Single Action describe current execution authority.

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
| Beta3 working milestone | Final package identity above; local focused/build/probe evidence below; user install, model Refresh and Analyze results | Basic use restored on Cloud PC; uncommitted, unpublished, automatic-update/recovery qualification incomplete |

Exact package identities and execution evidence are in
[the results ledger](plan-d-pragmatic-cloud-pc-results.md). B2 was built before
its source-binding commit; matching packaged inputs were subsequently checked.
Do not describe it as a rebuild from that commit. Tests are historical results
for those inputs, not tests run in the new Cloud PC development environment.

## Historical B1/B2 Failures

Normal B1-to-B2 transaction `ed2ff2cbbb31e571d69fc361d83777e2` failed on
2026-09-07 when Defender reported `Behavior:Win32/Persistence.A!ml` and quarantined
Host/recovery executables. The user allowed an action; the product then reported
rollback. Host and Extension were verified as packaged B1. Reported ACK outcome
was rolled-back; active/cursor were absent and transaction/receipt counts zero.
Full strict residue checks and durable browser idle were not completed.

The temporary private distribution was deleted and its URL returned 404. Do not
reuse it. The subsequent current Allowed threats screenshot confirms a visible
allow entry for `Behavior:Win32/Persistence.A!ml`; see the observation below.
Its exact scope and company-policy provenance are not established.

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

## Original Company Cloud PC Observation Preparation

After local documentation commit `f283e2d`, the user rejected local virtual
machines as test environments: their Windows policy may not match the company.
No Hyper-V or replacement VM setup is planned. Development remains local;
observing the original company Cloud PC is not development migration.

The user approved local preparation of a short read-only check, not remote
execution, another update trial, security changes, or a new commit. Prepared:

- `scripts/read-only/Test-OriginalCloudPcUpdateState.ps1`
- `scripts/read-only/README.md`

The observer uses fixed disk evidence, process counts/PIDs, read-only HKCU
registry access, and Defender status/preferences. It never starts the Host,
calls product RPC, imports product modules, writes files/registry/security
settings, or wakes a browser Worker. Its separate optional storage snippet is
for an already open, awake, non-transitioning Worker console only. Unknown state
blocks inference; no READY or retry permission is emitted.

Declared-file hashing is intentionally not a replacement for the production
integrity parser, trusted-package provenance, or full settlement checks. Hidden
Defender exclusions and allowed-threat state cannot be ruled out by empty visible
counts. All observations are non-atomic, and antivirus/auditing may observe file
reads. If policy blocks execution or a security alert occurs, stop without bypass.

Local validation: Windows PowerShell 5.1 parser check and one bounded independent
static review, not live script execution. Review corrections distinguish absent
DH RunOnce values from a shared key and unreadable ACKs from absent ACKs. No
product tests/builds or live Defender queries were performed by the agent during
preparation. Subsequent user-mediated observations are recorded below.

The user ran the observer and supplied its JSON at 2026-09-07 15:39:10 UTC.
Defender service, antivirus, real-time/behavior monitoring and tamper protection
were enabled; normal mode and cloud reporting were observed. Signature version
was 1.459.95.0. Visible path/process/extension exclusion counts and threat-action
ID count were each one; relevance and current allow state remain UNKNOWN. Both
registry views had expected main registration targets and no RunOnce/status
registration. Disk observation was skipped because one DH process was present.

A subsequent user-supplied process read identified it as the ordinary main
`dh_native_host.exe`, PID 27280, created at 2026-09-07 17:57:56.220058 UTC+8.
This is not a recovery role or proof of active updating. The observer now separates
main/recovery counts: main presence permits non-atomic disk observation without
killing the Host, while recovery processes, unknown observations, registration,
and pending-evidence stop gates remain. No claim of quiescence or full settlement
is made.

The user supplied the revised observation at 2026-09-07 15:46:00 UTC. Main Host
27280 remained present with no recovery process. Fixed pending paths were absent,
transaction/receipt counts were zero, and exact ACK bytes matched reported B1
rollback. Both metadata versions were B1, but inventory observation stopped with
the old undifferentiated code; this is not proof of corruption or successful hash
verification. Browser and current allow state remain unknown.

Local inspection found an observer compatibility defect: its path whitelist
rejected embedded spaces, although current bundled runtime data includes such a
filename. This has not been established as the exact B1 failure. The observer now
accepts embedded ASCII spaces while rejecting trailing spaces/traversal, and
emits fixed stop-phase/role/error codes plus checked-file count. `-SkipDefender`
avoids repeating already supplied security observations during the disk follow-up.

The user supplied the next observation at 2026-09-07 15:51:19 UTC with Defender
queries skipped. All 51 declared product-file hashes matched the local inventory;
metadata/Extension versions were B1. Pending paths remained absent, transaction
and receipt counts remained zero, and exact ACK bytes matched B1 rollback. Main
Host 27280 remained present with no recovery process; registration observations
were unchanged. This closes the bounded disk observation, not trusted-package
verification, extra-file checks, atomic settlement, or B2 qualification. Do not
repeat the disk check without a new reason. At that observation, current allow
state and browser state remained unobserved; the screenshot below resolves only
the visible allowed-threat entry, not browser state or all policy overrides.

The user then supplied a screenshot of the CURRENT Windows Security Allowed
threats page, showing `Behavior:Win32/Persistence.A!ml` (Severe). This confirms a
visible allow entry at that observation, not merely a historical allowed action. It does not
identify the exact override scope, policy origin, detection trigger, or prove a
false positive/malware diagnosis. The generic threat description is not an
incident-specific process trace. A successful retry in this state cannot qualify
B2 as compatible with unmodified protection. Do not ask the user to stop allowing
it: reevaluation/quarantine could affect the restored installation. Recommend
company endpoint-security/IT review for an approved representative test baseline,
without independently changing the current machine or widening exclusions.

The user said IT involvement was not feasible and subsequently reported changing
Allow to Block themselves. This was a user action, not an agent security mutation
or authorization for further changes. The follow-up JSON at 2026-09-07 16:03:26
UTC shows visible threat-action IDs dropping from one to zero; this is consistent
with the reported action but does not prove absence of all overrides/exclusions.
All previously observed protection flags remained enabled and signature version
remained 1.459.95.0. Visible path/process/extension exclusion counts stayed one.
All 51 declared B1 hashes still matched; pending paths/counts, matching rollback
ACK, main-only process and registration observations were unchanged. No missing
declared product files were observed. The script's currentAllowState UNKNOWN is
an intentional visibility limit, not evidence that the previous allowance remains.
Browser storage is still unknown. Do not repeat the completed disk observation
without a new change, resurrect the infeasible IT prerequisite, or infer retry
permission from the user's security action.

The user explicitly accepted one Worker-only wake with the disclosed possibility
of automatic resume, not a manual new update. Their post-wake projection showed
`preparing`, B1 Worker, B2 candidate, a URL field present, no legacy key, and
transaction `404ded6a59bbcc86fb681c28c9827b6c` (different from the original failed
transaction). Its creation time and pre-wake state are unknown. A second storage
read at 2026-09-07 16:26:09.405 UTC confirmed the same transaction in `preparing`
with `errorCode: update_prepare_failed`.

Exact B1 source review confirms startup/alarm resume does not retry preparing
when errorCode exists. The one-shot alarm can fire without making a request.
Explicit start/retry remains mutating and is not authorized. This error can mean
download/validation/preparation failure, request rejection, or a 120-second
frontend timeout. Frontend cancellation does not cancel Host executor work; old
16:03 disk observations cannot prove the later transaction is absent or stopped.
Expected download errors are wrapped without a safe HTTP-status log, so neither
404 nor Defender recurrence is established. The retired private URL is only a
hypothesis until current candidate identity is clarified. Do not print/probe URLs,
clear state, manually ACK, retry, or terminate processes.

The next user storage projection confirmed the same failed preparation and a
non-GitHub host. One user-executed HEAD request could not expose status to fetch
because of CORS; its existing Network record showed HTTP 403 with the fixed
service code AuthenticationFailed. No private URL, SAS, account/resource identity,
or raw screenshot is retained here. This establishes HEAD authentication failure,
not the exact earlier Host GET failure or a new Defender incident. No new request
is needed to repeat it.

Local follow-through verified the existing B2 ZIP size 15,621,955 and SHA-256
`33958f963de94fc223cacf7bce313d74d3f29e5b7f0845168b0eb552fd2a5614` unchanged.
Exact B1 source has no supported failed-preparation cancel/discard/rebind action:
Retry reuses the same ID and URL, and acceptCandidate ignores preparing states.
Options Reset affects unrelated settings, not update state. A full installer
does not clear browser-only failed preparation. Do not clear a live storage key:
in-memory state/queued callbacks can overwrite it, and Host timeout does not prove
executor cancellation. A different URL requires a separately approved, bounded
maintenance procedure with fresh evidence and controlled worker/Host ownership;
no such mutation or distribution upload has been authorized or performed.

The observer now accepts an exact TransactionId and EvidenceOnly mode so the
user can check current `404ded6a59bbcc86fb681c28c9827b6c` disk evidence without
repeating Defender queries or 51 file hashes. The fixed ACK check remains tied to
the original ed2 transaction and cannot settle the new transaction. This snapshot
does not prove Host work has ended or authorize abandoning transaction authority.

The user supplied the scoped evidence at 2026-09-07 17:05:53 UTC: no active,
404ded workspace/preparing/receipt or pending cursor/scratch, zero transaction
and receipt entries, and the original ed2 rollback ACK still matched. No recovery
process or recovery registration was observed. Main Host was now PID 3984, not
27280; do not infer why it changed or treat this as an executor-completion proof.
Defender and inventory were deliberately not queried. This closes this fresh
snapshot; do not repeat it as a substitute for a process-lifetime boundary.

Local B1 review produced one feasible but UNSUPPORTED maintenance proposal:
privately verify a new URL for the unchanged B2 ZIP; preserve the exact failed
state privately; exit the affected browser and wait for natural relevant Host
exit; verify zero relevant processes and no new transaction authority; reopen
with the same persisted preparing/error gate and confirm a fresh Worker. Replace
only dh_update_state once with the exact newer available candidate, conditional
on the unchanged failed identity; reload only after successful storage callback.
Do not delete the key first: absent initialization discovers GitHub, which cannot
deliver unpublished B2. The write/reload is not atomic or supported cancellation;
normal discovery can still supersede available. Stop on any failed gate rather
than forcing state or reseeding. Preserve all other storage and disk evidence.

The proposal needs one explicit bounded authorization covering private hosting,
verification/cleanup, browser exit/reopen, one-key maintenance/reload, and at most
one normal update trial. Do not execute any part until approved. Natural exit and
initialization observation each have a five-minute stop limit, not a guarantee;
no forced process kill, security change, public release, commit, or push. New
Defender detection ends the trial; preserve evidence and never allow/restore.
This proposal bypasses no disk authority and does not declare B2 qualified.

The user approved that full bounded maintenance/distribution/single-trial bundle.
A new private distribution attempt used a fresh ownership-tagged container and
the unchanged B2 ZIP. Azure target context and current principal were checked;
container creation and blob upload completed, but no usable handoff was delivered.
The local helper first hit an idempotent ACL problem, then CLI datetime argument
handling, and a subsequent resource-validation timeout. The delivery was stopped
before browser maintenance or a new product update transaction.

Only this newly owned container was cleaned up. Cleanup diagnostics resolved CLI
include syntax, list/show ETag quoting, and JSON timestamp coercion in the local
wrapper; exact resource/principal checks and conditional deletion remained in
place. Final outcome was `deleted_verified`, container absence and principal/
context match confirmed. No account keys, protection settings, or unrelated
resources were changed. This is distribution failure/closure, not B2 execution
or qualification. No new candidate was seeded and no Cloud PC browser/Host was
closed, restarted, or mutated by this attempt. Original B2 package remains intact.

Private automation and ownership records reside under the approved local Temp
workspace in `dh-b2-current-trial`; do not commit or print their contents. The
record is closed and Publish/Resume latches must not be reset/replayed. The user
should not be asked to debug these helpers or repeat completed disk checks.

The user explicitly approved one replacement distribution attempt. A fresh run
under `dh-b2-retry-20260908` used independent ownership/latches. A local ancestor
check was corrected to use DirectoryInfo rather than provider-only PSIsContainer
before Azure creation. Preflight context/principal and exact source hash passed.
The single Publish created/uploaded the original B2 ZIP and generated scoped SAS;
signed GET passed exact size/SHA-256 verification. The subsequent anonymous GET
returned a status outside the helper's accepted denial set (401/403/404), causing
`ANONYMOUS_GET_NOT_DENIED`. The exact status was not retained in its safe output;
do not infer public exposure, HTTP 200, or the cause from that classification.
No handoff URL was delivered. There was no second Publish or network retry.

Cleanup succeeded: only this new owned container was deleted, absence and current
context/principal match verified, private handoff removed. No Cloud PC maintenance,
new product update, security-setting change, or Git commit/push occurred. Both
distribution attempts are closed; the original B2 ZIP is unchanged. Any further
tool diagnosis must be local/static unless separately authorized, and may not
quietly weaken privacy verification or create a third resource. No live resource
remains from this replacement run according to the verified cleanup.

After the user challenged the stopping point, local-only inspection confirmed
that the anonymous GET status was discarded and signed verification was saved
only after anonymous verification. The exact past HTTP status cannot be recovered
from the retained record. The private helper was corrected to persist safe numeric
HTTP status before gates, distinguish signed/anonymous stages, save signed proof
immediately, and classify unexpected responses as inconclusive or anonymous
success rather than conflating them. Denial acceptance remains 401/403/404 only;
no delivery gate was weakened. Offline AST/mock-handler checks passed 544/544;
no helper mode, network operation, historical-record update, or third delivery
attempt occurred. Local tool repair did not require another cloud authorization.

The user authorized a third distribution with "continue". Its independent run
`dh-b2-third-20260908` retained numeric anonymous status 409 and signed hash proof.
Microsoft's anonymous-access-prevent documentation confirms that older service
versions can return 409 when refusing anonymous access. The helper did NOT broadly
accept 409: a one-shot same-resource finalization requested service version
2021-12-02, obtained anonymous 401, rechecked private ownership/context/principal,
and verified signed GET 200 with exact 15,621,955 bytes and original SHA-256.
No reupload, new container, or validity extension occurred during finalization.

Third-run status at delivery was `published_verified`; its container was then live
for the approved trial (subsequently deleted as recorded below). SAS had expiry
2026-09-08 06:47 UTC (14:47 UTC+8). The private handoff
is in the third-run Temp directory as sas-handoff.txt; never print/commit its
contents. Cleanup remains REQUIRED on completion/failure/abort/expiry using the
same helper's Cleanup mode and this exact RunDirectory, with ownership checks.
Do not mistake prior two closures for cleanup of this third live container.

The next gate is user-mediated browser/old Host natural exit. Before exit,
confirm same preparing/update_prepare_failed identity and B1 Worker, no legacy
pending key. Do not replace state yet; stored old state remains intact. Exit the
browser and DevTools, wait naturally at most five minutes, then use EvidenceOnly
for 404ded and require zero main/recovery counts plus no pending authority. If
Host survives or state differs, stop maintenance and preserve evidence. No forced
kill or browser background-policy change. Private backup of the full failed value
must be secured before the later one-key replacement; never send that value here.

The user returned EXIT_GATE_MATCH and post-exit observation at 2026-09-08
02:57:02 UTC: zero main/recovery processes at both reads; no active/current
workspace/preparing/receipt/cursor/scratch, counts zero; original rollback ACK
unchanged and no recovery registrations. This supplies the requested natural
process-exit gate. No force kill or new product update was reported.

Prepared `scripts/maintenance/Prepare-B2CandidateMaintenance.ps1` and README:
after reopening only the extension Worker, export the exact failed value and
fresh Worker identity to clipboard without printing it; SaveBackup creates one
private file via redirected drive in the third-run directory. CopyReplacement
places the guarded single-key write/reload code on clipboard using the private
handoff. Full-state/version/Worker/legacy/expiry checks fail closed. Storage write
success precedes reload; no Start/Retry message is sent. Clipboard/Console history
can contain SAS; use only permitted private session, no screenshots/exports.
Read/write is not CAS. The private cleanup allowlist includes only this backup
file in the third directory so cleanup can preserve it without bypassing guards.
PS5.1 syntax and 33/33 offline mock checks passed; no private input or maintenance
mode executed locally. The user must stop on any unexpected outcome, not repeat.

During backup, the user observed that DevTools `copy` existed at Console top level
but not in the async storage callback. Capturing it before the callback fixed the
export; the user reported BACKUP_CLIPBOARD_READY, then BACKUP_SAVED. Do not repeat
backup creation or print its contents. The user then pasted the prepared candidate
replacement and reported extension reload. The reloaded Worker showed repeated
`Specified native messaging host not found`. No normal Update/Retry click or new
product update transaction was reported. Candidate availability/initialization
was not verified after reload; do not claim maintenance fully succeeded or undo
the storage change without a separate guarded decision.

The following user file observation found generated manifest.json present (255
bytes), but dh_native_host.exe NOT_FOUND_OR_INACCESSIBLE. This blocks a new Host
connection. It is not by itself proof of quarantine, deletion, or a permissions
cause. Earlier 51-file matches predate this observation. The user had previously
reported changing Allow to Block; causal attribution still requires the current
protection event rather than an assumption. No Host restoration/reinstall or
security change was performed by the agent.

The trial was stopped at this maintenance failure. Third distribution Cleanup
completed: `deleted_verified`, containerAbsent/contextMatched/principalMatched
true; handoff removed, private failed-state backup preserved. The new candidate
URL is now unusable and may still be stored in the browser; do not click Retry.
All three distribution runs are closed. No B2 update trial completed or started
through the approved normal UI step. Do not issue another download candidate.

The user's next Protection history screenshot identifies the installed main Host
as quarantined at 2026-09-08 10:56 AM (displayed local time), with detection
`Trojan:Script/Wacatac.C!ml`, severity Severe, status Quarantined. This is a NEW
detection name, distinct from the original `Behavior:Win32/Persistence.A!ml`.
It explains the missing/unavailable main executable and failed new native
connection. No affected-file hash or rule-level cause is supplied by this image;
do not label it a proven false positive or proven malicious product.

On the recorded UTC+8 timeline, quarantine at 10:56 precedes the 10:57:02
post-exit zero-process observation and later candidate replacement. Zero processes
therefore did not establish a launchable B1 baseline; missing-file readiness was
not rechecked after exit. Do not attribute this new event to the later storage
write, B2 execution, or a particular RunOnce/API operation. Earlier declared B1
hash matches and the absence of a new update support B1 installation context,
not an independently verified hash of the quarantined bytes.

No further Cloud PC diagnostic is needed to prove this quarantine. Reinstalling
or restoring the same executable is not a demonstrated remedy and may trigger
quarantine again. The next meaningful evidence route is developer-side provenance
review and, with explicit data-sharing approval, vendor sample/detection review
using a locally retained matching release executable rather than restoring the
Cloud PC file. No public upload, security exclusion, signing-as-cure, or product
code change is authorized or implied by the generic threat name.

The user explicitly refused vendor sample submission. Do not upload executables,
samples, or incident material to Microsoft or third-party analysis services, or
substitute a different submission channel. No vendor submission occurred. This
closes that proposed route; it is not a request for repeated approval. Retain
quarantine and local evidence; do not restore, allowlist, rename/repackage to evade
detection, or treat a new build/signature as a demonstrated remedy. Local review
cannot by itself establish company-policy compatibility or B2 delivery readiness.

The user then required the problem to be solved. Local source/build review and
bounded fixes proceeded without vendor submission, security changes, Cloud PC
execution, or new distribution. Two concrete issues were corrected:

- Removed the obsolete v2.0.45/46 startup Extension migration from NativeHost:
  a sibling extension directory with a manifest could overwrite verified installed
  files and be deleted without ownership/hash checks. A constructor regression
  demonstrated mutation before the change (8/9 pass, one expected fail); after
  removal the focused file passed 9/9. Sibling/nested/installed trees now remain
  unchanged. Verified `.old*` cleanup, transaction engine, and recovery are intact.
- Excluded only `pydantic.mypy` and `pydantic.v1.mypy` from the frozen command.
  Existing graphs traced these development plugins to setuptools/vendored imports.
  The command test failed before the edit; focused command checks passed 5/5
  afterward, retaining all 17 required hidden imports.

One isolated build was interrupted by the temporary supervisor's live-log sharing
error, not a product failure. After correcting monitoring, the build completed in
30.17 seconds, exit 0, with existing Python 3.13.15/PyInstaller 6.22.2. Actual
Analysis/PYZ/xref retained 17/17 hidden imports; the plugins were ExcludedModule
nodes only, with no packaged code. Setuptools, its runtime hook and vendored data
were absent. Output: 35 files, 7 directories, 27,403,517 bytes. The known missing
`tzdata` hook warning remains; runtime behavior is NOT verified by graph success.

Build evidence is retained privately in local Temp
`dh-isolated-host-build-20260908-retry` (summary/verification/outcome/log files).
No generated EXE was run, no dependency installed, no original B2 ZIP or repo
build/dist/spec overwritten. Source snapshots before/after build matched. Changes
remain uncommitted and version stays B2 for source diagnostics only; this output
is not the immutable published/ledger B2 artifact or an approved release package.

The audit also found reader-error queue wakeup and SDK-stop lifecycle gaps, but
these are not changed or proven incident causes. Do not broaden this patch into
shutdown redesign automatically. Neither implemented fix establishes the cause
of Wacatac/Persistence or demonstrates Defender compatibility. Actual local
frozen-runtime checks and separately scoped company-device validation remain
necessary before delivery. Do not submit samples or restore/quarantine-bypass.

The existing focused frozen integration test subsequently passed 1/1, no skips,
in 6.930 seconds against the new isolated onedir. It launched exactly one
`--update-probe` process, exit 0, empty stderr, matching B2 Host/Extension response
schema. Disposable fixture bytes and all 35 original build hashes remained
unchanged; all six isolated profile dirs were empty afterward, no registry or
RunOnce writes, and no processes survived. New diagnostic EXE SHA-256 is
`f90e505db3cc0e822b8cb05b79fa8a84b4f6b6acc3608f87f6cbeaefef22494d`.
Evidence: local Temp `dh-frozen-probe-20260908/attempt2`. The first wrapper blocked
NUL before a frozen launch; that wrapper-only issue was corrected. No normal
Host/SDK/Analyze execution or company-policy/Defender acceptance is established.

The user approved continuing local verification. A copied frozen no-flags main
passed one controlled failure-path smoke: absent installation metadata blocked
update-network work; malformed isolated config stopped SDK initialization before
CLI discovery/start; stdin EOF exited cleanly with exit 0 in 1.618 seconds.
SDK import evidence plus the frozen graph confirms Copilot/Pydantic/pydantic_core
loading, not a successful CLI/session/Analyze lifecycle. Source mocked suites
passed 47/47 (SDK compatibility 14, session workspace 33), no skips. Subprocess
and URL guards blocked real integrations. All 35 original/copied artifact hashes
were unchanged, zero owned process survivors. Local evidence resides under
Temp `dh-focused-main-smoke-20260908`; the optional tzdata warning remains.

A complete LOCAL DIAGNOSTIC rebuild was assembled under Temp
`dh-diagnostic-startup-cleanup-B2-20260908-a73f91`, filename
`DynamicsHelper_diagnostic_startup_cleanup_B2.zip`, size 14,007,526 bytes,
SHA-256 `7730070ede5d29c84bbf0dd981e744daac6dfb8dfc37f604f20009ea17fccfb2`.
Its product version remains B2, so it MUST NOT be substituted for historical B2,
published, or used as the new update candidate. All 13 frontend files matched the
historical B2 archive before assembly. Current staging/manifest/archive validators
passed (56 files, 55 manifest hash entries, 37 Host product files, 13 Extension
files). Final actual-package probe passed 1/1, zero skips, exit0/empty stderr,
exact B2 version/capability schema; six profile dirs empty and no survivors.
279 tracked source hashes and the original frozen tree were unchanged through
assembly/probe. Historical B2 ZIP was untouched. No install, cloud/AV operation,
sample submission, version bump, build during assembly, or Git write occurred.

The next delivery candidate should be separately identified (recommended local
`2.0.76-beta.3`) and rebuilt with synchronized version carriers, not merely ZIP
renaming or metadata relabeling. That version decision and company-device repair
scope must be explicit. This closes local diagnostic packaging, not Defender
acceptance or full product qualification. Preserve the quarantined Cloud PC state.

The user approved local beta3 candidate preparation, not company-device install,
publication, or Git writes. Updated product_info.py, extension/package.json and
extension/manifest.json to 2.0.76-beta.3 (numeric Chrome version still 2.0.76).
The pre-existing package-lock root-version drift was left untouched. Fresh Host
build took 46 seconds with the existing toolchain; excluded plugins/setuptools
remain absent and all 17 required hidden imports present. Copied frontend bytes
matched historical B2; only the copied manifest version_name changed. Final-package
probe and beta3 controlled import-failure smoke passed. Focused source tests passed
33/33 unique cases (7 product info,17 release helper,9 Host integrity); wrapper
issues and one transient temp-stage rename PermissionError were disclosed, not
hidden as clean first-pass execution. No installed-product mutation occurred.

Before delivery, installer review found unsafe legacy behavior: AV false-positive
assertions, automatic Defender exclusions, Unblock-File, batch ExecutionPolicy
Bypass, forced Host termination, and Roaming config overwrite/deletion. These were
removed from installer_core.ps1/install.bat. The installer now refuses a running
Host or legacy Roaming directory before mutation, leaves policy/protection intact,
and returns failure on registration/native errors through the batch wrapper.
Preflight, complete runtime replacement, live probe, settlement and registration
remain. Focused installer tests passed 17/17 including15 mocked PS scenarios;
RED checks caught old unsafe behavior, PS5.1 parser passed, bounded review found
no blockers. This is installer safety, not a demonstrated AV remedy.

The first beta3 ZIP is SUPERSEDED and retained unchanged. FINAL local full candidate:
Temp `dh-beta3-candidate-safe-installer-20260908/DynamicsHelper_v2.0.76-beta.3.zip`,
size 14,003,512 bytes, SHA-256
`e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec`.
Host/frontend bytes are identical to first beta3; only both installers and their
update manifest changed. Packaged installers match source; no Add-MpPreference,
Unblock-File, ExecutionPolicy Bypass or Stop-Process. Complete ZIP validation and
actual final-package probe passed, six isolated profiles empty, no survivors.
Package source baseline is HEAD f283e2d plus working changes, not a committed build.
Original B2 unchanged. tzdata warning remains; no company Defender acceptance.

Next proposed operation is complete local-folder install repair on the original
Cloud PC via redirected-drive package copy, NOT Azure/update retry. It requires
explicit approval: normal browser exit, copy/hash/extract exact FINAL package,
one unelevated installer under existing policy, passive disk verification, then
one controlled browser launch/status observation. Stop on any detection, missing
file, policy denial, running Host, Roaming data or inconsistent transaction state;
no restore/allow, force kill, manual storage reset or automatic installer retry.
Browser storage may retain a revoked candidate or transactionless integrity error;
new Worker should verify and clear eligible stale states, but transaction-backed
state is not automatically discarded. Installation alone is not full qualification.

The user approved the full beta3 Cloud PC copy/install/verify/browser-start bundle.
Prepared scripts/maintenance/Prepare-Beta3Install.ps1 for user-mediated transfer:
verify original account/profile, unelevated execution, browser/Host exit, absent
legacy Roaming/pending authority; verify exact final ZIP, copy/extract once to
fresh Cloud PC TEMP folder, retain only private presence/hashes of user config
and prompt files for later comparison. It does not install or launch the Host.
It rejects a TEMP path inside the product directory, destination reuse, or blocked
file access. No override of policy/MOTW/Defender is permitted. Actual Cloud PC
preparation/installation results have not yet been returned.

The first user preparation report stopped at BROWSER_HOST_EXIT before copy or
installation. Its original coarse output did not distinguish a remaining process
from CIM failure. The preparation script now provides ProcessCheckOnly (no writes)
and fixed error codes plus allowed process name/PID/session projections. PS5.1
syntax and 3/3 extracted-function mocks passed with no live query. Do not kill
processes or repeat preparation until that narrow result is known.

The user resolved the browser-exit gate by normal closure, then reported
PACKAGE_READY_NOT_INSTALLED with exact package hash matched and no installed
product changes. Their subsequent installer screenshot shows Host/Extension copy,
registration successful, SUCCESS: Update Complete!, and the Enter-to-exit prompt.
Do not infer final exit code or absence of subsequent Defender detection from the
screenshot. No normal browser/SDK startup has yet been verified on beta3.
Prepared scripts/read-only/Test-Beta3InstalledState.ps1 to compare the three
protected user-file presence/hashes with the private pre-install snapshot, check
beta3 metadata/EXE presence, and observe remaining Host processes. It runs no EXE
or RPC and prints no hashes or content. PS5.1 parser passed; no live run locally.

The user confirmed installer exit code 0. Their post-install observation reports
config.json UNCHANGED, both editable prompt files REMAINS_ABSENT, Host EXE present,
Host metadata/Extension both beta3, generated manifest present, and zero Host or
recovery processes. This passes the bounded post-install preservation/presence
gate, not complete integrity or Defender acceptance. No new detection was reported
in that observation. Proceed to the already approved controlled browser startup;
normal startup can initialize the configured Copilot CLI and check release metadata.
Do not initiate Analyze, Update/Retry, or config changes during this first check.

The user supplied the controlled About & Help screenshot: Extension and Host
both display 2.0.76-beta.3, without the earlier missing-Host error on that page.
This establishes displayed version/basic UI connectivity evidence, not successful
SDK/model execution or proof of no Defender events outside the screenshot. Do not
declare antivirus compatibility resolved. A manual model-list refresh is the next
bounded SDK/CLI communication check; it does not send a case or run Analyze.

The user explicitly reported successful manual model-list Refresh and provided
the populated Model & Performance screenshot with Extension/Host beta3. Record
real Host/SDK/CLI model-metadata communication as PASS (not merely cached list
visibility). No case/model turn was performed in this step. No security event
was reported with this result, but the screenshot is not an independent Defender
audit or proof of durable acceptance. Do not reproduce model catalog contents.

The user subsequently reported "Analyze has no problem". Record end-to-end
Analyze as user-reported functional success, without inventing case details,
model/tool coverage, report hashes or a new agent-run smoke. They then confirmed
the status bubble preference was disabled and forgotten: this is not a confirmed
frontend regression. Do not change bubble code or repeat Analyze to close it.
Automatic update/recovery and durable Defender compatibility remain unqualified.

The user agreed to organize the completed fixes and verification, separately
from future automatic-update acceptance. Current closeout changes documentation
only and preserves all earlier code/tests and private evidence.

Closeout static checks passed: whitespace diff check and one bounded review of
the six updated current summaries/readmes and their local references. No product
tests/builds or live operations were repeated. Current worktree contains 16
modified tracked files and seven untracked script/readme files, none staged;
this includes prior product/version/installer/test changes, not just documents.
At closeout HEAD was f283e2d; the subsequent local-commit approval is below.

The user then explicitly requested a commit and asked about GitHub publication.
Full precommit review covered all 16 modified files and seven new scripts/readmes;
no definite code blockers or actual credentials/private SAS/customer content were
found. This approval covers one local stage/commit and verification only, not push
or release. The verified beta3 package predates the commit and must be bound to
the resulting source before publication; do not claim it was rebuilt from it.
Public prereleases may be discovered by existing beta-channel updaters, so a
prerelease label alone is not an isolation gate. Automatic-update/recovery
qualification and release preflight remain separate from restored basic use.

The local product commit completed as fc148268e1e34b4fc78ecb16d2f4fa460ba5f9e4.
The user then explicitly approved beta release without a Draft, accepting missing
automatic-update target acceptance and planning local upgrade testing. After
fetch, the branch is 53 commits ahead/0 behind its origin tracking reference;
all53 outgoing commit inventories/added patches were reviewed for release scope
and credential risks, with no definite blockers. No master merge is required.

Final ZIP e07a6ee4... binding passed:178 tracked input comparisons,82 assembly
inputs,34 Host snapshots,21 project Python graph sources,35 runtime files and
13 frontend files. Only expected newline/CRXJS transformations were accepted.
The pre-tag npm build passed TypeScript/default menu5/5/source-dist byte gate.
12/13 frontend files matched the tested ZIP exactly; the sole difference is the
non-runtime .vite manifest CRX virtual-asset hash field. Runtime assets match;
do not claim entire fresh build byte identity or rebuild the tested ZIP silently.
Release notes are releases/notes-v2.0.76-beta.3.md. Publish unchanged complete
tested ZIP as prerelease, not latest stable, with no draft or extra assets.

Publication completed at 2026-09-08 08:18:49 UTC:
https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.76-beta.3
Release is public, prerelease=true, draft=false, not latest stable. Tag target is
d03fac2 (release-notes descendant of fc14826); branch and only this tag were pushed
atomically, without updating master or unrelated tags. GitHub reports one uploaded
asset DynamicsHelper_v2.0.76-beta.3.zip, 14,003,512 bytes and digest
sha256:e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec,
matching the tested final package. No rebuild or user-machine installation occurred
during publication. Release-result documentation is a follow-up, not tag amendment.

The user's local upgrade showed beta3 for both components and ping/pong success,
but persistent installation_integrity_failed guidance. Read-only local audit at
2026-09-08 16:24-16:25 UTC+8 confirmed genuine mixed product bytes:
_internal expected34/actual650,616 extra files and18 declared hash mismatches;
Extension expected13/actual57,44 extra bundles, all13 declared files matching.
The new Host executable and top-level product files matched; canonical metadata
and its linkage passed. Production pure validator returned packaged/failed.
No local updates directory/transaction authority exists. No settings, SDK/Host
process, browser, network, or installed files were changed by the audit.

Filtered local log sequence indicates probable v2.0.75-beta.1 to beta3 through
legacy overlay updater (prior version inferred from previous successful log,
not previous executable). It merges trees/tolerates replacement failures, leaving
old runtime and hashed bundles. Exact reason for18 runtime replacement differences
is not established; no new lock-error diagnosis is claimed. Ping bypasses integrity
and version labels do not validate bytes, so they do not contradict the warning.
This is a real legacy-upgrade failure, not a cosmetic banner or evidence that
beta3 transactional updates ran. Do not weaken inventory or remove warning.

Recommended recovery is one complete beta3 installer with browsers/Host naturally
closed, preserving config/prompts/updates evidence. It replaces _internal and
Extension trees and probes the resulting product before registration. No manual
file deletion, Settings Reset, update Retry, force kill, or security bypass. This
local machine is distinct from the already repaired Cloud PC; its repair needs
applicable approval. Publication notes should warn legacy in-app upgraders to use
the full installer; no automatic release asset replacement or publication edit
is authorized by the screenshot report.

The user explicitly authorized that local repair and stated the local update was
NOT blocked by Defender. Record this as the user's observation for this local
upgrade, separately from the confirmed mixed-install integrity failure and earlier
Cloud PC detections. It is not an independent security-event audit or proof of
universal antivirus compatibility. Do not misattribute this local failure to AV.

Pre-repair local process observation found Edge still running and main Host PID
51060, no recovery-role executable in the returned list. No installation or forced
termination was attempted. The verified complete beta3 package remains available
locally; wait for the user to save work and normally exit Edge/DevTools before
executing the already approved repair. Preserve configuration and update evidence.

After the user normally exited the remaining Edge windows, a fresh process check
returned zero browsers/main/recovery processes. The approved LOCAL full-installer
repair ran exactly once under the current unelevated account at 2026-09-08
16:36:57 UTC+8, PID20972,17.2 seconds, exit0 and SUCCESS: Update Complete!.
The exact published beta3 ZIP was verified before use. Read-only production
validator then returned packaged/verified with both versions beta3, runtime34/34
and Extension13/13, zero extras/missing/hash mismatches. All three existing user
config/prompt files remained present with identical hashes; updates remained
absent. No installer/supervisor/product processes survived, stderr empty. No
browser/SDK was launched or security policy changed; no independent AV audit.
Private evidence is retained under Temp dh-local-beta3-repair-20260908-7dc9a461.
The local legacy-overlay corruption is repaired on disk. The user subsequently
confirmed the warning disappeared and supplied the normal Options screenshot
showing both components beta3. Browser-level mismatch guidance has cleared without
manual storage reset. Local full-installer repair is complete for these checks.

The user then asked about the old Host-version refresh icon. Read-only historical
review identified it as forced check_updates, not Host restart/config reload. It
and the About & Help check-now button were removed by81f7dc6 during Plan D cutover,
already absent in B2. Current update actions only appear for available/progress/
retry states; no manual discovery button remains. This is not caused by the mixed
installation or beta3 repair. The user subsequently requested restoration.

Manual discovery restored in local source: Header RefreshCw beside Host version
and About & Help Check for Updates share one pending guard/spinner and45s timeout.
Valid state hydration and idle/available/complete are required; Worker serialized
authorization independently rechecks the allowlist. Initiation ACK never reports
up-to-date; fixed shared discovery outcomes/error notifications settle UI without
URLs. Host protocol and automatic check timing are unchanged. Notifications are
not per-request correlated. No Start/Retry, install or reload occurs from Check.

Focused tests passed164/164 (Options38,SW42,runtime84); removing the gate produced
two expected regression failures before restoration. TypeScript and npm build
passed, default menu5/5 and source/dist item identity passed. One bounded review
found no blockers. Browserslist warning remains. These are uncommitted changes
at existing beta3 source version; local extension/dist differs from published
beta3 and must not replace that immutable release asset. Installed user extension
and GitHub package were not changed or browser-tested for this feature.

Before beta4, the user reported Case Context fields Case Number, Severity and
Status Reason blank despite populated D365 header. Beta4 publication is paused.
Read-only source review found old header-ID and text XPath/previous-sibling-only
extraction, scoped to main; no ticketnumber/severitycode/statuscode selectors or
DOM fixture coverage. Screenshot values are compatible with current validators,
so no evidence warrants loosening ID/severity validation. HTML layout/scope/value
source changes are hypotheses; collect a narrow sanitized header structure before
changing selectors. Preserve async yielding and same-case user edit protection.
No page customer text or complete DOM should enter repository fixtures/logs.

The user's Elements screenshot subsequently supplied actual structural evidence:
uci-header-control-list has an open shadow root containing items identified by
header_severitycode/header_statuscode; values and labels are direct light-DOM
children with slot=value/label, and each item has another open shadow root.
The original structural diagnostic stopped at a shadow boundary; no further
customer page dump is required. Do not retain case/customer text from screenshots.

PageReader now enters open roots within document-visible known header lists,
reads the direct slots, prioritizes the observed Case number / Service name label
with exact header_ticketnumber fallback, and retains old extraction fallbacks.
ID/severity validation, title/SAP/description and FAB edit ownership are unchanged.
Traversal caps20lists/2000elements and yields every50. Closed roots, header lists
inside unrelated external shadow wrappers, and shadow-only slot rendering are
not supported. Shadow-only mutation rescans are not added; existing scan signals
or explicit refresh remain necessary.

11 new synthetic DOM tests added: pageReader22/22 and FAB.pageIdentity41/41 passed
(63/63). Initial old-code run failed6 tests; disabling shadow traversal made both
composite-ID regressions fail, restored green afterward. TypeScript and build
passed, defaultmenu5/5/source-distcopy passed, bounded review no blockers. Actual
D365 verification remains pending; no installed extension or published asset was
changed. Beta4 publication remains paused pending the user's next release/test
instruction. Preserve concurrent manual-check restoration and local repair docs.

The user then requested only Created On and customer name metadata, deferring
TPID and Audit ingestion. Added optional createdOn/customerName strings to the
scraper/snapshot whitelist and English Created On/Customer Name template sections.
Customer source is the explicitly observed Summary customerid selected lookup,
not an inferred ultimate customer. Created On uses scoped label association or
explicit createdon inputs, preserving raw display date/time with no UTC inference.
Actual Created On DOM remains unverified beyond synthetic fixtures. Unloaded or
ambiguous controls remain blank; no automatic tab switch or metadata cache.
An unedited later scan can lose unloaded metadata; manual edits remain protected.
Existing scrubbed-text Host/report path is reused, no new RPC/PII-rule changes.
The user was informed company names are not generally scrubbed before model use.

Review caught and fixed mixed-field aria-labelledby containers and GUID-only
customer candidates;10 additional regressions cover rejection and valid cases.
Final focused scraper/snapshot/FAB tests passed125/125 after expected RED failures,
TypeScript and final build passed, defaultmenu5/5/source-distcopy passed. No
installed extension or published artifact changed; no case data retained in tests.

The user authorized committing and publishing beta4. Versions synchronized to
2.0.76-beta.4 in the three carriers. Full precommit review found no blockers or
customer/credential leaks in the18 initial changed files. Required frontend build
passed (defaultmenu5/5,TypeScript,Vite,source-distcopy). Fresh isolated Host build
retains17/17 required imports and excludes2plugins/setuptools. Complete ZIP:
Temp dh-beta4-release-20260908/DynamicsHelper_v2.0.76-beta.4.zip,14,007,795 bytes,
SHA-256 bef3ef4971d88750a62bef627de0590996cf0ba7d89c459959554599cf9d0806.
56 files/55manifest entries, actual finalpackage probe beta4 both components,
empty isolated profiles, no survivors.92 product-input snapshots matched before/
after build; later commit binding remains necessary. No installed product touched.

Final focused verification: frontend289/289, Host50/50 unique cases ultimately
passed. One legacy test still required removed Stop-Process and was corrected to
require early refusal/nonzero exit before probe plus preserved cleanup ordering.
One mocked PowerShell timeout passed unchanged on targeted retry; corrected
release-helper+installer full34/34 rerun passed,339 unique tests total across374
executions including retries. No hidden skips. tzdata/Browserslist warnings remain.
Release notes: releases/notes-v2.0.76-beta.4.md, explicitly disclose liveDOM and
update qualification limits and old-overlay full-installer migration requirement.

Beta4 publication completed 2026-09-08 10:38:26 UTC:
https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.76-beta.4
Tag/feature commit bf6f9cc0aa6c2bd00f8b49687df4ba1742ce6631; only intended branch
and beta4 tag pushed atomically. Public prerelease=true,draft=false,not latest
stable. One uploaded asset size14,007,795 and GitHub SHA-256 bef3ef4971d88750a62bef627de0590996cf0ba7d89c459959554599cf9d0806 match testedZIP.
92/92inputs and21/21Hostsources bound to commit before publication; no rebuild
from tag claim. No local user installation or beta3 asset replacement occurred.
Release-result follow-up is docs-only and does not amend the release tag.

After publication, the user correctly noted old Options mount behavior checked
updates automatically. Historical review confirmed that trigger was lost during
cutover. Restored a one-shot per-mount automatic check after successful Host-config
merge, prefs hydration and valid safe update-state hydration, sharing the manual
pending/latch so manual-first does not duplicate. Unsafe states remain blocked;
no new install action/protocol. Options.update62 and related focused suites total
458/458 passed, with RED/break-fail checks, then build/defaultmenu5/5/tsc/copy passed.
This change remains uncommitted and is NOT in published beta4.

The user then reported both LOCAL and Cloud PC upgrades succeeded and success
notifications disappeared after approximately8 seconds. Record actual two-machine
normal-upgrade/UI observations as user-reported PASS, not exact timing, interrupted
recovery, or full independent forensic acceptance. They reported Severity,
Priority, Case Number, Customer Name and Status captured, with only Created On
empty. Priority is recorded as their observation, not a claim that this release
introduced a dedicated Priority field. Do not repeat successful upgrade checks.

Created On remains the sole reported extraction gap. Before further selector
changes, distinguish unloaded Details or preserved edited text from actual control
shape; request one sanitized selected date control and its small field ancestry.
The current implementation only reads inputs/textarea in document-visible scoped
fields, so attribute/read-only display or shadow roots are possible but unproven.
Do not substitute Modified On, Audit events or local current time.

The user's Created On selected-input projection showed a nonempty ordinary text
input with no data-id/aria-labelledby, outside shadow DOM, followed by five
wrappers without identifying attributes. This does not yet establish its field
boundary; do not substitute nearby Modified On or loosen all-form extraction.

The user requested direct Edge MCP debugging and supplied Microsoft's official
devtools-mcp-server article. They confirmed Edge remote debugging already enabled.
Read-only discovery found Edge's DevToolsActivePort in the normal local User Data
directory. Global OpenCode config now includes chrome-devtools local server pinned
1.8.0 with autoConnect/user-data-dir, no usage statistics/CrUX/network/performance/
emulation categories. Existing four MCP entries were preserved; no Superpowers
loaded. Node24.11.0 compatible. Package help and actual stdio initialize/tools-list
passed (protocol2024-11-05,server1.8.0,22 tools, disabled categories absent), owned
test processes stopped. No tools/call, Edge attachment, page enumeration, cookies,
or business-page data access occurred. Config is global, not a product dependency.

Restart OpenCode to load new tools; keep Edge and current D365 Details page open.
Next session must use this exact source checkout, preserve pending Options-onload
fix (458 tests/build passed, not released) and Created On investigation. Initial
browser use must be limited to the user's current D365 tab/field structure, with
no raw customer values, broad screenshot, cookie/request collection, or case edits.
A working MCP handshake is not yet proof that Edge attachment succeeds. Microsoft
documents autoConnect for existing Edge; no new browser/profile is needed here.

## Direct Debugging Follow-Up

The user confirmed clicking Allow. MCP list_pages still returned Network.enable
timeout, but a direct minimal Runtime.evaluate subsequently succeeded on the
existing local D365 target. Targeted readonly structural scans also succeeded,
returning no Created On label/attribute in the accessible D365 documents (4332
elements,20iframe nodes, no scan limit reached); connector target likewise had
no matching label. No customer values were returned. This establishes usable
direct CDP, not a captured Created On field; cross-origin/current-page scope is
still unresolved. Ask user to ensure the LOCAL Edge current case Details panel
is visible, rather than more permission clicks or manual DOM-copy scripts.

Post-restart connection attempt: MCP tools are now available but list_pages timed
out, then reported Network.enable timeout. Edge owns loopback9222 and its
DevToolsActivePort exists. A bounded direct CDP fallback successfully enumerated
only D365 target identifiers/domains, but targeted inspection of the D365 page
and connector iframe each timed out at25seconds. No DOM result or customer values
were retrieved; no network instrumentation, navigation, case writes or browser
termination occurred. Do not keep retrying. Ask the user whether Edge shows a
remote-debugging approval dialog or DevTools paused-script indicator. The exact
timed-out CDP command was not recorded, so do not assert an authorization cause.

The user explained every new node process caused another authorization prompt and
identified the active D365 internal case tab. A single-connection readonly CDP
investigation then found Created On in the MAIN document. Exact container:
`[data-id="createdon.fieldControl-datetime-description_container"]`. Its readonly
text inputs have no id/data-id and are nested9/5levels; label for does not match
either input. Modified On has its own separate equivalent container. No field
values/customer content were returned;17frame contexts inspected, connection
detached and process exited. Avoid repeated new connections/permission prompts.

PageReader now prioritizes that exact scoped container, descendant text controls,
DOM-order raw strings, and excludes nested foreign field controls. Multiple
containers or more than2eligible controls fail closed; missing/empty falls back.
Five synthetic regressions reproduce actual nesting/readonly/non-input label
target and separation from Modified On. RED oldreader failed; final130/130 tests
(scraper/snapshot/FABidentity) passed, TypeScript and final build passed, menu5/5
and sourcecopy passed; bounded review no blockers. No installed extension/public
asset changed, no dates copied to fixtures, no timezone or caching change.

## Next Single Action

The user approved beta5 plus reusable debugging workflow. Added
docs/edge-d365-debugging-workflow.md and AGENTS/guide entry points; no embedded
private profile paths, customer values or automatic plugin installation. The
workflow preserves one-connection CDP, scoped field/iframe evidence and explicit
authorization boundaries. All three version carriers now beta.5.

Final beta5 local build/probe passed: Temp dh-beta5-release-20260908,
DynamicsHelper_v2.0.76-beta.5.zip,14,007,154 bytes,SHA-256
862d81d8f7ac5801f03b56b8276313202e25541aca016706c8a112b18b486f65.
56files/55manifestentries,13frontend/35runtime,17requiredimports,2plugins excluded,
setuptools0.92productinputs unchanged through build. Focused tests569/569 unique
(519frontend,50Host),zero failures/skips/retries; Reactact warnings disclosed.
Frontend wrapper timeout did not stop the monitored test process; it finished
exit0 and was not rerun. Final probe beta5/schema valid, profiles empty, no
surviving processes. tzdata/Browserslist warnings remain. Release notes prepared.

Beta5 published at2026-09-08 14:51:41 UTC, public prerelease/notdraft/notlateststable:
https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.76-beta.5
Feature/tag commit be19f8fb9ae9a05d26da4c0aac0c6fd495f65da8,92productinputs bound
to commit, only intended branch/tag pushed. GitHub uploaded asset size14,007,154
and digest862d81d8f7ac5801f03b56b8276313202e25541aca016706c8a112b18b486f65 match
testedZIP. No user-machine installation performed. Workflow docs are committed
and AGENTS-linked; global MCP config remains local developer setup, not packaged.

Remain in the LOCAL checkout
`C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`. Report beta5 URL,
workflow reference and validation. Await user's normal upgrade/Created On field
observation, without requesting customer content. No automatic user-machine
upgrade, security change, case edits, or additional release scope.

The user reports having started a new session, but it initially read the old
master checkout. That old checkout's clean status and July handoff do not describe
this work. The earlier documentation checkpoint preserved the 35-file cleanup;
current work additionally contains beta3 product fixes and tests. Push, publication,
tool installation, migration, and cloud operations remain unauthorized.

## Historical Local Commit Boundary

The following approval was consumed by f283e2d. It does not cover current changes.

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
