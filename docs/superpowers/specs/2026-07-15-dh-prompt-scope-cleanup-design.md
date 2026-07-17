# Dynamics Helper Prompt Scope Cleanup Design

**Status:** Accepted
**Date:** 2026-07-15
**Baseline:** `v2.0.74-beta.4` / handoff commit `0040b1d`

## 1. Purpose

Make every instruction source used by a Dynamics Helper (DH) analysis explicit,
deterministic, and user-visible. The current Host combines DH-managed content
with Copilot CLI automatic custom-instruction discovery. When a Root Path has
`.github/copilot-instructions.md`, that file is loaded once by the CLI and once
again by DH, while CLI-global instructions can also enter the session without
being represented in Options.

This design replaces that mixed model with DH-owned source selection. It is a
common prompt foundation for current standalone use and future MyCases
integration; it does not implement integration modes or MyCases orchestration.

## 2. Current State and Problems

The effective analysis input currently has four relevant layers:

1. Installed `system_prompt.md`, appended as SDK system content.
2. `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`, exposed in Options
   as **Custom User Instructions** but also appended as SDK system content.
3. `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`, included in every Analyze
   request as user content.
4. `<Root>\.github\copilot-instructions.md`, both manually appended by DH and
   automatically discovered by the Copilot CLI.

The CLI can additionally discover `~/.copilot/copilot-instructions.md`,
`AGENTS.md`, path-specific instructions, and other supported repository files.
Those implicit sources are not represented by the current Options model.

This causes the following defects:

- Root `.github/copilot-instructions.md` is structurally injected twice.
- The Repository ONLY preference selects Skills and MCP sources but does not
  select instruction sources.
- CLI-global and other automatically discovered instructions can silently
  change a DH analysis.
- An explicit empty **Custom User Instructions** value does not clear the Host
  file because Host update logic treats an empty string as an absent value.
- User-facing names do not accurately distinguish system-role DH instructions
  from the per-analysis user-role prompt.
- Documentation overstates what Repository ONLY currently isolates.

## 3. Terminology and Ownership

| Product term | Physical source | Model role | Owner and lifecycle |
|---|---|---|---|
| **DH Core System Prompt** | Installed `system_prompt.md` beside the Host executable in production; repository `host/system_prompt.md` in development | System | DH product-managed, not user-editable, overwritten by install/update |
| **DH-specific Instructions** | `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` | System | User-managed through Options, applies to DH sessions when Repository ONLY is not effective |
| **Repository Instructions** | `<Root>\.github\copilot-instructions.md` | System | Workspace-managed, applies only when Repository ONLY is effective |
| **Custom User Prompt** | `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` | User | User-managed through Options, included in every Analyze request |

The existing internal names and paths remain unchanged:

- TypeScript preference: `userInstructions`
- Native message field: `user_instructions`
- Host file: `copilot-instructions.md`
- Repository preference: `useWorkspaceOnly` / `use_workspace_only`

Only the user-facing **Custom User Instructions** name changes to
**DH-specific Instructions**. Retaining internal names avoids a Chrome storage,
AppData, and IPC migration for a semantic clarification.

## 4. Instruction Source Selection

### 4.1 Disable implicit discovery

Every DH SDK `create_session` and `resume_session` call must set
`skip_custom_instructions=True`. This disables Copilot CLI automatic loading of:

- `~/.copilot/copilot-instructions.md`;
- Root or ancestor `AGENTS.md` and related agent instruction files;
- `.github/instructions/**/*.instructions.md`;
- automatically discovered `.github/copilot-instructions.md`.

DH then explicitly injects exactly one user/workspace system-instruction source.
This is intentionally narrower than reproducing every CLI discovery rule. DH
supports only `<Root>\.github\copilot-instructions.md` as Repository
Instructions in this design.

`skip_custom_instructions` does not remove SDK built-in system content, DH Core,
Session Info, tool definitions, MCP-provided content, or hooks. Repository ONLY
selects configurable Skills, MCP, and instruction *sources*; it does not mean
that the complete SDK system message contains repository text and nothing else.

