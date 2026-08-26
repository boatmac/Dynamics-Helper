# Tenth Review Important Fixes Design

**Status:** Approved
**Date:** 2026-07-17
**Scope:** Two Important findings from the tenth whole-branch review

## Reset Transaction Ownership

Options owns one explicit in-memory `ResetTransaction` independently of the
coalescing preference-mirror action queue. The transaction captures one reset
token, the default Team Catalog identity, the reset request generation, the
personal-bookmark generation, and this phase union:

```text
host-pending | host-committed | sw-pending | local-cleanup-pending | complete
```

The initial Reset button intentionally creates a new transaction, applies
`DEFAULT_PREFS`, commits that mirror, and sends one tokenized Host
`update_config`. A durable Host acknowledgment (`success: true` or
`config_saved: true`) advances the transaction to `host-committed` before
newer preference generations are considered. From that point onward the Host
phase and default preference write are final and must never be repeated for
that token.

The preference mirror may supersede its one-shot action, but it cannot erase the
transaction. Service Worker and local-cleanup callbacks consult the transaction
token and phase. A stale, failed, transport, or superseded callback leaves an
incomplete warning and a retry action on the same transaction. The warning has
an explicit Retry cleanup control; that control resumes only the stored
transaction. The normal Reset button always starts a fresh reset with a new
token and Host phase.

Service Worker reset remains guarded by the captured default Team Catalog
identity. If current preferences no longer match that identity, it returns
`stale` and clears no shared state. Local cleanup is separately scoped:

- Team-collapse UI/storage cleanup runs only while the captured default team
  identity and reset generation remain current.
- Personal bookmark removal/default reload runs only while its captured
  bookmark generation remains current.
- A newer preference or bookmark edit is never cleared, rewritten, or reset to
  defaults by retry.

If current preferences are no longer defaults, retry may complete only cleanup
whose generation and identity checks still prove it safe. It never writes
`dh_prefs`, sends defaults to Host, or reuses `handleReset`.

## Shared String-Only Error Selection

One utility, `safeErrorText(candidates, fallback)`, returns the first non-empty
string candidate unchanged. It never invokes `String`, `toString`, template
coercion, JSON serialization, or logging on candidate objects, arrays,
functions, symbols, or nullish values. If no candidate is a usable string, it
returns the caller's fixed trusted fallback.

The utility is used at every reviewed extension boundary:

- Analyze bridge rejection, inner Analyze error/message, and outer
  error/message persistence.
- Native Host response normalization.
- Config update inner and outer error/message classification.
- Options prompt-source health and immediate config/storage/transport warning
  extraction.
- FAB inner analysis, Native Host wrapper, outer response, and caught-exception
  display paths.
- Service Worker immediate Analyze metadata and rejection response extraction.

Existing allowlists remain unchanged: `error_code` is normalized,
`errorKind` must be a string, and `httpStatus` must be a finite number. Valid
string errors preserve their current display and persistence behavior. Unknown
or malformed values use a fixed safe fallback or localized fallback key.

## Tests And Verification

TDD probes cover Host-committed Reset followed by a language edit before the SW
callback, then stale/superseded cleanup and explicit retry. They assert one Host
reset, one default preference write, the same reset token, preserved `en`, and
truthful completion. The same matrix covers `config_saved: true` plus refresh
failure. A phase-persistence mutation must make the probe fail.

Error probes use secret-bearing objects/arrays and throwing `toString` methods
for Analyze persistence, `update_config` Options warnings, prompt health, FAB
nested responses, and Native Host normalization. Valid strings remain verbatim.
A temporary `String(...)` mutation must make the focused tests fail.

Final verification includes focused and full Extension suites, isolated focused
and full Host suites, Extension production build/TypeScript, source-only Python
`compileall`, static ownership/coercion scans, `git diff --check`, version and
generated-output checks. Authenticated smoke remains skipped because safe
model/session isolation is not guaranteed.
