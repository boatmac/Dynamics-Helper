# Plan D Pragmatic Delivery Gate Design

> **Amended by (2026-09-05):**
> [Visible Update Completion Design](2026-09-05-visible-update-completion-design.md).
> That amendment replaces mounted-time acknowledgment with eight continuous
> visible seconds and makes committed-B2 recovery the only Scenario 2 PASS.
> Conflicting behavior or qualification text below is historical context.

## Status

Approved scope reduction for the final delivery gate after Plan D Milestone 4
commit `81f7dc6`. It supersedes the broader VM matrix originally proposed in this
document and intentionally optimizes for the current single-user deployment.

This design does not authorize a public release, tag, push, or modification of
the current workstation before the empty-cloud-PC checks pass.

The original beta1 publication intent is superseded. Private
`2.0.76-beta.1` completed a real committed transaction but is DISQUALIFIED
because its terminal notification replayed permanently. It remains unpublished
historical evidence only. Formal qualification now targets
`2.0.76-beta.2`; every beta2 scenario remains pending until separately
authorized execution.

## Goal

Establish enough practical confidence to make the effectively empty cloud PC
the primary environment on qualified B2, while retaining the existing
`v2.0.75-beta.1` workstation as an unchanged fallback, without building one-use
fault-injection infrastructure.

## Risk Decision

The production transaction engine, rollback boundaries, mixed-install handling,
candidate validation, and restart state machine already have extensive automated
coverage. Repeating every synthetic boundary through a new cloud-PC harness would add
substantial code that has no product value after this release.

The cloud-PC gate therefore verifies the highest-value integrated paths only:

1. a complete Plan D installation;
2. one uninterrupted transactional update;
3. one interrupted transactional update and recovery;
4. one matching-installer repair; and
5. normal Analyze and Options behavior after each terminal product state.

Task 5 fills the exact B2 path, commit, and SHA-256 and independently reviews
the runbook before executing any of these scenarios.

The gate does not claim cloud-PC coverage for every forward-copy fault, rollback
failure, hostile archive, or legacy mixed-install direction. Those remain
covered by existing automated tests. This is an explicit single-user risk
acceptance, not evidence that those scenarios ran on the cloud PC.

## Versions And Artifacts

| Artifact | Version | Role | Publication |
|---|---|---|---|
| Historical A | `2.0.74-beta.4` | Retained prior evidence only; not rerun | Never republished |
| B1 | `2.0.76-beta.1` | Installed cloud-PC baseline and rollback prior; technically successful but disqualified | Never publish |
| B2 | `2.0.76-beta.2` | Corrected transaction target and matching installer | Qualification pending; separate publication approval required |

Historical A and B1 contain the reviewed pre-fix Plan D implementation. A used
the committed `2.0.74-beta.4` product identity without a version rewrite.
B2 additionally contains the reviewed one-shot completion correction.
B1 received the historical reviewed version-only commit and was built from that
exact commit. It is retained only as the installed baseline and immutable
evidence; no `v2.0.76-beta.1` tag may be created. Task 5 records B2's exact
commit and immutable build identity before qualification.

The normal release-helper command is not used to prepare these private artifacts
because it commits and tags before building. The implementation plan must use
explicit isolated-clone build steps that do not commit, tag, push, publish,
install, or register anything on the build workstation.

For each artifact, record:

- source commit;
- effective Host and Extension version;
- ZIP SHA-256;
- exact PyInstaller version; and
- build/test result.

B2 is built once for qualification. Every B2 test and eventual publication must
use that exact ZIP. Any B2 rebuild changes its qualification identity and requires
rerunning the gate.

The beta2 completion acceptance contract is transaction-bound. `complete`
requires the originating lowercase 32-hex `transactionId`, and only exact
`{type:'DH_UPDATE_ACK_COMPLETE',transactionId}` may consume it. The Service
Worker persists a matching committed transition to `idle` (removing the private
URL) or a matching rolled-back transition to `available` (ordinary Retry) before
broadcast. Stale, wrong, malformed, and duplicate ACKs are no-ops. FAB and
Options display completion immediately; the first view mounted on it for eight
seconds sends the global ACK, and only the authoritative broadcast hides all
views. Closing earlier yields a fresh interval on the next mount.

## Private Distribution

A and B1 copy history remains evidence. B2 is copied from the build workstation
through Windows local-drive redirection into `C:\DH-CloudPC`; installers never
run directly from a redirected drive. B2 is additionally uploaded as the sole
object in a private test-only HTTPS container with a short-lived, read-only URL
whose path ends in `.zip` for transactional download scenarios.

The B2 URL must not appear in source control, screenshots, or the final report.
The cloud PC is treated as credential-bearing because logs may contain the URL. Revoke
the URL and remove the private object when validation finishes.

Manual candidate injection bypasses only GitHub release discovery. The
production Service Worker and Host must still validate strict version ordering,
capabilities, current installation integrity, archive contents, package hashes,
transaction authority, terminal product integrity, and finalization.

## Existing Automated Evidence

Before beta2 cloud-PC work, rerun the exact committed B2 source tests and builds. The required
automated evidence includes:

