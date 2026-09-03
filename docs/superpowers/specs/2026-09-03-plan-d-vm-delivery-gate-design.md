# Plan D VM Delivery Gate Design

## Status

Approved design for the final delivery gate after Plan D Milestone 4 commit
`81f7dc6`. This design does not authorize a public release, tag, push, real-user
installation, or modification of an existing non-disposable installation.

## Goal

Verify the reviewed Plan D implementation against exact private release
artifacts before making the first cutover beta public. The gate must prove the
legacy-to-cutover transition, transactional success, deterministic rollback,
restart recovery, mixed-install handling, and preservation of recovery
evidence.

## Governing Principles

1. No unverified build is published to GitHub Releases.
2. VM verification uses the exact candidate ZIP later published. Passing a
   rebuild does not authorize publishing different bytes.
3. Candidate discovery and update execution are separate contracts. Existing
   automated tests cover GitHub response parsing, channel selection, strict
   SemVer ordering, and direct HTTPS ZIP selection. The VM may inject a private
   candidate to exercise the production transaction path without publishing it.
4. A manually injected candidate bypasses only GitHub discovery. The Host and
   Service Worker must still enforce package version, package hashes,
   capabilities, installed-product integrity, transaction authority, terminal
   verification, and finalization.
5. Fault injection must not add a production environment-variable backdoor or
   alter the release ZIP. A repository-only VM harness invokes production
   engine code through existing dependency-injection seams.
6. Every destructive browser or installer test runs only in a disposable
   Windows VM restored from a named checkpoint.

## Artifacts And Versions

The gate uses two private builds derived from the same reviewed product code and
VM harness commit. B additionally includes one traceable version-only commit:

| Artifact | Version | Role | Publication |
|---|---|---|---|
| A | `2.0.75-beta.2` | Complete installed Plan D baseline | Never published |
| B | `2.0.76-beta.1` | Transaction target and release candidate | Published only after the gate passes |

The historical legacy starting point is public release `v2.0.75-beta.1`.

Artifact A is built in a clean temporary clone of the reviewed harness commit by
changing only the version carriers in that disposable clone. The changes are
never committed. The current branch then receives one reviewed version-only
commit for B. Artifact B is built in a separate clean temporary clone of that
exact B commit. The eventual B tag must resolve to that commit.

The normal release helper is not used as an unreviewed convenience command
because it changes versions, stages every change, commits, and tags before
building. The implementation plan must provide explicit build commands or a
purpose-built artifact builder that:

- changes only the three authoritative version carriers when preparing A;
- requires B's effective version to already match the clean B source commit;
- builds the Extension and frozen Host with exact PyInstaller `6.22.2`;
- creates the Plan A package metadata and deterministic ZIP;
- writes SHA-256 and source commit records outside the ZIP;
- refuses a dirty temporary clone; and
- never commits, tags, pushes, publishes, installs, or registers anything.

B is built exactly once for qualification. Its SHA-256 is the artifact identity
used by every B scenario and by eventual publication. If B changes for any
reason, all B scenarios restart with a new SHA-256.

## Private Distribution

A is transferred directly into the disposable VM and installed from its local
ZIP. Only B is uploaded, as one blob, to a private test-only HTTPS container.
Its test URL:

- grants read-only access to one blob;
- expires shortly after the planned VM session;
- has a path ending in `.zip`;
- has no fragment or user information; and
- is never copied into source control, screenshots, or final reports.

The legacy updater may log the complete URL, so the container contains no other
data and the VM is treated as credential-bearing until destroyed. Revoke the
SAS tokens and remove the blobs when verification finishes.

## Verification Components

### Artifact Builder

The artifact builder creates A and B without Git operations or publication. It
outputs an evidence record containing:

- source commit;
- effective Host and Extension version;
- ZIP SHA-256;
- PyInstaller version;
- required hidden-import graph result; and
- onedir inventory count.

### Sandbox Fault Harness

`tools/plan_d_vm_gate.py` validates A and B, creates an isolated live product
from A, and invokes the production `UpdateEngine` against B. It does not
reimplement transaction logic.

The harness accepts a scenario name and an explicitly supplied sandbox root. It
must reject:

- a sandbox equal to or beneath the real `%LOCALAPPDATA%\DynamicsHelper`;
- a non-empty sandbox it did not initialize;
- packages whose declared and effective versions differ from the expected A/B
  versions;
- packages lacking `transactional-update-v1`; and
- unverified package hashes or metadata links.

It uses `UpdateEngineHooks` to inject a one-shot failure at these production
boundaries:

- `install-host:dh_native_host.exe`;
- `install-host:_internal`;
- `install-extension`;
- `install-metadata:release-integrity.json`;
- `install-metadata:installed-product.json`; and
- target `probe_installed_product`.

Each one-shot fault disables itself before rollback. A separate rollback-failure
scenario injects a forward failure and one reverse-path failure to prove
`RECOVERY_REQUIRED` evidence retention.

The sandbox harness also verifies malformed, unsafe, wrong-version, and
hash-mismatched B packages change no live byte.

### Browser Evidence Collector

A repository-only collector reads, but does not mutate, the disposable VM
installation and writes a timestamped evidence directory. It records:

- A and B ZIP SHA-256 values;
- effective Host and Extension versions;
- `get_capabilities` and `verify_installation` responses;
- sanitized `dh_update_state`;
- active journal and any finalization cursor, receipt, or acknowledgment;
- product hash inventories for Host, Extension, `_internal`, and metadata;
- relevant process identities and Native Messaging registration targets;
- a redacted log tail; and
- the operator's scenario result.