### 4.2 Effective Root and Repository ONLY value

The persisted `use_workspace_only` value is retained. The Host derives:

```text
effective_repository_only = bool(effective_root) and use_workspace_only
```

`effective_root` is the normalized absolute Root used for the current Analyze:
a non-empty Analyze-time override wins; otherwise the Host's canonical config
Root is used. A missing or empty Analyze payload value does not clear the
canonical Root. A relative Root remains invalid under the existing Root Path
contract.

An absolute but missing or otherwise unusable Root remains the selected Root and
fails through the existing Root/client validation path. It must not silently
downgrade to DH-specific mode. Root Path being non-empty does not by itself
select Repository Instructions. The preference remains a general Root Path
feature and is not tied to a valid MyCases workspace.

### 4.3 Normative source matrix

| Root Path | Persisted Repository ONLY | Effective mode | SDK system content assembled by DH | Analyze user content |
|---|---:|---|---|---|
| Empty | false or true | DH-specific | DH Core + DH-specific Instructions + Session Info | Case payload + Custom User Prompt |
| Non-empty | false | DH-specific | DH Core + DH-specific Instructions + Session Info | Case payload + Custom User Prompt |
| Non-empty | true | Repository-only | DH Core + Root `.github/copilot-instructions.md` + Session Info | Case payload + Custom User Prompt |

DH-specific and Repository Instructions are mutually exclusive. CLI-global
instructions never enter a DH analysis in either mode.

### 4.4 Empty and unavailable files

- DH-specific Instructions may be missing, empty, or whitespace-only. This is a
  valid Core-only DH-specific configuration.
- An existing DH-specific Instructions file that cannot be read or decoded is a
  configuration error when DH-specific mode is effective. It must not be treated
  as empty.
- Repository Instructions may be empty or whitespace-only. If the file exists
  and is readable, this is a valid Core-only Repository-only configuration.
- When Repository-only is effective, a missing or unreadable Repository
  Instructions file is a configuration error. DH must not fall back to
  DH-specific or CLI-global instructions.
- `system_prompt.md` must exist and be readable. A missing or unreadable Core
  file is treated as a damaged DH installation and blocks Analyze.

The content of `system_prompt.md` and its installer/updater ownership do not
change in this workstream.

## 5. Prompt Snapshot and Assembly

### 5.1 Immutable snapshot

Each resolution attempt produces one immutable prompt snapshot. Core and the
selected instruction file are each read exactly once as bytes, decoded with
strict UTF-8, and retained together with source mode and effective Root. The
same decoded strings are used for system-message assembly; files are not opened
again during that refresh attempt.

No BOM, newline, or whitespace normalization is performed. A missing file is
classified separately from an OS read failure or invalid UTF-8. This prevents a
concurrent file edit from pairing a fingerprint from one read with prompt text
from another.

`get_config` may inspect prompt-source health for Options, but it does not create
the immutable session snapshot. Session creation/refresh and each Analyze-time
fingerprint check perform their own strict resolution.

### 5.2 Assembly order

The Host assembles system content in this order:

1. DH Core System Prompt.
2. The one selected optional source: DH-specific or Repository Instructions.
3. Existing deterministic Session Info, including the UUIDv5 session name.

Empty selected content contributes no separator or placeholder. The resulting
content continues to use SDK `system_message` append mode. Custom User Prompt is
never moved into this system content; it remains in the PII-scrubbed Analyze user
message on every click.

Instruction contents, Custom User Prompt contents, and prompt-source file paths
must not be emitted to telemetry or normal logs. Safe source-mode, file basename,
fingerprint prefix, and classified-error metadata may be logged. This restriction
does not expand this workstream into changing existing non-prompt Root, Skills,
MCP, or report-path observability.

## 6. Session Lifecycle and Prompt Fingerprint

### 6.1 Why a fingerprint is required

DH reuses the active in-memory SDK session for repeated analysis of the same
case and Root Path. Consequently, merely reading instruction files during
session creation would leave an active case on stale instructions after an
external workspace update.

