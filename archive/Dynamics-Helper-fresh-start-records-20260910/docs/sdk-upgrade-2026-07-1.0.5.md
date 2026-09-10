# Copilot SDK Upgrade: 0.3.0 → 1.0.5

> **Historical migration record, 2026-07-03. Not a current operating guide.**
> This file preserves version-specific compatibility decisions and reported
> results, not executable plans or release authorization. Current contracts are
> in the [SDK 1.0.13 record](sdk-upgrade-1.0.13.md); the version-independent
> procedure is the [SDK upgrade workflow](sdk-upgrade-workflow.md).
> The preceding migration is the [SDK 0.3.0 record](sdk-upgrade-2026-05-0.3.0.md).

## 1. Version decision

The migration selected `github-copilot-sdk==1.0.5`, recorded as the stable PyPI
release dated 2026-07-01. The then-available 1.0.6 previews were not selected.
This is a historical dependency identity, not a recommendation to install it.

## 2. Empirical probe results (SDK 1.0.5, measured 2026-07-03)

The original record reported isolated-environment inspection of DH's API surface:

| Surface | Recorded 1.0.5 observation |
|---|---|
| `SubprocessConfig` | Removed; import failed |
| `RuntimeConnection.for_stdio` | Available; keyword-only `path=None`, `args=()` |
| `PermissionRequestResult` | Non-callable union of 16 concrete variants |
| `PermissionDecisionApproveOnce` | Constructible and exported by `copilot.session` |
| `PermissionRequestResultKind` | Removed; import failed |
| `create_session` / `resume_session` | DH's inspected arguments remained present |
| `PingResponse.from_dict` | Accepted numeric epoch milliseconds and ISO timestamps |
| Protocol version | Recorded as 3, matching 0.3.0 |

These are observations for that version. A matching protocol number does not
establish field-level wire compatibility, and signatures do not prove runtime
behavior. The old pre-tool hook literal remained available, but type acceptance
did not establish safe managed-approval behavior; it is not a current recommendation.

<a id="3-breaking-changes--exact-diffs"></a>
## 3. Breaking changes

<a id="-b1-subprocessconfig-removed--runtimeconnectionfor_stdio"></a>
### B1: `SubprocessConfig` removed → `RuntimeConnection.for_stdio()`

The migration replaced `SubprocessConfig(cli_path=...)` and positional client
configuration with `RuntimeConnection.for_stdio(path=...)` passed as
`CopilotClient(connection=...)`. The recorded implementation changed three
construction sites. No compatibility alias was introduced.

<a id="-b2-permissionrequestresult-is-now-a-union-annotation-only"></a>
### B2: `PermissionRequestResult` is now a Union (annotation-only)

Section 3 B2 records the constructor break: the 0.3.0 expression
`PermissionRequestResult(kind="approve-once")` raised `TypeError` on 1.0.5.
`PermissionRequestResult` remained a return annotation; the ordinary approval
result became `PermissionDecisionApproveOnce()`, imported from `copilot.session`.
The internal RPC response with a similar name was not the handler result type.