The collector must redact URLs, query strings, instruction contents, customer
data, workspace paths, and other credentials or PII.

### Mixed-State Constructor

A repository-only PowerShell tool deterministically constructs each legacy
mixed state from a restored `S1-legacy` checkpoint and the validated B package.
It must refuse any root other than the VM's explicit test installation and must
never run outside a disposable VM acknowledgment gate.

- For **new Extension plus old Host**, it replaces only the installed Extension
  with B's complete Extension and leaves the legacy Host unchanged.
- For **old Extension plus new Host**, it replaces the complete Host onedir and
  B package metadata while preserving the legacy Extension.

The constructor records before/after hash inventories. It does not claim that
the legacy updater deterministically produced the partial copy. The separate
complete legacy-to-B scenario exercises the real legacy updater; these
constructed states exercise the two exact cutover-startup results that Plan D
must contain.

## VM Checkpoints

Use one disposable Windows 11 VM with Chrome or Edge, the supported Copilot CLI,
and no real customer data. Create these checkpoints:

| Checkpoint | State |
|---|---|
| `S0-clean` | Clean VM with browser, Copilot CLI, and private-download prerequisites |
| `S1-legacy` | Complete public `v2.0.75-beta.1` Host and Extension installation |
| `S2-plan-d-a` | Complete private A installation with verified integrity and `transactional-update-v1` |

Restore a checkpoint before every scenario. Do not reuse an installation after
a failed or interrupted scenario.

## Scenario Matrix

### Legacy-To-Cutover Scenarios From `S1-legacy`

1. **Complete first upgrade:** Seed the legacy `pending_update` record with B's
   private URL and use the legacy UI to update. The old updater may show its
   historical success message. On B startup, the complete product must verify as
   B and enable Plan D.
2. **New Extension plus old Host:** Use the mixed-state constructor to install
   B's complete Extension while preserving the legacy Host. B's Service Worker
   must persist matching-installer guidance, create no Plan D transaction,
   execute no second update, and report no transactional success.
3. **Old Extension plus new Host:** Use the mixed-state constructor to install
   B's complete Host and package metadata while preserving the legacy Extension,
   then issue the legacy URL-only `perform_update`. B Host must reject it with
   fixed installation-integrity guidance and create no new transaction.

Both mixed states must be repaired by the exact B full installer. After repair,
Host, Extension, capabilities, and package integrity must all agree on B without
deleting unrelated user files or `updates/**` evidence.

### Transactional Browser Scenarios From `S2-plan-d-a`

Inject B as an exact `available` `dh_update_state`, reload the Worker, confirm
the hydrated state, then start with payload-free `DH_UPDATE_START`.

Run these scenarios independently:

1. uninterrupted A-to-B commit;
2. Service Worker termination during a nonterminal state;
3. main Host termination around activation;
4. detached runner termination followed by the alarm/recovery kick; and
5. browser restart while durable update state is nonterminal.

Each restart scenario must resume the same transaction ID. It may commit B or
roll back A according to the interruption point, but it must never leave a mixed
product or claim success before terminal verification and finalization.

### Sandbox Fault Scenarios

Run each one-shot boundary listed above. Every ordinary forward fault must end
at `ROLLED_BACK` with exact A product hashes. Run the rollback-failure scenario
and require `RECOVERY_REQUIRED` with active authority, journal, backups, and
matching-installer guidance intact.

## Product Regression Checks

After each complete B installation and each successful A rollback:

- launch the browser against the production frozen Native Host;
- run one non-customer Analyze smoke case;
- read and update one harmless Options preference, then restore it;
- verify Host/Extension versions and capabilities; and
- verify installation integrity.

Source mode is not an acceptable substitute because it intentionally returns
`source_update_disabled`.

## Acceptance Rules

### Committed

- Durable UI state is `complete/committed`.
- Host, Extension, `_internal`, metadata, and effective package version match B.
- Final integrity verification succeeds.
- Finalization evidence is acknowledged and terminal transaction workspace is
  cleaned according to the production contract.

### Rolled Back

- Durable UI state is `complete/rolled-back`.
- Every product hash and effective version matches A.
- No success is displayed for the failed update.
- Final integrity verification succeeds.

### Recovery Required

- Durable state exposes fixed recovery or matching-installer guidance.
- Active authority, journal, applicable backups, and transaction evidence remain
  available.
- No success is displayed and no evidence directory is manually deleted.

### Mixed Legacy Transition

- No Plan D transaction is created.
- No second update starts.
- No transactional success is displayed.
- The matching B installer repairs the product to one consistent B version.

## Publication Gate

Publication is allowed only when:

1. every required scenario has a result and sanitized evidence directory;
2. A and B artifact SHA-256 values match the artifact-builder records;
3. no B scenario used rebuilt or modified bytes;
4. all committed and rolled-back outcomes pass final product verification;
5. mixed and recovery-required outcomes preserved required evidence;
6. the final report contains no URL credentials, PII, or customer data; and
7. the user explicitly approves tag, push, and GitHub prerelease creation.

Eventual publication uploads the already-qualified B ZIP. Rebuilding B after the
gate invalidates qualification and requires rerunning the gate.

## Explicit Non-Goals

- Publishing A.
- Testing GitHub's uptime or Azure Blob availability.
- Adding a configurable production update endpoint.
- Adding production fault-injection environment variables.
- Proving per-write power-loss atomicity, registry hive flush, standalone
  bootstrap, or multi-profile registry quiescence.
- Using real customer cases, credentials, or an existing workstation install.
