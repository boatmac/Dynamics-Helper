# Plan D Pragmatic Delivery Gate Design

## Status

Approved scope reduction for the final delivery gate after Plan D Milestone 4
commit `81f7dc6`. It supersedes the broader VM matrix originally proposed in this
document and intentionally optimizes for the current single-user deployment.

This design does not authorize a public release, tag, push, or modification of
the current workstation before the disposable-VM checks pass.

## Goal

Establish enough practical confidence to move the sole current installation
from `v2.0.75-beta.1` onto Plan D, then publish and consume the first
transactional update, without building one-use fault-injection infrastructure.

## Risk Decision

The production transaction engine, rollback boundaries, mixed-install handling,
candidate validation, and restart state machine already have extensive automated
coverage. Repeating every synthetic boundary through a new VM harness would add
substantial code that has no product value after this release.

The VM gate therefore verifies the highest-value integrated paths only:

1. a complete Plan D installation;
2. one uninterrupted transactional update;
3. one interrupted transactional update and recovery;
4. one matching-installer repair; and
5. normal Analyze and Options behavior after each terminal product state.

The gate does not claim VM coverage for every forward-copy fault, rollback
failure, hostile archive, or legacy mixed-install direction. Those remain
covered by existing automated tests. This is an explicit single-user risk
acceptance, not evidence that those scenarios ran in a VM.

## Versions And Artifacts

| Artifact | Version | Role | Publication |
|---|---|---|---|
| A | `2.0.75-beta.2` | Private Plan D baseline installed by full installer | Never published |
| B | `2.0.76-beta.1` | Transaction target and eventual public prerelease | Only after the gate passes |

Both artifacts contain the same reviewed Plan D implementation. Their product
versions differ so A can exercise the production updater against B.

A is built in a clean temporary clone by changing only the authoritative version
carriers. Those A changes are not committed. B receives one reviewed
version-only commit on the working branch and is built from a clean temporary
clone of that exact commit. The eventual `v2.0.76-beta.1` tag must resolve to the
B commit.

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

A is copied directly into the disposable VM and installed locally. B is uploaded
as the sole object in a private test-only HTTPS container with a short-lived,
read-only URL whose path ends in `.zip`.

The B URL must not appear in source control, screenshots, or the final report.
The VM is treated as credential-bearing because logs may contain the URL. Revoke
the URL and remove the private object when validation finishes.

Manual candidate injection bypasses only GitHub release discovery. The
production Service Worker and Host must still validate strict version ordering,
capabilities, current installation integrity, archive contents, package hashes,
transaction authority, terminal product integrity, and finalization.

## Existing Automated Evidence

Before VM work, rerun the exact committed B source tests and builds. The required
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

These tests, rather than new VM-only tools, remain the evidence for:

- Host, `_internal`, Extension, metadata, and target-probe rollback boundaries;
- rollback-failure evidence retention;
- malformed, unsafe, wrong-version, and hash-mismatched archives;
- stale, equal, and older candidates;
- both legacy mixed-install directions; and
- detailed Worker/Host/runner state-machine races.

## Disposable VM Setup

Use a Windows 11 VM containing Chrome or Edge and the supported Copilot CLI. Do
not use customer data or a real support case.

Create two checkpoints:

| Checkpoint | State |
|---|---|
| `S0-clean` | Clean VM with browser, Copilot CLI, and private-download access |
| `S1-plan-d-a` | Complete A installation with verified Host/Extension version and integrity |

To create `S1-plan-d-a`:

1. extract the recorded A ZIP;
2. run its complete `install.bat`;
3. confirm Native Messaging is registered to the installed frozen Host;
4. confirm Host and Extension both report `2.0.75-beta.2`;
5. confirm `transactional-update-v1` is present;
6. confirm installation integrity is verified;
7. run one non-customer Analyze smoke case; and
8. change and restore one harmless Options preference.

Do not use source mode for any VM update scenario. Source mode intentionally
returns `source_update_disabled`.

## VM Scenario 1: Uninterrupted Transaction

Restore `S1-plan-d-a`. Inject B as the exact `available` `dh_update_state`, reload
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

## VM Scenario 2: Interrupted Recovery

Restore `S1-plan-d-a` and start the same A-to-B update with a fresh transaction
ID. Once durable state becomes nonterminal, close the browser and terminate the
main Host. Reopen the browser and Options page without manually editing
`dh_update_state` or deleting `updates/**`.

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

## VM Scenario 3: Matching-Installer Repair

Restore `S1-plan-d-a`, then run the complete B installer once to establish a
known-good B installation. Add one harmless unexpected sentinel file beneath
the installed `_internal` tree. Run the exact same B installer again.

Pass criteria:

- the sentinel is removed because `_internal` is replaced as a complete tree;
- Host and Extension both report B;
- installation integrity is verified;
- user-owned configuration and prompt files are preserved; and
- Analyze and Options smoke checks pass.

This scenario verifies the supported matching-installer recovery path without
intentionally corrupting executable bytes or creating an unrecoverable mixed
installation.

## Current Workstation Migration

The current workstation is running `v2.0.75-beta.1`, whose update click still
uses the historical updater. It must not be used as the first Plan D transaction
test.

Only after all automated and VM checks above pass:

1. back up `%LOCALAPPDATA%\DynamicsHelper\config.json`, editable prompt files,
   and any other user-owned data;
2. close all browser windows;
3. install the exact qualified private A ZIP with its complete installer;
4. verify Host and Extension are both A, integrity is verified, and normal usage
   works;
5. obtain explicit approval to tag, push, and publish B;
6. publish the exact qualified B ZIP without rebuilding it; and
7. use Plan D on the workstation to update A to B.

If the private A installation fails, stop and restore from backup or run the
matching complete installer. Do not publish B to work around a failed A
installation.

## Minimal Evidence Record

Maintain one concise Markdown checklist rather than a dedicated evidence
collector. For each scenario record only:

- date and VM checkpoint;
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
2. all three VM scenarios pass;
3. B's recorded SHA-256 matches the tested ZIP;
4. the current workstation is safely migrated to private A and verified;
5. the result log explicitly states that exhaustive VM fault and mixed-state
   coverage was not performed;
6. no credential or PII appears in the result log; and
7. the user explicitly approves tag, push, and GitHub prerelease creation.

## Explicit Non-Goals

- Publishing A.
- Exercising the historical updater on the current workstation.
- Building a VM-only artifact framework, fault harness, mixed-state constructor,
  or evidence collector.
- Repeating every automated rollback or restart permutation in a VM.
- Claiming VM validation of either legacy mixed-install direction.
- Adding a configurable production update endpoint or fault-injection backdoor.
- Proving per-write power-loss atomicity, standalone bootstrap, registry hive
  flush, or multi-profile registry quiescence.
- Using customer data or an existing workstation installation for destructive
  tests.
