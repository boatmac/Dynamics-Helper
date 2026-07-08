# Session Name: revert `dhco-<case>` → deterministic UUID v5

> Author date: 2026-07-03. Design spec for reverting the DH Copilot
> session-name scheme from the custom `dhco-<case>` string back to a
> deterministic UUID v5 derived from the case ID.

---

## 1. Problem & motivation

DH names each Copilot session deterministically from the case ID so the
same case always maps to the same session (enabling `resume_session` and
shell-CLI `copilot --resume <name>`). The scheme has changed twice:

- **≤ B82 (pre-2026-05-11):** `str(uuid.uuid5(NS, f"dh-{case_id}"))` — a
  deterministic UUID. Chosen because the CLI then *required* session_id to
  be a UUID.
- **B82 (2026-05-11):** `co-<case>` (19 chars) — switched to a
  human-memorable name once the CLI relaxed its UUID requirement. The
  optimization: you could `copilot --resume co-<case>` from memory.
- **v2.0.72 (2026-07-03):** `dhco-<case>` (21 chars) — forced by Microsoft
  Entra AAD, which passes the session_id through as the OAuth
  `client_session` parameter and requires **20–50 chars**. The 19-char
  `co-` form failed with `AADSTS901001` and blocked MCP auth.

**The concern this spec addresses:** the AAD incident proved that the
session_id is consumed by external validation layers DH does not control
(AAD's `client_session`), and the Copilot CLI is "a moving target by
design" (AGENTS.md § 9.5). A **custom** name is inherently exposed to
whatever format constraints any future layer (MCP OAuth, new CLI versions,
other AAD-protected tools) may impose. AAD was the first such constraint;
there is no guarantee it is the last.

A **UUID** is the format every one of those layers is built and tested
against (it was the SDK's own original default). Using it eliminates the
entire *class* of custom-name validation risk, not just the one known
instance.

## 2. Decision

> **Superseded derivation note (2026-07-03):** an earlier draft of this spec
> recovered a DH-only namespace (`a1b2c3d4-…` + `dh-`-salted input) from DH's
> pre-B82 git history (`30028cc`). That was **wrong for the cross-repo
> purpose** — MyCasesKit never knew that namespace. The authoritative
> derivation is defined by MyCasesKit's handoff spec
> (`MyCasesKit/docs/dh-uuid5-change-spec.md`) and is what DH implements:

Set `_case_to_session_id()` to the **MyCasesKit-shared derivation**:

```python
# module-level constant (greppable coordination anchor)
_NAMESPACE_MYCASE = uuid.UUID("816bee4e-8eee-4c0b-ae69-70879d032f4d")

@classmethod
def _case_to_session_id(cls, case_id: str) -> str:
    return str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))
```

- Input is the **bare** case number — no `dh-`/`co-`/`mycase-` prefix, no
  salt. The namespace already isolates the hash space; any text salt would
  make DH's value differ from MyCasesKit's.
- `_NAMESPACE_MYCASE` and the bare-case input MUST stay byte-identical to
  MyCasesKit forever — that is the entire cross-repo agreement.

**Why UUID v5 (not v4):** v5 is deterministic — `uuid5(NS, case)` yields the
same UUID for the same case every time, so DH re-derives it on any device
and `resume_session` finds the existing session with no stored map. A random
v4 would break resume. MyCasesKit computes the identical v5 independently.

**AAD safety of the output:** a UUID string
(e.g. `ce0ec286-26e6-5095-8b30-46143e9f437f`) is 36 chars of `[0-9a-f-]` —
inside AAD's 20–50 length window and a strict subset of its allowed charset
(`[A-Za-z0-9\-_.~]`). Verified by the retained `test_length_is_36_aad_legal`
/ `test_uses_only_aad_legal_chars` guards.

**Golden values (shared cross-repo anchor, byte-verified vs MyCasesKit):**

| bare case number | uuid5 |
|---|---|
| `2601190030003106` | `ce0ec286-26e6-5095-8b30-46143e9f437f` |
| `2099020099009998` | `0ff23d45-654e-55aa-8be9-dfc55a842b2e` |
| `2606100030001545` | `6eb4d81e-d635-59e4-8a98-3d3a733cc733` |

If DH's computed value differs from a golden value, the namespace or input
is wrong — **fix the code, never the golden value.**

## 3. What changes vs. what stays

### Changes
| Item | From | To |
|---|---|---|
| `_case_to_session_id` return | `f"dhco-{case_id}"` | `str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))` |
| `_NAMESPACE_MYCASE` const | (none) | added: `816bee4e-8eee-4c0b-ae69-70879d032f4d` (module-level, shared w/ MyCasesKit) |
| `import uuid` | (absent at module level) | added to the stdlib import block |
| ~5 inline comments referencing `dhco-<case>` | `dhco-<case>` prose | UUID prose |
| `test_case_id.py::TestCaseToSessionId` | asserts `dhco-` prefix | known-answer golden values + asserts UUIDv5 |
| AGENTS.md § 4.6 (Session Persistence) | `dhco-` contract | UUID contract |

### Stays (no change needed)
- **DH internal resume** — `_case_to_session_id` is deterministic, so
  clicking Analyze on a known case resumes automatically. Unaffected.
- **`dh_case_report.md` resume line** — reads `self.current_session_id`
  dynamically (`copilot --resume <id>`); the printed command just becomes
  the UUID. No code change.
- **`## Session Info` system-message injection** — still injects
  `self.current_session_id`; the AI writes whatever value it's given into
  context.md `session_name:`. No code change beyond the value.
- **`case_number` in context.md frontmatter** — already present (confirmed
  by maintainer). Human-readable case tracking is preserved *independently*
  of `session_name`, so the UUID `session_name` costs no readability.
- **AAD-safety test guards** — `test_length_is_36_aad_legal` +
  `test_uses_only_aad_legal_chars` stay valid and now protect the UUID form
  (and any future scheme) generically.

### Rolls over (accepted, painless)
- Existing `dhco-<case>` sessions won't be found when DH computes the UUID
  form → `resume_session` misses → a fresh session is created. Identical to
  the `co-`→`dhco-` transition in v2.0.72. No data loss (analysis reports
  persist independently); the session pool naturally rolls forward as cases
  are re-analyzed. MyCasesKit's `context.md` migration forward-upgrades
  legacy `dhco-<case>` values to their uuid5, so the two repos can land
  independently — no lockstep deploy.

## 4. Test plan (`host/test_case_id.py::TestCaseToSessionId`)

Rewrite the identity-of-form assertions; keep the property + AAD guards:

- **`test_known_answer`** (replaces `test_returns_dhco_prefix_form`):
  known-answer test against the 3 SHARED golden values (§2). Locks the exact
  namespace + bare-case derivation and pins DH byte-for-byte to MyCasesKit.
  Do NOT recompute — use the literals.
- **`test_returns_uuid_v5_form`** (inverts `test_never_returns_uuid_form`):
  assert the output IS an RFC-4122 UUID (`UUID_REGEX`), `uuid.UUID(r).version
  == 5`, and does NOT start with `cc-`/`co-`/`dhco-`. The old test asserted
  it was NOT a UUID — the contract flipped.
- **`test_length_is_36_aad_legal`** (was `test_length_satisfies_aad_minimum`):
  now asserts `== 36` (and within 20-50). AAD regression guard.
- **`test_uses_only_aad_legal_chars`** / **`test_is_deterministic`** /
  **`test_different_cases_produce_different_names`**: unchanged — still hold
  for uuid5.
- **Break-and-fail:** after green, temporarily return `f"dhco-{case_id}"` and
  confirm `test_known_answer` + `test_length_is_36_aad_legal` +
  `test_returns_uuid_v5_form` fail; revert. (Done 2026-07-03: 3 failures,
  golden-answer caught the desync; restored → 77 green.)

Host suite stays green (77 tests, class rewritten 1:1 in count).

## 5. Cross-repo coordination (maintainer-owned)

MyCasesKit's B81 RFC § D1 matcher currently accepts
`^(cc|co|dhco)-<case-num>$` for the `session_name:` frontmatter field. After
this change, DH writes a UUID there instead. MyCasesKit must either:
- accept a UUID in `session_name:` (loosen/replace the matcher), or
- rely on the already-present `case_number` field for case identity and
  treat `session_name` as an opaque resume handle.

The maintainer owns MyCasesKit and sequences this. DH's change is
independent — it does not break DH-side behaviour if MyCasesKit lags,
because DH never parses `session_name` back out (it only derives it
forward from the case ID).

## 6. Rollback

Single-method change plus a constant and test updates. `git revert` of the
implementation commit restores `dhco-<case>`. No migration, no persisted
state depends on the scheme (sessions are addressed live, reports are
scheme-agnostic).

## 7. Out of scope

- Memorable shell resume without opening the report. If desired later, that
  is a MyCasesKit CLI-wrapper feature (`copilot --resume-case <case>` that
  computes uuid5 itself), not a DH change.
- Any adoption of SDK 1.0.5's `on_mcp_auth_request` or other new session
  capabilities (tracked separately in `docs/sdk-upgrade-2026-07-1.0.5.md` § 8).