- the complete Host suite, including update journal, engine, rollback, recovery,
  entrypoint, action, and installer-settlement tests;
- the complete Extension suite, including candidate parsing, Service Worker
  restart, polling, reload, finalization, mixed-install projections, and UI
  ownership tests;
- TypeScript compilation and the production Extension build;
- exact PyInstaller `6.22.2` frozen Host build and staged-probe integration;
- `git diff --check`; and
- confirmation that `Updater.apply_update` is not production reachable after
  Plan D cutover.

These tests, rather than new cloud-PC-only tools, remain the evidence for:

- Host, `_internal`, Extension, metadata, and target-probe rollback boundaries;
- rollback-failure evidence retention;
- malformed, unsafe, wrong-version, and hash-mismatched archives;
- stale, equal, and older candidates;
- both legacy mixed-install directions; and
- detailed Worker/Host/runner state-machine races.

## Empty Cloud PC Setup

Use the existing Windows cloud PC while it is still effectively empty. Install
Chrome or Edge and the supported Copilot CLI. A designated non-customer Dynamics
test case is available for Analyze smoke checks; record only PASS/FAIL, never its
case ID, content, report, or screenshots. Do not migrate the current workload,
use customer data, or use a real support case until all three scenarios pass.

The cloud PC can be rebuilt but has no practical checkpoint/restore mechanism.
Do not depend on rebuilding it between scenarios. Historical A evidence is not
rerun; use the complete B1 installer to establish the baseline before each
transactional scenario.

| Baseline | State |
|---|---|
| `cloud-clean` | Effectively empty cloud PC with browser, Copilot CLI, and private-download access |
| `plan-d-b1` | Complete B1 installation with verified Host/Extension version and integrity, no active transaction, and safe coordinator state |

To establish or re-establish `plan-d-b1`:

1. extract the recorded B1 ZIP;
2. use the runbook's guarded direct `installer_core.ps1` command, preserving the
   exact empty-cloud-PC marker, browser/Host/runner process, local artifact path,
   and installer success-marker guards; do not invoke `install.bat`;
3. confirm Native Messaging is registered to the installed frozen Host;
4. confirm Host and Extension both report `2.0.76-beta.1`;
5. confirm `transactional-update-v1` is present;
6. confirm installation integrity is verified;
7. confirm `Receive beta updates` is disabled so release discovery cannot
   replace the manually controlled B2 candidate;
8. use the one-time guarded private B1 cleanup for the known unpublished
   old-shape state, if and only if every predicate matches, then perform a normal
   Worker Stop and Options wake;
9. confirm there is no `updates/active.json` authority before starting another
   scenario;
10. never manually clear a new beta2 `complete` or use Extension Reload/
    Unregister as completion cleanup;
11. confirm coordinator state is exactly `idle`, with no retained update URL;
12. run one non-customer Analyze smoke case; and
13. change and restore one harmless Options preference.

Do not manually delete `updates/**` or clear a nonterminal or recovery-required
`dh_update_state` to force the baseline. If B1 cannot be re-established safely,
first run the exact B2 installer to settle the target. If B2 cannot repair the
installation, run the exact B1 installer to settle the prior version. Rebuild the
still-empty cloud PC only if both complete installers fail.

Do not use source mode for any cloud-PC update scenario. Source mode intentionally
returns `source_update_disabled`.

## Cloud PC Scenario 1: Uninterrupted Transaction

Establish `plan-d-b1` at public coordinator state `idle`. In the open Options
console, inject B2 as the exact `available` `dh_update_state`, then immediately
stop only the Service Worker through Edge's normal Application-pane **Stop**
control. Return to the same Options page and send `DH_UPDATE_GET_STATE` to wake
a fresh normal Worker; require the hydrated candidate to remain `available`
before starting the payload-free `DH_UPDATE_START` request. Seed must precede
Stop. Extension Reload and Unregister are forbidden: reload triggers
`onInstalled`, whose public check can return `update_not_available` and clear a
manually injected private candidate. If the wake returns `idle`, re-establish a
fresh idle baseline and re-enter the SAS URL. Dynamic import, debugger/minified
aliases, and product backdoors are not substitutes for the normal Worker Stop.

Pass criteria:

- the transaction reaches `complete/committed`;
- Host and Extension both report `2.0.76-beta.2`;
- installation integrity is verified;
- no transaction workspace remains after final acknowledgment;
- fresh automated FAB/Options tests prove exact 7,999/8,000-ms timing; on the
  cloud PC the real terminal banner and FAB bubble appear after reload, then
  disappear globally without manual intervention and stay absent across both
  view refreshes. Cloud timing is approximate integration evidence, not a second
  exact-millisecond proof;
- committed public state is `idle` with no candidate URL;
- Analyze succeeds with synthetic input; and
- an Options preference can be changed and restored.

Record the transaction ID, terminal state, effective versions, integrity result,
and B2 ZIP SHA-256. Do not record the private URL.

## Cloud PC Scenario 2: Interrupted Recovery