This historical type migration is not a complete current permission handler.
Current managed-approval handling and the prohibition on unconditional pre-tool
approval are documented in the [SDK 1.0.13 record](sdk-upgrade-1.0.13.md#product-adapter)
and [project rules](../AGENTS.md).

<a id="4-improvements-to-adopt-not-workarounds-to-preserve"></a>
## 4. Historical behavior decisions

<a id="41-delete-the-pingresponse-iso-timestamp-shim"></a>
### 4.1 PingResponse ISO-timestamp shim removal

CLI 1.0.46+ emitted ISO-8601 timestamps that SDK 0.3.0 passed to `int()`, failing
`client.start()`. DH added a shim in commit `b4bb6ab` on 2026-05-20.
SDK 1.0.5 parsed numeric timestamps as epoch milliseconds and strings through its
datetime parser. The recorded live start with SDK 1.0.5 and CLI 1.0.69-1 succeeded
without the shim. The shim was removed with the migration in commit `061da3f`.
That result supports removal for the tested pair, not compatibility with every CLI.

<a id="42-ride-the-new-infinite_sessions-default-do-not-disable"></a>
### 4.2 `infinite_sessions` default and observability

DH did not pass an `infinite_sessions` override. The migration retained the
documented 1.x enabled default for background compaction and session-state
persistence, and added `_log_session_observability()` at three session-established
paths. This explains the source reference to this section.

The record did not demonstrate compaction under a long analysis, reduced timeout
rates, or privacy behavior across resumed sessions. Compaction does not extend
DH's configured Analyze timeout. The original rationale mentioned the historical
`dhco-<case>` session prefix; it is not the current UUIDv5 identity contract.

### 4.3 Everything else stays minimal

The migration was limited to compatibility and observability. Other newly
available session options were not adopted as part of this work.

## 5. Test updates (`host/test_sdk_compat.py`)

The recorded tests moved from the 0.3.0 kind-literal constructor contract to
1.0.5 union membership and concrete decision construction, and checked the new
connection import. DH-owned MCP normalization coverage remained relevant.
Historical hook-literal checks were type checks, not proof of permission safety.
Reported execution and its limits are retained in section 7; these are not current
test commands. Use the [test-safety entry](test-safety.md) through the workflow.

## 6. requirements.txt + PyInstaller

### 6.1 requirements.txt

The source pin changed from `==0.3.0` to `==1.0.5`; the migration regenerated the
httpx-stack pins and removed the unused requests stack. The recorded environment
included pydantic 2.12.5, httpx 0.28 and anyio 4.14.

### 6.2 PyInstaller / Defender

No completed 1.0.5 frozen-build, Defender or beta qualification result was recorded
here. The live probe used an explicit installed CLI path; it did not prove frozen
CLI discovery. The older [0.3.0 build observations](sdk-upgrade-2026-05-0.3.0.md#81-step-1--pyinstaller---onedir-build)
are historical evidence, not a reusable build or security procedure.

<a id="7-phased-plan"></a>
## 7. Recorded verification

| Historical phase | Recorded outcome and boundary |
|---|---|
| Offline inspection, 2026-07-03 | Import/type/signature findings in section 2; not a model turn |
| Live verification, 2026-07-03 | SDK 1.0.5 / CLI 1.0.69-1 client start and ping succeeded without the shim; not a complete Analyze or frozen-install check |
| Source migration, `061da3f` | Connection and result-type changes, shim removal, observability and dependency updates recorded together |
| Host tests | Original report: 77/77 passed; reintroducing the removed import produced 15 errors, then restoration returned 77 passing |
| Module load | Original report: exit 0 after the development environment upgrade |
| Frozen build / release | No completed qualification evidence in this record |

These are retained reports, not rerun results or current test-safety approval.
Historical phase checklists have been retired rather than carried forward as work.

<a id="8-future-opportunities-unlocked-out-of-scope--catalogue-only"></a>
## 8. Scope exclusions

MCP authentication callbacks, post-tool-failure hooks, session spending limits and
citations were noted but not implemented by this migration. They are not a backlog
or current feature commitment.

## 9. Rollback

The migration and shim removal were recorded in the same commit. The old text's
conflicting suggestion to keep the shim deletion separate is not retained as an
instruction. Source, dependency and frozen artifact identities must be considered
together: reverting a dependency alone would not establish compatibility with an
auto-updated CLI. This record does not prescribe a current downgrade.

## References

- [Official SDK v1.0.5 release](https://github.com/github/copilot-sdk/releases/tag/v1.0.5)
- [Versioned Python reference](https://github.com/github/copilot-sdk/blob/v1.0.5/python/README.md)
- [Versioned Python client source](https://github.com/github/copilot-sdk/blob/v1.0.5/python/copilot/client.py)
- [Current SDK record](sdk-upgrade-1.0.13.md)
- [Version-independent upgrade workflow](sdk-upgrade-workflow.md)
