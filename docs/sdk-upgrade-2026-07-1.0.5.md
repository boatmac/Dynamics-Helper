# Copilot SDK Upgrade: 0.3.0 → 1.0.5

> Author date: 2026-07-03. Companion to `docs/sdk-upgrade-2026-05-0.3.0.md`
> (the prior 0.2.0→0.3.0 migration). Same phased methodology.
>
> **Guiding principle (per maintainer directive 2026-07-03):** *Do not keep
> workarounds just to preserve old behaviour. Where 1.0.5 fixes something we
> currently shim or work around, delete the shim and adopt the fixed
> behaviour. Where 1.0.5 changes a default in a way that benefits our
> use-case, ride the new default rather than pinning the old one.*

---

## 1. Version decision

**Target: `github-copilot-sdk==1.0.5`** (pin `>=1.0.5,<1.1`).

- `1.0.5` is the latest **stable on PyPI** (2026-07-01).
- `1.0.6-preview.0/1` are **GitHub-only**, not on PyPI, and add only
  experimental context-attribution APIs + slash-command `choices` +
  tool-search `toolReferences` — **zero relevance to DH**. No reason to
  wait for or chase 1.0.6.
- The `<1.1` upper bound leaves room for 1.0.x patch uptake without
  auto-jumping a future minor that might re-break.

---

## 2. Empirical probe results (SDK 1.0.5, measured 2026-07-03)

Ran a throwaway venv with `github-copilot-sdk==1.0.5` and introspected the
exact surfaces DH touches. **This section is ground truth — every claim
below was measured, not inferred from docs.**

| Probe | Result | Impact |
|---|---|---|
| `from copilot import SubprocessConfig` | **ImportError — removed** | 🔴 B1 breaking |
| `RuntimeConnection.for_stdio/for_tcp/for_uri` | present | B1 target API |
| `PermissionRequestResult(kind="approve-once")` | **TypeError: UnionType not callable** | 🔴 B2 breaking |
| `PermissionDecisionApproveOnce()` | works, empty-field dataclass | B2 target API |
| `copilot.session.{PermissionRequestResult, PreToolUseHookOutput, PermissionHandler}` | all present | 🟢 imports safe (PRR becomes annotation-only) |
| `PreToolUseHookOutput(permissionDecision="allow")` | works (TypedDict, +4 new optional keys) | 🟢 no change |
| `create_session` params | 70 params; all 9 DH uses present | 🟢 `**kwargs` unchanged |
| `resume_session` params | superset incl. `continue_pending_work` | 🟢 unchanged |
| `PingResponse.from_dict` int-cast | still `int(...)` for protocol_version, BUT timestamp now `isinstance(int,float) ? epoch : from_datetime()` | 🟢 **shim likely obsolete** — see § 4.1 |
| `copilot.client._MIN_PROTOCOL_VERSION` | `3` (same as 0.3.0) | 🟢 protocol compatible |
| `copilot.__version__` | `1.0.5` | — |

**Net:** only **2 real breaking changes**, both mechanical. Everything the
original desk estimate feared (kwargs renames, module relayout, PingResponse
relocation) was **disproven by measurement**.

---

## 3. Breaking changes — exact diffs

### 🔴 B1: `SubprocessConfig` removed → `RuntimeConnection.for_stdio()`

`SubprocessConfig` no longer exists in `copilot`. The subprocess/stdio
connection is now expressed via `RuntimeConnection`.

**Import (dh_native_host.py:257):**
```python
# OLD
from copilot import CopilotClient, SubprocessConfig
# NEW
from copilot import CopilotClient, RuntimeConnection
```

**5 construction sites** (L741, L1316–1320, L1437–1441 — approximate,
line numbers drift):
```python
# OLD
config = SubprocessConfig(cli_path=cli_path) if cli_path else SubprocessConfig()
self.client = CopilotClient(config)
# NEW
conn = (RuntimeConnection.for_stdio(path=cli_path) if cli_path
        else RuntimeConnection.for_stdio())
self.client = CopilotClient(connection=conn)
```

> **Verify during implementation:** `for_stdio`'s parameter name for the CLI
> path. README says `for_stdio(path=None, args=None)`. Confirm `path=` (not
> `cli_path=`) with a one-line `inspect.signature` check before editing.
> This is a proper API migration, NOT a workaround — do not attempt to
> preserve `SubprocessConfig` via any compat alias.

### 🔴 B2: `PermissionRequestResult` is now a Union (annotation-only)

In 0.3.0 `PermissionRequestResult(kind="approve-once")` was a constructor.
In 1.0.5 `PermissionRequestResult` is a `UnionType` of concrete decision
classes and is **not callable**. The headless auto-approve handler
(AGENTS.md § 4.1 golden rule) must return a concrete variant.

