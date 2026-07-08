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

Revert `_case_to_session_id()` to the **exact pre-B82 derivation**:

```python
_SESSION_UUID_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")

@classmethod
def _case_to_session_id(cls, case_id: str) -> str:
    return str(uuid.uuid5(cls._SESSION_UUID_NAMESPACE, f"dh-{case_id}"))
```

Recovered verbatim from commit `30028cc` ("fix(host): use deterministic
UUID v5 for session IDs"). A true revert, not a new invention — it returns
to a design already proven in production.

**Why UUID v5 (not v4):** v5 is deterministic — `uuid5(NS, "dh-"+case)`
yields the same UUID for the same case every time. This preserves the
resume guarantee. A random v4 would break resume. The namespace +
`dh-`-prefixed input are reproduced exactly so the mapping is identical to
the historical one (any dormant pre-B82 sessions remain addressable, though
in practice the session pool has long since rolled over).

**AAD safety of the output:** a UUID string
(e.g. `db4ccff6-8867-4e7f-9afb-565c6ddc48e6`) is 36 chars of
`[0-9a-f-]` — inside AAD's 20–50 length window and a strict subset of its
allowed charset (`[A-Za-z0-9\-_.~]`). Verified by the retained
`test_length_satisfies_aad_minimum` / `test_uses_only_aad_legal_chars`
guards.

## 3. What changes vs. what stays

### Changes
| Item | From | To |
|---|---|---|
| `_case_to_session_id` return | `f"dhco-{case_id}"` | `str(uuid.uuid5(NS, f"dh-{case_id}"))` |
| `_SESSION_UUID_NAMESPACE` const | (removed in B82) | re-added: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| ~5 inline comments referencing `dhco-<case>` | `dhco-<case>` prose | UUID prose |
| `test_case_id.py::TestCaseToSessionId` | asserts `dhco-` prefix | asserts valid deterministic UUID v5 |
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
- **AAD-safety test guards** — `test_length_satisfies_aad_minimum` +
  `test_uses_only_aad_legal_chars` stay valid and now protect the UUID form
  (and any future scheme) generically.

### Rolls over (accepted, painless)
- Existing `dhco-<case>` sessions won't be found when DH computes the UUID
  form → `resume_session` misses → a fresh session is created. Identical to
  the `co-`→`dhco-` transition in v2.0.72. No data loss (analysis reports
  persist independently); the session pool naturally rolls forward as cases
  are re-analyzed.

## 4. Test plan (`host/test_case_id.py::TestCaseToSessionId`)

Rewrite the identity-of-form assertions; keep the property + AAD guards:

- **`test_returns_deterministic_uuid`** (replaces `test_returns_dhco_prefix_form`):
  assert the output matches the UUID regex and equals
  `str(uuid.uuid5(NS, "dh-"+case))` recomputed — locks the exact derivation.
- **`test_returns_uuid_form`** (inverts the old `test_never_returns_uuid_form`):
  assert the output IS a UUID (the old test asserted it was NOT — the
  contract flipped).
- **`test_is_deterministic`** / **`test_different_cases_produce_different_names`**:
  unchanged — still hold for uuid5.
- **`test_length_satisfies_aad_minimum`** / **`test_uses_only_aad_legal_chars`**:
  unchanged — still pass (36-char hex UUID), now guarding the UUID scheme.
- **Break-and-fail:** after green, temporarily return `f"dhco-{case_id}"`
  and confirm `test_returns_uuid_form` + `test_returns_deterministic_uuid`
  fail; revert.

Host suite expected to stay green (77 tests, with the 2 rewritten
assertions).

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