Re-establish `plan-d-b1` with B1's complete installer and verify the baseline
contract above. Start the same B1-to-B2 update with a fresh transaction ID. Wait
until `active.json` resolves to the same browser-owned journal, that journal is
`waiting-for-host-exit` or a later nonterminal phase, RunOnce recovery is armed,
and exactly one runner from `updates/recovery` is executing `--complete-update`.
Terminate that exact original runner PID, not every process with the same name.

Within ten seconds, close all browser windows and terminate only a remaining
main Host. Confirm browser, main Host, and runner counts are all zero while the
same post-activation active authority and journal remain. Reopen the browser and
Options page without manually editing `dh_update_state`, sending a manual ping,
or deleting `updates/**`. The expected recovery evidence is a new
`--recover-active` runner and continued progress under the original transaction
ID.

Pass criteria:

- recovery continues under the original transaction ID;
- the final product is either complete B2 with `committed` or complete B1 with
  `rolled-back`;
- Host and Extension versions agree;
- installation integrity is verified;
- no failed update is presented as successful; and
- rolled-back completion becomes ordinary B2 Retry after its authoritative ACK;
- Analyze and Options smoke checks pass in the terminal product.

This single interruption is the integrated restart smoke test. Detailed Worker,
Host, runner, alarm, and finalization interruption permutations remain automated
test responsibilities.

## Cloud PC Scenario 3: Matching-Installer Repair

Re-establish `plan-d-b1` with B1's complete installer and verify the baseline
contract above. Run the complete B2 installer once to establish a known-good B2
installation. Add one harmless unexpected sentinel file beneath the installed
`_internal` tree. Run the exact same B2 installer again.

Pass criteria:

- the sentinel is removed because `_internal` is replaced as a complete tree;
- Host and Extension both report B2;
- installation integrity is verified;
- user-owned configuration and prompt files are preserved; and
- Analyze and Options smoke checks pass.

This scenario verifies the supported matching-installer recovery path without
intentionally corrupting executable bytes or creating an unrecoverable mixed
installation.

## Environment Handoff

The current workstation is running `v2.0.75-beta.1`, whose update click still
uses the historical updater. It must not be used as the first Plan D transaction
test.

After all automated and cloud-PC checks pass:

1. keep the qualified cloud PC on exact B2;
2. disable `Receive beta updates` on the old workstation, or disable its
   Dynamics Helper extension, before B2 is published;
3. do not click Update on the old workstation and do not install A, B1, or B2
   there;
4. obtain explicit approval to tag, push, and publish the already-qualified B2
   ZIP without rebuilding it;
5. verify the published asset SHA-256 still equals the qualified B2 hash; and
6. migrate the real workload to the cloud PC only after its B2 installation,
   integrity, Analyze, and Options checks remain healthy.

The old workstation remains a frozen beta1 fallback. It is not a second active
Plan D environment and is outside the B2 delivery qualification.

## Minimal Evidence Record

Maintain one concise Markdown checklist rather than a dedicated evidence
collector. For each scenario record only:

- date and cloud-PC baseline establishment;
- source commit and B1/B2 ZIP SHA-256;
- starting and terminal versions;
- transaction ID when applicable;
- terminal `dh_update_state` kind and outcome;
- installation-integrity result;
- Analyze/Options smoke result; and
- pass/fail plus a short sanitized note.

Screenshots are optional. Never include private URLs, query strings, customer
content, prompt contents, access tokens, or full logs.

## Beta2 Qualification And Publication Gates

B2 may be considered qualified only when:

1. exact-commit automated tests and builds pass;
2. all three cloud-PC scenarios pass;
3. B2's recorded SHA-256 matches the tested ZIP;
4. the old workstation no longer considers beta releases and remains unchanged;
5. the result log explicitly states that exhaustive cloud-PC fault and mixed-state
   coverage was not performed;
6. no credential or PII appears in the result log; and
7. fresh automated tests prove exact 7,999/8,000-ms behavior; cloud-PC integration
   shows the real terminal banner and FAB bubble appear after reload, disappear
   globally without manual intervention, and remain absent across FAB/Options
   refresh. Committed public state is idle/no URL and rollback becomes Retry;
   cloud timing is approximate rather than independent exact-millisecond proof.

Qualification approval does not authorize publication. After qualification,
the user must separately approve tag, push, and GitHub prerelease creation.
Workload handoff is a third separate approval. B1 is never eligible for any of
these publication steps.

## Explicit Non-Goals

- Publishing A.
- Exercising the historical updater or installing A/B1/B2 on the old
  workstation.
- Building a cloud-PC-only artifact framework, fault harness, mixed-state constructor,
  or evidence collector.
- Repeating every automated rollback or restart permutation on the cloud PC.
- Claiming cloud-PC validation of either legacy mixed-install direction.
- Adding a configurable production update endpoint or fault-injection backdoor.
- Proving per-write power-loss atomicity, standalone bootstrap, registry hive
  flush, or multi-profile registry quiescence.
- Migrating the current workload onto the cloud PC before qualification passes.
- Using customer data or the existing workstation installation for destructive
  tests.
