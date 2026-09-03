# Plan D Pragmatic Delivery Gate Design

## Status

Approved scope reduction for the final delivery gate after Plan D Milestone 4
commit `81f7dc6`. It supersedes the broader VM matrix originally proposed in this
document and intentionally optimizes for the current single-user deployment.

This design does not authorize a public release, tag, push, or modification of
the current workstation before the empty-cloud-PC checks pass.

## Goal

Establish enough practical confidence to make the effectively empty cloud PC
the primary environment on qualified B, while retaining the existing
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

The gate does not claim cloud-PC coverage for every forward-copy fault, rollback
failure, hostile archive, or legacy mixed-install direction. Those remain
covered by existing automated tests. This is an explicit single-user risk
acceptance, not evidence that those scenarios ran on the cloud PC.

## Versions And Artifacts

| Artifact | Version | Role | Publication |
|---|---|---|---|
| A | `2.0.74-beta.4` | Current reviewed Plan D baseline installed by full installer | Never republished |
| B | `2.0.76-beta.1` | Transaction target and eventual public prerelease | Only after the gate passes |

Both artifacts contain the same reviewed Plan D implementation. A uses the
current committed `2.0.74-beta.4` product identity without any version rewrite.
B receives one reviewed version-only commit on the working branch and is built
from a clean temporary clone of that exact commit. The eventual
`v2.0.76-beta.1` tag must resolve to the B commit.

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

B is built once for qualification. Every B test and eventual publication must
use that exact ZIP. Any B rebuild changes its qualification identity and requires
rerunning the gate.

## Private Distribution

A and B are copied from the build workstation through Windows local-drive
redirection into `C:\DH-CloudPC`; installers never run directly from a redirected
drive. B is additionally uploaded as the sole object in a private test-only
HTTPS container with a short-lived, read-only URL whose path ends in `.zip` for
transactional download scenarios.

The B URL must not appear in source control, screenshots, or the final report.
The cloud PC is treated as credential-bearing because logs may contain the URL. Revoke
the URL and remove the private object when validation finishes.

Manual candidate injection bypasses only GitHub release discovery. The
production Service Worker and Host must still validate strict version ordering,
capabilities, current installation integrity, archive contents, package hashes,
transaction authority, terminal product integrity, and finalization.

## Existing Automated Evidence

Before cloud-PC work, rerun the exact committed B source tests and builds. The required
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
Do not depend on rebuilding it between scenarios. Instead, use the complete A
installer to establish the baseline before each transactional scenario.

| Baseline | State |
|---|---|
| `cloud-clean` | Effectively empty cloud PC with browser, Copilot CLI, and private-download access |
| `plan-d-a` | Complete A installation with verified Host/Extension version and integrity, no active transaction, and safe coordinator state |

To establish or re-establish `plan-d-a`:

1. extract the recorded A ZIP;
2. run its complete `install.bat`;
3. confirm Native Messaging is registered to the installed frozen Host;
4. confirm Host and Extension both report `2.0.74-beta.4`;
5. confirm `transactional-update-v1` is present;
6. confirm installation integrity is verified;
7. confirm `Receive beta updates` is disabled so public `v2.0.75-beta.1` cannot
   replace the manually controlled B candidate;
8. restart the browser and allow any prior terminal update state to settle;
9. confirm there is no `updates/active.json` authority before starting another
   scenario;
10. if coordinator state is terminal `complete`, record it, verify active
   authority is absent, remove only that terminal record, and reload;
11. confirm coordinator state is exactly `idle`, with no retained update URL;
12. run one non-customer Analyze smoke case; and
13. change and restore one harmless Options preference.

Do not manually delete `updates/**` or clear a nonterminal or recovery-required
`dh_update_state` to force the baseline. If A cannot be re-established safely,
first run the exact B installer to settle the target. If B cannot repair the
installation, run the exact A installer to settle the prior version. Rebuild the
still-empty cloud PC only if both complete installers fail.

Do not use source mode for any cloud-PC update scenario. Source mode intentionally
returns `source_update_disabled`.

## Cloud PC Scenario 1: Uninterrupted Transaction

Establish `plan-d-a`. Inject B as the exact `available` `dh_update_state`, reload
the Service Worker, and confirm the hydrated candidate before starting the
payload-free `DH_UPDATE_START` request.

Pass criteria:

- the transaction reaches `complete/committed`;
- Host and Extension both report `2.0.76-beta.1`;
- installation integrity is verified;
- no transaction workspace remains after final acknowledgment;
- Analyze succeeds with synthetic input; and
- an Options preference can be changed and restored.

Record the transaction ID, terminal state, effective versions, integrity result,
and B ZIP SHA-256. Do not record the private URL.

## Cloud PC Scenario 2: Interrupted Recovery

Re-establish `plan-d-a` with A's complete installer and verify the baseline
contract above. Start the same A-to-B update with a fresh transaction ID. Wait
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
- the final product is either complete B with `committed` or complete A with
  `rolled-back`;
- Host and Extension versions agree;
- installation integrity is verified;
- no failed update is presented as successful; and
- Analyze and Options smoke checks pass in the terminal product.

This single interruption is the integrated restart smoke test. Detailed Worker,
Host, runner, alarm, and finalization interruption permutations remain automated
test responsibilities.

## Cloud PC Scenario 3: Matching-Installer Repair

Re-establish `plan-d-a` with A's complete installer and verify the baseline
contract above. Run the complete B installer once to establish a known-good B
installation. Add one harmless unexpected sentinel file beneath the installed
`_internal` tree. Run the exact same B installer again.

Pass criteria:

- the sentinel is removed because `_internal` is replaced as a complete tree;
- Host and Extension both report B;
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

1. keep the qualified cloud PC on exact B;
2. disable `Receive beta updates` on the old workstation, or disable its
   Dynamics Helper extension, before B is published;
3. do not click Update on the old workstation and do not install A or B there;
4. obtain explicit approval to tag, push, and publish the already-qualified B
   ZIP without rebuilding it;
5. verify the published asset SHA-256 still equals the qualified B hash; and
6. migrate the real workload to the cloud PC only after its B installation,
   integrity, Analyze, and Options checks remain healthy.

The old workstation remains a frozen beta1 fallback. It is not a second active
Plan D environment and is outside the B delivery qualification.

## Minimal Evidence Record

Maintain one concise Markdown checklist rather than a dedicated evidence
collector. For each scenario record only:

- date and cloud-PC baseline establishment;
- source commit and A/B ZIP SHA-256;
- starting and terminal versions;
- transaction ID when applicable;
- terminal `dh_update_state` kind and outcome;
- installation-integrity result;
- Analyze/Options smoke result; and
- pass/fail plus a short sanitized note.

Screenshots are optional. Never include private URLs, query strings, customer
content, prompt contents, access tokens, or full logs.

## Publication Gate

B may be published only when:

1. exact-commit automated tests and builds pass;
2. all three cloud-PC scenarios pass;
3. B's recorded SHA-256 matches the tested ZIP;
4. the old workstation no longer considers beta releases and remains unchanged;
5. the result log explicitly states that exhaustive cloud-PC fault and mixed-state
   coverage was not performed;
6. no credential or PII appears in the result log; and
7. the user explicitly approves tag, push, and GitHub prerelease creation.

## Explicit Non-Goals

- Publishing A.
- Exercising the historical updater or installing A/B on the old workstation.
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
