# Cloud PC Update Qualification: Paused

Updated: 2026-09-07. This file records qualification boundaries, not an executable
setup or update script. Start development handoff at
[the recovery entry](session-handoff-2026-07-15.md).

## Current Disposition

- B2 `2.0.76-beta.2` was built and locally verified. Its normal B1-to-B2 trial
  failed under Defender; B1 rollback and packaged integrity were reported.
- Interrupted-recovery and matching-installer-repair scenarios were not run.
- Full transaction settlement and current Defender allow/override state are not
  established. The old download URL was revoked by deleting the private resource.
- Update operations are paused. The user now requires a local milestone before
  considering Cloud PC transfer; no failed qualification attempt is resumed.
- Exact versions, source IDs, package hashes, test scope and incident evidence
  belong in [the results ledger](plan-d-pragmatic-cloud-pc-results.md).

## Procedure Status

The previous 1,254-line runbook mixed historical commands, six blocking throws,
temporary guard snippets, and stale artifact placeholders. A normal update was
later authorized and executed through chat, without a recorded replacement of
all of those document barriers. Preserve that discrepancy: do not claim the run
followed a fully executable reviewed runbook.

Those commands are removed from the current working instructions. Their exact
original text remains at commit `6413dbad9bd258bb04cf313610d602b68424e091`, path
`docs/plan-d-pragmatic-cloud-pc-runbook.md`, for investigation only. Do not recover
and execute them by changing a version, transaction ID, or private URL.

Removing obsolete instructions does not grant permission or remove safety
requirements. A future explicitly authorized experiment needs one bounded
procedure for its actual goal and current environment, not reactivation of the
whole historical checklist. This cleanup does not design that experiment.

## Retained Safety Boundaries

- Never bypass Defender or assume an allow action is one-time or persistent
  without observing current settings. The detection is not a confirmed false
  positive. No signing, security-setting, or recovery-architecture change has
  been approved as a remedy.
- Do not delete `updates/**`, transaction journals, backups, or finalization
  evidence. Do not clear browser update state to manufacture a successful test.
- A reported rollback is not full settlement. Match the actual transaction,
  installed versions/integrity, canonical terminal evidence, and remaining
  process/registration/filesystem state before any approved destructive cleanup.
- Historical initial committed-B1 cleanup and per-attempt rolled-back-B1 cleanup
  are different operations; neither authorizes cleanup of an arbitrary state.
- Do not run installations or update trials on the old workstation. Do not
  confuse a source checkout with the Cloud PC's installed product root.
- Private distribution must have explicit ownership, limited access, verified
  bytes, and cleanup on pass/fail/abort. Retain secrets privately, not in Git.
- Each future update/install/process/security/cloud mutation and each publication
  requires explicit authorization. A former trial approval does not cover retries.

## Accepted Qualification Criteria

The [September 7 design](superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md)
records the accepted three-scenario qualification scope. It is not an active
work queue while product development is paused.

| Scenario | What constitutes success | Current result |
| --- | --- | --- |
| Normal B1-to-B2 update | B2 commits, complete product integrity and smoke pass, completion is visibly consumed and does not replay | FAIL: Defender quarantine, rolled back B1 |
| Interrupted recovery | Captured original transaction interruption, zero-executor and recovery evidence, then committed B2 with all required checks | NOT RUN |
| Same-package installer repair | Complete matching product repaired, fixed sentinel removed without overwriting an existing entry, protected user-file presence and bytes unchanged, smoke passes | NOT RUN |

The [visible-completion design](superpowers/specs/2026-09-05-visible-update-completion-design.md)
governs UI behavior: foreground completion surface continuously visible for
eight seconds, loss of visibility discards elapsed time, and only persisted
Service Worker authority removes the result. Cloud observation is approximate;
exact timing, stale callbacks, and duplicate ACKs are covered by automated tests.
No forced Status bubble, synthetic completion, or manual ACK is valid evidence.

B1 does not implement the new ACK protocol. Safe B1 rollback cannot qualify B2's
one-shot behavior. The historical three-attempt limit applies only to a separately
authorized interruption scenario; it is not permission to retry the failed
normal-update trial. A FAIL remains FAIL even if recovery later succeeds.

## Guard Evidence, Not Ready-Made Tools

The earlier B1 rollback guards were reported to pass 54 PowerShell and 75
JavaScript isolated checks; Scenario 3 guards passed 27 mock checks. Independent
reviews were recorded. These temporary tests were not committed CI tests and do
not prove real Windows ACL/reparse behavior or eliminate concurrent-change races.

The snippets and their historical markers remain in the Git version identified
above. They are neither required files for Cloud PC handoff nor approved scripts
to run there. Preserve available private evidence separately; do not rebuild an
evidence framework merely to make old records appear complete.

## Stop Point

No update, installer, browser cleanup, security change, artifact upload, or fault
injection follows from this document. The next step is the documentation/source
handoff described in the recovery entry, not another qualification transaction.
