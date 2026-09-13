# Prompt Source Isolation

## 1. Purpose

Define deterministic instruction selection, exact source snapshots, safe errors,
and Analyze-time user content. This is a current product contract, not an
implementation, test-execution, or live-probe plan.

## 2. Boundaries

DH explicitly selects its instruction sources instead of inheriting CLI discovery.
Repository ONLY also governs existing Skills/MCP selection; it does not mean the
entire SDK system message consists solely of repository text. SDK built-in system
content, tools, and DH Session Info are separate from editable instructions.

## 3. Terminology and Ownership

| Source | Location | Role and ownership |
|---|---|---|
| DH Core System Prompt | Installed `system_prompt.md`; development `host/system_prompt.md` | Product-managed support-task scope, safety, evidence and output contract; no assumed tool set or repository workflow |
| DH-specific Instructions | `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` | User-managed system source |
| Repository Instructions | `<Root>/AGENTS.md` first; only if absent, `<Root>/.github/copilot-instructions.md` | One workspace-managed system source, never both entries |
| Custom User Prompt | `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` | User-managed Analyze user content |

Internal keys remain `userInstructions` / `user_instructions` and
`useWorkspaceOnly` / `use_workspace_only`. User content is not automatically
partitioned or moved between files. Core is replaced by product update; editable
AppData files are preserved.

## 4. Instruction Source Selection

Every SDK create/resume path, including fallback/retry, sets
`skip_custom_instructions=True`. CLI-global instructions, `AGENTS.md`, ancestor
and path-specific instructions must not enter DH sessions through discovery.
DH explicitly injects the one selected Root entry from section 3. It does not
search parents or nested directories; disabling discovery does not prohibit
explicit selection of `<Root>/AGENTS.md`.

`effective_repository_only = bool(effective_root) and use_workspace_only`.
Ordinary missing/empty Analyze `rootPath` falls back to canonical Host config;
it does not clear that config. An explicit context-menu override is per request,
including empty when `rootPathOverrideProvided` is true. Relative or unusable
selected Roots fail validation rather than silently changing source mode.

| Effective Root | Repository ONLY | DH-assembled system content |
|---|---|---|
| Empty | Either value | Core + DH-specific Instructions + Session Info |
| Non-empty | false | Core + DH-specific Instructions + Session Info |
| Non-empty | true | Core + Repository Instructions + Session Info |

Exactly one editable source is selected, never DH-specific plus Repository or
both repository entries. In effective Repository ONLY mode, prefer
`<Root>/AGENTS.md`; only its absence permits the legacy
`<Root>/.github/copilot-instructions.md`. An existing empty `AGENTS.md` is valid
and never triggers fallback. Both entries absent reports
`repository_instructions_missing`. An unreadable/invalid-UTF-8 entry, directory,
or broken link reports `repository_instructions_unreadable` and blocks Analyze
without fallback. The same read/decode rules apply to the selected legacy entry.
A missing DH-specific file means empty content; an existing unreadable/invalid-UTF-8
selected file fails. Missing/unreadable Core always blocks Analyze. Empty Root
or mode off retains DH-specific selection. Skills/MCP paths and selection rules,
DH Core's role, and Custom User Prompt handling remain unchanged.

## 5. Prompt Snapshot and Assembly

### 5.1 Immutable snapshot

Resolve Core and the selected source once as exact bytes, strictly decode UTF-8,
and retain both bytes/text in one immutable snapshot. Do not normalize BOMs,
newlines, or whitespace or reopen sources during the refresh attempt. The same
snapshot supplies system text and fingerprint, preventing mixed-read identity.

System assembly order is Core, the one selected editable source, then deterministic
Session Info. It uses SDK append mode. Custom User Prompt never enters this system
snapshot. Missing/unreadable sources are classified separately; soft Options
health is not a substitute for strict Analyze/session resolution.

### 5.2 User content and redaction

For every Analyze, the Host rereads canonical `user_prompt.md`, removes payload
content from the first authoritative line-level `## User Prompt` marker, and
appends current non-whitespace content exactly once. Empty/missing content removes
stale sections; unreadable/invalid UTF-8 fails with `user_prompt_unreadable`.
FAB's corresponding composition is an editor preview, not the authoritative read.

Canonicalized Analyze text and context pass through `PiiScrubber` before sending.
The exact system-instruction snapshot follows its separate byte-preservation
contract; this does not promise redaction of system sources or model output.
Session-refresh config does not read/migrate/hydrate Custom User Prompt.
`get_config` with `include_prompt_status=True` and Analyze each own their separate
canonical read.