**Import addition** (consolidate into the existing `copilot.session` block
at L258–262 — Phase 1 confirmed `PermissionDecisionApproveOnce` is exported
from `copilot.session` as well as `copilot.rpc`):
```python
from copilot.session import (
    PermissionRequestResult,      # now annotation-only (Union)
    PreToolUseHookOutput,
    PermissionHandler,
    PermissionDecisionApproveOnce,  # NEW — the concrete approve variant
)
```

**Handler return (dh_native_host.py:1227):**
```python
# OLD
def _permission_handler(self, request, context) -> PermissionRequestResult:
    ...
    return PermissionRequestResult(kind="approve-once")
# NEW
def _permission_handler(self, request, context) -> PermissionRequestResult:
    ...
    return PermissionDecisionApproveOnce()
```

- `PermissionRequestResult` **stays imported** (L259) — it remains valid as
  the return-type annotation (a Union is a legal annotation). Only its use
  as a constructor moves to `PermissionDecisionApproveOnce`.
- `PreToolUseHookOutput(permissionDecision="allow")` at L1238 is
  **unchanged** — still a TypedDict, still accepts `"allow"`.

---

## 4. Improvements to ADOPT (not workarounds to preserve)

Per the guiding principle, these are places where 1.0.5 is better and we
should take the improvement rather than defend the old shape.

### 4.1 DELETE the PingResponse ISO-timestamp shim

The shim at `dh_native_host.py:263–311` was added 2026-05-20 (commit
`b4bb6ab`) because CLI 1.0.46+ emitted ISO-8601 timestamps that
0.3.0's `PingResponse.from_dict` fed to a bare `int()`, crashing
`client.start()`.

**Probe finding:** 1.0.5's `from_dict` now reads:
```python
timestamp_value = (
    datetime.fromtimestamp(timestamp / 1000, tz=UTC)
    if isinstance(timestamp, (int, float))
    else from_datetime(timestamp)   # <-- ISO path, native
)
```
The ISO case is handled natively. **The shim is redundant.**

**Plan:** Remove L263–311 entirely (the `try/except` monkey-patch block
plus its logging). **Verification gate before deletion:** in the upgrade
venv, run a real `await CopilotClient(...).start()` against the installed
CLI and confirm no `ValueError` on the ping. If it succeeds with the shim
removed, the deletion is proven. (This is the one probe we could NOT do
offline — it needs the CLI process + auth.)

> Do **not** keep the shim "just in case." If the verification passes,
> the shim is dead code that will rot and confuse future maintainers.
> Deleting it is the whole point of upgrading past the bug.

### 4.2 RIDE the new `infinite_sessions` default (do not disable)

DH currently passes **no** `infinite_sessions` argument, so it inherits the
SDK default. 1.x documents infinite sessions as **on by default**:
automatic background context compaction + session-state workspace
persistence to `~/.copilot/session-state/{session_id}/`.

**Decision: adopt the new default. Do not set
`infinite_sessions={"enabled": False}` to reproduce 0.3.0 behaviour.**

Rationale:
- Our pain point (C2b-lite, v2.0.72) was complex cases running past the
  analyze timeout while the model was still working. Automatic compaction
  directly addresses the underlying cause: it lets a long analysis keep
  going instead of dying at the context ceiling.
- We already persist/resume sessions by `dhco-<case>` name, so
  workspace persistence is congruent with how we already operate — it is
  not a new privacy surface we weren't already implying.
- Reflexively disabling it to "keep things as they were" is exactly the
  kind of defensive workaround the guiding principle rejects.

**But adopt with observability, not blind faith:**
- Log `session.workspace_path` at session creation (INFO).
- Subscribe to / log `session.compaction_start` and
  `session.compaction_complete` events if easily wired, so beta testing
  can confirm compaction behaves and measure its frequency.
- If beta reveals a concrete problem (runaway disk, PII bleed across
  resume, latency spikes), THEN revisit with data — a measured decision to
  tune thresholds or disable, not a preemptive one.

### 4.3 Everything else stays minimal

`create_session` gained ~55 new optional params. **Adopt none of them in
this release.** They are additive and ignoring them is correct — this is a
compatibility upgrade, not a feature release. New capabilities worth a
*future* dedicated design are catalogued in § 8 so they aren't forgotten,
but they are explicitly OUT of scope here to keep the upgrade auditable.

---

## 5. Test updates (`host/test_sdk_compat.py`)

The existing compat tests lock 0.3.0 contracts and will **fail on 1.0.5** —
which is the file doing its job. Update them to lock the 1.0.5 contract:

| Test | Current assertion | 1.0.5 update |
|---|---|---|
| `test_top_level_imports` | `from copilot import CopilotClient, SubprocessConfig` | `..., RuntimeConnection`; assert `SubprocessConfig` is gone (mirror the `test_legacy_types_module_is_gone` pattern) |
| `test_session_imports` | imports `PermissionRequestResultKind` | **`PermissionRequestResultKind` is GONE** (Phase 1 confirmed) — drop it; import `PermissionDecisionApproveOnce` from `copilot.session` instead |
| `test_internal_rpc_permissionresult_is_different_type` | asserts session PRR has `kind` annotation | session PRR is now a 16-member UnionType — rewrite to assert it's a Union and that `PermissionDecisionApproveOnce` is a member |
| `test_approve_once_is_valid` | `PermissionRequestResult(kind="approve-once").kind` | replace with: `PermissionDecisionApproveOnce()` constructs and `is` in `typing.get_args(PermissionRequestResult)` |
| `test_kind_literal_values_exact` | `PermissionRequestResultKind` literal set | **delete** — the Kind literal no longer exists; superseded by the union-membership test above |
| `test_permission_decision_literal_values_exact` | `PreToolUseHookOutput` `{allow,deny,ask}` | likely unchanged — verify the literal set didn't grow |
| `test_allow_literal_still_valid` | `PreToolUseHookOutput(permissionDecision="allow")` | unchanged (confirmed by probe) |
| `TestMcpTypeMigration` | `local→stdio`, `remote→http` map | unchanged (DH-owned logic) |

**Add two new guards** (mirroring the AAD-length guard philosophy):
- `test_subprocessconfig_removed` — asserts `SubprocessConfig` no longer
  importable, so a future maintainer doesn't reintroduce the old import.
- `test_permission_decision_approve_once_constructs` — asserts
  `PermissionDecisionApproveOnce()` works and is in the PRR union, locking
  the B2 contract.

**Break-and-fail (AGENTS.md § 2):** after tests pass on 1.0.5, temporarily
revert `_permission_handler` to `PermissionRequestResult(kind="approve-once")`
and confirm the suite fails; revert.

---

## 6. requirements.txt + PyInstaller

### 6.1 requirements.txt
```diff
- github-copilot-sdk==0.3.0
+ github-copilot-sdk>=1.0.5,<1.1
```
Check whether 1.0.5's transitive deps differ from 0.3.0 (probe venv pulled
`pydantic 2.13`, `httpx 0.28`, `anyio 4.14`, `python-dateutil`,
`typing-inspection`). Regenerate the pinned block from a clean install so
PyInstaller bundles the right versions.

### 6.2 PyInstaller / Defender
Follow the prior upgrade's Phase 3 (`sdk-upgrade-2026-05-0.3.0.md` § 5, § 8):
1. `pyinstaller --onedir --clean -y` build.
2. Compare `dist/dh_native_host/_internal/` size + layout vs the 0.3.0
   baseline (SDK 1.x may bundle a different CLI runtime / more deps).
3. Smoke-run the exe from a clean location.
4. Defender local scan of `dist/dh_native_host`.