Before every Analyze, the Host resolves the effective source and computes a
versioned SHA-256 fingerprint over unambiguous, length-delimited byte components
from that one immutable snapshot:

- the source mode (`dh-specific` or `repository-only`);
- the exact DH Core UTF-8 bytes;
- the exact selected instruction UTF-8 bytes.

Root identity remains a separate existing session-refresh condition. The
fingerprint format is internal, but its version and length framing must make
component boundaries unambiguous.

### 6.2 Reuse and refresh rules

The Host tracks the fingerprint actually applied to the active session.

- Same case, same Root Path, same source mode, and same fingerprint: reuse the
  active session and send the new Analyze user message.
- Case, Root Path, source mode, or fingerprint changed: refresh/resume the
  deterministic case session before sending the Analyze user message.
- Instruction changes preserve the case's UUIDv5 session identity and history.
  The new system configuration governs subsequent turns; this design does not
  delete prior conversation history.
- A candidate fingerprint is committed as the active fingerprint only after
  session refresh succeeds. A failed resolution/refresh clears the prior active
  fingerprint together with the stale in-memory session; clearing is
  invalidation, not committing the failed candidate.

These reuse rules govern the Analyze-time prompt check. An Options update that
changes the effective Root, Repository ONLY mode, or active instruction source
must also refresh an active case immediately. Changing Custom User Prompt or an
inactive instruction source does not itself require a prompt refresh. Existing
refresh behavior for other session settings (Skills, MCP, model, and performance)
remains governed by those settings' contracts; unrelated Options behavior is not
refactored by this spec. External edits to the selected instruction file or the
installed Core are detected by the next Analyze fingerprint check.

### 6.3 Refresh failure

If source resolution or refresh fails:

- no Analyze user message is sent;
- the prior in-memory session reference and applied fingerprint are cleared so
  it cannot be reused; persisted CLI history is not deleted;
- DH does not fall back to an unselected instruction source;
- fixing the file permits a later Analyze attempt to resolve and refresh again;
- persisted Options values remain saved.

Both SDK create and resume paths receive the same `system_message`,
`skip_custom_instructions=True`, Root Path, Skills, MCP, hooks, permission
handler, and applicable model/performance settings.

A prompt-change refresh first asks the SDK to resume the same UUIDv5 session
with the new snapshot-derived kwargs. If resume cannot apply the configuration,
the existing create fallback may try the same deterministic ID. If neither path
succeeds, DH fails closed and never sends the turn through the old session. The
mandatory mocked contract tests verify the supplied kwargs and stale-session
invalidation; the authenticated smoke in section 10 checks semantic application
when that environment is available.

## 7. Options Behavior and Migration

### 7.1 User interface

The existing checkbox becomes:

> **Use repository SKILLS, MCP, and instructions ONLY**

Its help text must state that Repository Instructions means exactly
`<Root>\.github\copilot-instructions.md`, and that DH Core and Custom User
Prompt remain active.

- With an empty Root Path, the checkbox is disabled. Its persisted value is not
  rewritten, and Host behavior is effectively DH-specific.
- With a non-empty Root Path, the persisted value takes effect immediately.
- While Repository-only is effective, the DH-specific Instructions editor is
  visible but disabled. Its content is retained, with explanatory text that it
  is not participating in the current analysis.
- Custom User Prompt remains enabled in every state.

All new or changed user-facing text must be present in English and Chinese.

### 7.2 Existing data

No instruction content is moved, partitioned, or rewritten automatically.
Existing `copilot-instructions.md` and `user_prompt.md` files remain in place.
Guidance explains that:

- DH-only preferences belong in DH-specific Instructions;
- CLI-wide preferences belong in `~/.copilot/copilot-instructions.md`, but are
  intentionally not consumed by DH;
- repository workflow belongs in the Root instruction file.

Existing persisted `use_workspace_only=true` values immediately gain the new
instruction-selection meaning when Root Path is non-empty. This deliberate
behavior change must be called out in release notes. A configured Root that
lacks `.github/copilot-instructions.md` will block Analyze until the user adds
the file or disables Repository ONLY.

### 7.3 Explicit clearing