### 5.3 Diagnostics

Never log instruction/user-prompt contents or prompt-source paths. Safe source
mode, classified error code, and a short fingerprint prefix suffice. SDK event
diagnostics and no-content reports contain only event type, data type, content
presence, and length, never raw event/data/object representations.

## 6. Session Lifecycle and Prompt Fingerprint

SHA-256 input consists, in order, of `dh-prompt-fingerprint-v1`, UTF-8 source
mode, exact Core bytes, and exact selected bytes. Each component is prefixed by
its eight-byte big-endian length. The stored fingerprint is `v1:<hex-digest>`.
Root identity is an independent refresh condition. The selected filename is not
a fingerprint input. Switching between repository entries with identical bytes
does not itself require a refresh when mode, Core, case, Root, and session/client
availability remain unchanged.

Same case, applied Root, available session/client, and fingerprint permit reuse.
Changed mode/selected bytes/Core bytes refresh the same deterministic UUIDv5
case session before sending a turn. The candidate fingerprint becomes active
only after SDK success; every active-session invalidation clears it. Existing
conversation history is not deleted by refresh.

Create/resume receive equivalent snapshot-derived instructions, explicit Root,
permission handler, and applicable Skills/MCP/model settings. Ordinary resume
failure can fall back to create with the same ID. `SessionOptionsPatchError` is
terminal: no fallback/transport retry or model turn, stale session/client and
fingerprint are invalidated, and cleanup remains bounded and truthfully reported.

Options changes to effective Root/mode/selected instructions refresh an active
case. Custom User Prompt or inactive instruction changes alone do not require
prompt refresh. External selected-source edits are detected on the next Analyze.
With no active case, initialization does not invent a generic session.

## 7. Options Behavior and Persistence

An empty Root disables Repository ONLY without rewriting its stored value.
Effective Repository-only disables but preserves the DH-specific editor; Custom
User Prompt stays enabled. Labels, help, and known source errors support English
and Chinese. A non-empty Root with Repository ONLY requires a valid selected
repository entry under the priority/absence-only fallback rule, not merely a
valid workspace directory.

Editable writes are sparse: absent means no write, explicit empty truncates,
and present null/non-string fails before persistent writes. Options captures
immutable revision/value tokens for edit/clear/Reset; only the matching durable
acknowledgment advances the saved revision. Unrelated preference updates omit
`user_instructions` and top-level `user_prompt`.