> **New-in-1.x wrinkle to check:** the 1.x SDK README documents
> `python -m copilot download-runtime` caching the CLI into
> `%LOCALAPPDATA%\github-copilot-sdk\cli\<version>\`. Confirm whether the
> PyInstaller-frozen host still relies on the user's globally-installed
> `copilot.cmd` (current DH assumption, AGENTS.md § 9.5) or whether 1.x
> changes the CLI discovery path. This affects the `cli_path` we feed to
> `RuntimeConnection.for_stdio`.

---

## 7. Phased plan

### Phase 0 — Offline probe ✅ DONE (2026-07-03)
Measured all import/type/signature surfaces. Results in § 2. Two breakings
(B1, B2) identified; shim + infinite_sessions decisions made.

### Phase 1 — Live verification ✅ DONE (2026-07-03)

Done in an **isolated probe venv** (not `host/venv`) so the working 0.3.0
dev environment stays intact until Phase 2 upgrades venv + source
atomically. Live ping used the maintainer's global CLI
(`%APPDATA%\npm\copilot.cmd`, **CLI version 1.0.69-1**).

1. ✅ **Shim deletion gate PASSED.** `RuntimeConnection.for_stdio(path=<copilot.cmd>)`
   + `await client.start()` on clean 1.0.5 (no shim) **succeeded** — ping
   handshake clean, no `ValueError` on the ISO timestamp. **The shim is
   confirmed dead code on 1.0.5.** Real stack tested: SDK 1.0.5 ↔ CLI 1.0.69.
2. ✅ `RuntimeConnection.for_stdio(*, path=None, args=())` — `path=` is
   keyword-only. Spec's B1 migration is correct.
3. ✅ **`PermissionRequestResultKind` is GONE** in 1.0.5 (ImportError). The
   `test_sdk_compat` kind-literal tests MUST be rewritten to union-membership
   (§ 5 already anticipated this).
4. ✅ `PermissionRequestResult` is a Union of **16 members**;
   `PermissionDecisionApproveOnce` is the first. Importable from **all three**
   of `copilot.rpc`, `copilot.generated.rpc`, `copilot.session` — so we can
   **add it to the existing `copilot.session` import block** (L258–262)
   rather than introducing a new `copilot.rpc` import line. (Spec § 3 B2
   suggested `copilot.rpc`; consolidating into `copilot.session` is cleaner.)
5. ✅ CLI discovery: `for_stdio(path=None)` → SDK auto-discovers/downloads;
   DH keeps passing its explicit `copilot.cmd` path (proven working in the
   live ping). `SDK_PROTOCOL_VERSION = 3`, same as 0.3.0 → protocol compatible.
   Frozen-build CLI path assumption (AGENTS.md § 9.5) unchanged.

**Net Phase 1 verdict:** upgrade is low-risk. Both breakings are mechanical,
the shim deletes cleanly, and the real SDK↔CLI handshake works today.

### Phase 2 — Code changes ✅ DONE (2026-07-03, commit `061da3f`)
1. ✅ B1: import + 3 construction sites → `RuntimeConnection.for_stdio`.
2. ✅ B2: import consolidated into `copilot.session` + handler return
   `PermissionDecisionApproveOnce()`.
3. ✅ PingResponse shim deleted (gated on Phase 1 live-ping — passed).
   Kept in the *same* commit as the migration (not separate): the deletion
   is only valid because of the upgrade, so a full `git revert` restores
   both together — the realistic rollback path.
4. ✅ `infinite_sessions` observability: `_log_session_observability()`
   logs `workspace_path` at all 3 session-established points. **No**
   `enabled: False` added — new default is ridden deliberately.
5. ✅ `test_sdk_compat.py` rewritten for the 1.0.5 contract + new guards.
   Host suite **77/77** green (was 74). Break-and-fail verified:
   re-adding `SubprocessConfig` to the import crashes module load → 15
   errors; reverted → 77 green.
6. ✅ requirements.txt → `>=1.0.5,<1.1` + regenerated httpx-stack pins;
   dropped the unused 0.3.0-era requests stack.
7. ✅ `host/venv` upgraded to 1.0.5 atomically with source. Full module
   load verified (exit 0). AGENTS.md § 3 + § 9.5 updated for the new
   import map and the shim deletion.

### Phase 3 — PyInstaller + Defender + beta [PENDING]
Per § 6.2. Then dev-mode smoke (real analyze end-to-end, watch for the
AAD/MCP path since that's the § 4.2 beneficiary), then
`release_helper.py 2.0.73-beta.1 --prerelease`. One-feature-per-release
holds: this beta is **SDK upgrade only**, nothing else rides it.

---

## 8. Future opportunities unlocked (OUT OF SCOPE — catalogue only)

1.0.5 exposes capabilities that intersect DH's roadmap. Recorded here so
they aren't lost, but each needs its own design doc — **none ship with the
upgrade.**

- **`on_mcp_auth_request`** (1.0.5 headline feature). A host-side OAuth
  token callback fired when an MCP server returns `401 WWW-Authenticate`.
  This is a *proper* solution to the MCP-auth saga that the v2.0.72
  `dhco-` session-name fix only addressed at the AAD-length layer. If DH
  ever needs to drive non-AAD MCP OAuth (or supply tokens explicitly),
  this is the hook. **Candidate for a dedicated feature after the upgrade
  soaks.**
- **`hooks.on_post_tool_use_failure`** — structured per-tool failure
  callback. Would let DH log *which* tool failed and why, instead of the
  current situation where tool failures blend into generic SDK logs.
  Cheap observability win for a future release.
- **`session_limits={"maxAiCredits": N}`** — per-session spend cap. Could
  bound runaway analyses as a cost guardrail.
- **`enable_citations`** — native model citations for supported providers;
  could enrich `dh_case_report.md` with source links.

---

## 9. Rollback

- **Code:** the upgrade is 2 mechanical edits + 1 shim deletion +
  observability logging. `git revert` of the Phase 2 commit fully restores
  0.3.0-compatible source.
- **Dependency:** `requirements.txt` revert to `==0.3.0` + rebuild.
- **Runtime split-brain risk:** the frozen exe bundles the SDK, but the CLI
  is the user's global `copilot.cmd` (auto-updating). A 0.3.0 host talking
  to a very new CLI is the exact drift scenario AGENTS.md § 9.5 documents —
  which is *why* we're upgrading. Post-rollback, the PingResponse shim must
  come back if the CLI is still emitting ISO timestamps. Keep the shim's
  deletion in its own commit so a rollback can cherry-pick it back
  independently.