Host update logic must distinguish a missing `user_instructions` field from an
explicit empty string. An explicit empty value truncates
`%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`, survives a get-config
round trip as empty, and refreshes or invalidates the active session according
to the rules above. A legacy alias may be consulted only when the primary field
is absent, never when it is present and empty.

## 8. Error Contract

Prompt-source failures use a stable machine-readable `error_code` plus a safe,
human-readable fallback message:

| Error code | Condition | User action |
|---|---|---|
| `dh_core_prompt_missing` | Installed Core file does not exist | Repair/reinstall DH |
| `dh_core_prompt_unreadable` | Installed Core cannot be decoded or read | Repair file permissions/install |
| `dh_specific_instructions_unreadable` | Effective DH-specific file exists but cannot be decoded or read | Repair or replace the file in Options |
| `repository_instructions_missing` | Repository-only effective and Root instruction file does not exist | Add the file or disable Repository ONLY |
| `repository_instructions_unreadable` | Repository-only effective and Root instruction file cannot be decoded or read | Repair the file or disable Repository ONLY |

Known codes are rendered by the Extension as localized, actionable errors.
Unknown codes retain the Host fallback text. These are configuration/install
errors, not authentication errors; their messages must not tell the user to
re-authenticate.

At the Host handler boundary, an Analyze prompt-source failure has this exact
inner result shape; the existing Native Messaging wrapper remains unchanged:

```json
{
  "status": "error",
  "error_code": "repository_instructions_missing",
  "error": "Safe English fallback text"
}
```

The Service Worker must preserve `error_code`. Analyze result persistence adds
the optional code to the stored error record so immediate and rehydrated results
use the same localization helper. The Extension maps known codes to localized
English/Chinese text at display time and uses `error` only as the unknown-code
fallback.

Options must remain usable when a prompt source is unavailable. `get_config`
must not invoke strict session assembly or fail its outer response solely for a
prompt-source problem. It returns normal configuration plus:

```json
{
  "prompt_source_status": {
    "status": "error",
    "error_code": "dh_core_prompt_missing",
    "error": "Safe English fallback text"
  }
}
```

Healthy status is `{ "prompt_source_status": { "status": "ok" } }`. If
DH-specific content itself cannot be read, `get_config` must not represent that
content as an empty string; Options retains its existing Chrome-mirrored value,
shows the warning, and lets an explicit edit replace the unreadable file.

Saving config is allowed, but an attempted active-session refresh still fails
closed. When persistent writes succeeded but refresh failed, `update_config`
returns:

```json
{
  "success": false,
  "config_saved": true,
  "error_code": "repository_instructions_missing",
  "error": "Safe English fallback text"
}
```

`config_saved` is false when the requested persistent writes did not complete.
Options must inspect this result instead of treating the RPC as fire-and-forget,
and show the localized warning without rolling back saved values. A failed
refresh after config persistence clears the prior in-memory session/fingerprint,
so a later Analyze cannot silently run under the old source.

## 9. Testable Invariants

### 9.1 Host prompt selection

| ID | Invariant |
|---|---|
| **PS-I1** | Every SDK create and resume call sets `skip_custom_instructions=True`. |
| **PS-I2** | Empty Root Path makes Repository ONLY ineffective, regardless of its persisted value. |
| **PS-I3** | Effective DH-specific mode injects Core + DH-specific and does not read or inject Root/CLI-global instructions. |
| **PS-I4** | Effective Repository-only mode injects Core + Root instructions and does not inject DH-specific/CLI-global instructions. |
| **PS-I5** | DH-specific and Repository Instructions never coexist in one assembled DH system message. |
| **PS-I6** | Missing or unreadable Core blocks Analyze before a model message is sent. |
| **PS-I7** | Missing or unreadable selected Root instructions blocks Analyze without fallback. |
| **PS-I8** | An existing empty Root instruction file is valid and yields Core + Session Info. |
| **PS-I9** | `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` is reread and canonicalized by the Host on every Analyze, exactly once in PII-scrubbed user-role content and never in system content; stale payload sections are replaced/removed and unreadable content fails closed. |
| **PS-I10** | Explicit empty `user_instructions` truncates the file and round-trips as empty. |
| **PS-I11** | An unreadable selected DH-specific file blocks Analyze and is never represented as empty. |
| **PS-I12** | One immutable byte snapshot supplies both assembled text and its fingerprint. |