Preference mirror, hydration catch-up, and carried actions use one single-flight,
coalescing queue. Host send/actions occur only after the latest mirror commits;
failure retains visible retry ownership. Reset cleanup has its own token/phase
after Host acknowledgment and cannot resend saved defaults or clear newer edits.
See [preference durability](configuration-storage-contract.md#hydration-catch-up),
[Reset ownership](configuration-storage-contract.md#reset-transaction), and
[Source Errors and Config Health](../../DEVELOPER_GUIDE.md#source-errors-and-config-health).

## 8. Error Contract

| Code | Condition | Handling |
|---|---|---|
| `dh_core_prompt_missing` | Core absent | Block Analyze; repair installation |
| `dh_core_prompt_unreadable` | Core read/decode failure | Block Analyze; repair file/permissions |
| `dh_specific_instructions_unreadable` | Selected DH-specific read/decode failure | Block Analyze; omit unreadable editor value in health |
| `repository_instructions_missing` | Both Root `AGENTS.md` and legacy `.github/copilot-instructions.md` absent | Block Analyze; add entry or disable Repository ONLY |
| `repository_instructions_unreadable` | Repository entry read/decode failure, directory, or broken link | Block Analyze without fallback; repair entry or disable mode |
| `user_prompt_unreadable` | User prompt read/decode failure | Block Analyze; omit unreadable health value; explicit edit/clear repairs |

Analyze inner errors carry `{status:'error', error_code, error}` with a safe
string fallback. SW persistence preserves the optional code as `LastAnalysis.errorCode`.
Known codes localize on immediate/hydrated rendering; unknown codes retain safe
fallbacks. Source/config failures never direct users to re-authenticate.

`get_config` remains usable: return normal config plus `prompt_source_status`
(`{status:'ok'}` or safe error status), not strict session assembly. Omit unreadable
editable content rather than substituting empty; Options retains its Chrome
mirror. Legacy hydration applies only when health metadata is absent.

Saved config and refreshed session are separate outcomes. A response with
`success:false, config_saved:true` acknowledges saved values but reports refresh
failure. Explicit `config_saved:false` or malformed presence is not acknowledgment.
Only the latest acknowledged Options update schedules one generation-gated,
health-only `get_config`; it changes only `promptHealthIssue`, never rehydrates
preferences, writes config, or starts an update/health loop.

## 9. Testable Invariants

### 9.1 Host prompt selection

| ID | Invariant |
|---|---|
| **PS-I1** | Every SDK create/resume path disables custom-instruction discovery. |
| **PS-I2** | Empty effective Root makes Repository ONLY ineffective. |
| **PS-I3** | DH-specific mode selects Core + DH-specific, not Root/global instructions. |
| **PS-I4** | Repository-only mode selects Core + Root `AGENTS.md`, or legacy `.github/copilot-instructions.md` only if `AGENTS.md` is absent; no DH-specific/global or parent/nested instructions. |
| **PS-I5** | DH-specific and Repository sources never coexist; both repository entries are never injected together. |
| **PS-I6** | Missing/unreadable Core blocks Analyze before a model turn. |
| **PS-I7** | Both Root entries absent reports missing; unreadable/invalid-UTF-8 entries, directories, and broken links fail closed without fallback. |
| **PS-I8** | Existing empty Root instructions are valid; empty `AGENTS.md` does not trigger legacy fallback. |
| **PS-I9** | Host reads canonical User Prompt every Analyze, replaces stale sections, sends it once in scrubbed user content, and fails closed on read/decode errors. |
| **PS-I10** | Explicit empty `user_instructions` truncates and round-trips empty. |
| **PS-I11** | Unreadable selected DH-specific content blocks rather than becoming empty. |
| **PS-I12** | One exact byte snapshot supplies assembly and fingerprint. |
| **PS-I13** | Refresh config does not read User Prompt; health and Analyze own separate reads. |
| **PS-I14** | Present null/non-string prompt fields fail before writes; omission writes nothing. |

### 9.2 Session lifecycle

| ID | Invariant |
|---|---|
| **PF-I1** | Fingerprint covers mode and exact Core/selected bytes, not filename; identical repository-entry bytes alone do not require refresh. |
| **PF-I2** | Unchanged fingerprint and same case/applied Root permit session reuse. |
| **PF-I3** | Changed fingerprint refreshes the same UUIDv5 case session before Analyze. |
| **PF-I4** | Only successful refresh commits a candidate; failure clears prior fingerprint. |
| **PF-I5** | Resolution/refresh failure sends no turn and prevents stale reuse. |
| **PF-I6** | Create/resume receive equivalent prompt-selection kwargs. |

### 9.3 Extension behavior

| ID | Invariant |
|---|---|
| **UI-I1** | Empty Root disables the checkbox without rewriting preference. |
| **UI-I2** | Non-empty Root restores the persisted selection. |
| **UI-I3** | Repository-only disables but preserves DH-specific editor content. |
| **UI-I4** | User Prompt remains enabled. |
| **UI-I5** | Labels/help/known errors are localized in English and Chinese, including `AGENTS.md` priority, absence-only legacy fallback, never-both selection, and both-absent missing guidance. |
| **UI-I6** | Error code survives SW persistence and immediate/rehydrated display. |
| **UI-I7** | Failed post-save refresh is visible without reverting saved config. |
| **UI-I8** | Unreadable User Prompt health preserves the mirror; unrelated writes do not repair it, explicit revision-safe edit/clear does. |
| **UI-I9** | Compatible carried actions run once after durable commit; identity changes cancel incompatible team actions. |
| **UI-I10** | Async team cache reads apply only for current enabled/URL/team generation. |
| **UI-I11** | FAB spinner/timer ownership is scoped to local or hydrated request identity. |
| **UI-I12** | Single-flight mirror failure runs no Host/action callback and retains intent. |
| **UI-I13** | Reset cleanup/success requires matching committed token/identity/generation and preserves newer edits. |
| **UI-I14** | FAB rechecks ownership after every response-processing await, including hashing, before UI/outcome telemetry. |

## 10. References and Scope

- [Host snapshot, fingerprint, and canonicalization](../../host/dh_native_host.py)
- [SDK first-options-update and permission boundary](../../host/sdk_client.py)
- [Session UUID contract](deterministic-session-identity.md)
- [Analysis persistence section 5](analysis-result-persistence.md#5-invariants)
- [Verification entry rules](../test-safety.md)

This contract does not implement workspace detection, MyCases coordination,
Stage 0/1 integration, automatic instruction migration, or additional discovery
paths. Source/fixture descriptions are not claims of live SDK verification.