### 9.2 Session lifecycle

| ID | Invariant |
|---|---|
| **PF-I1** | The fingerprint covers source mode, exact Core content, and exact selected content. |
| **PF-I2** | An unchanged fingerprint for the same case/Root reuses the active session. |
| **PF-I3** | A changed fingerprint refreshes the same UUIDv5 case session before Analyze. |
| **PF-I4** | A candidate fingerprint is committed only after successful refresh; failure clears the prior fingerprint without committing the candidate. |
| **PF-I5** | Resolution/refresh failure sends no Analyze turn and prevents stale-session reuse. |
| **PF-I6** | Create and resume receive equivalent prompt-selection kwargs. |

### 9.3 Extension behavior

| ID | Invariant |
|---|---|
| **UI-I1** | Root empty disables the Repository ONLY checkbox without rewriting its persisted value. |
| **UI-I2** | Root non-empty restores and immediately applies the persisted checkbox value. |
| **UI-I3** | Effective Repository-only disables but preserves the DH-specific editor content. |
| **UI-I4** | Custom User Prompt remains enabled in every state. |
| **UI-I5** | Labels, descriptions, and known prompt-source errors are localized in English and Chinese. |
| **UI-I6** | Prompt `error_code` survives Host, Service Worker persistence, immediate display, and rehydrated display. |
| **UI-I7** | Options surfaces a failed post-save refresh and preserves the successfully saved values. |

New invariant tests must follow the repository's break-and-fail discipline: each
test is temporarily proven to fail when its corresponding behavior is broken,
then the temporary break is reverted.

## 10. Verification

Required automated verification for implementation:

```powershell
& "host\venv\Scripts\python.exe" -m unittest discover host
npm run test:run --prefix extension
npm run build --prefix extension
git diff --check
```

Add focused Host tests for source selection, file errors, clear semantics,
fingerprints, stale-session invalidation, and create/resume parity. Add focused
Options tests for the state matrix and persistence behavior.

When an authenticated SDK environment is available, run a non-CI smoke with
distinct markers to demonstrate that the selected source affects the session
and the unselected/global sources do not. This smoke is recommended evidence,
not a routine CI or completion gate, because it requires external authentication
and a model call.

## 11. Documentation Changes

Implementation must update:

- `USER_GUIDE.md`: the normative source matrix and migration behavior;
- `DEVELOPER_GUIDE.md`: explicit discovery disablement, assembly order,
  fingerprint lifecycle, and error handling;
- `AGENTS.md`: rules forbidding re-enabling implicit CLI custom instructions or
  injecting both editable system sources;
- Options English/Chinese labels and help text;
- release notes for the expanded meaning of existing Repository ONLY values and
  exclusion of CLI-global instructions from DH sessions.

## 12. Out of Scope

- `Auto`, `Standalone`, or `MyCases-integrated` mode preferences.
- MyCases workspace health detection, Stage 0 coordinator invocation, Stage 1
  analysis proposals, or deterministic persistence.
- Stage 0/1 fixture builders and response parsers.
- Automatic discovery of `AGENTS.md`, path-specific instructions, or any
  repository instruction file other than Root `.github/copilot-instructions.md`.
- Rewriting the contents of DH Core System Prompt.
- Automatically classifying or moving existing user instruction prose.
- Changing UUIDv5 session identity, Root-bound client/session working directory,
  Custom User Prompt semantics, or current Skills/MCP selection behavior beyond
  extending the same Repository ONLY preference to instructions.

## 13. Rollback

The change requires no persisted-data migration. Reverting the implementation
restores the previous prompt selection behavior while leaving the existing
AppData files and preference keys valid. Because the previous behavior includes
implicit CLI discovery and duplicate Root instruction injection, rollback is an
emergency compatibility action rather than a supported alternate mode.
