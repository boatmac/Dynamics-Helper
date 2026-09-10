# Configuration Storage Contract

This contract defines hydration catch-up, team mutation durability, Reset ownership,
and safe error selection. Full persistence context is in
[Source Errors and Config Health](../../DEVELOPER_GUIDE.md#source-errors-and-config-health)
and [Writing prefs](../../DEVELOPER_GUIDE.md#writing-prefs), with
[bookmark and acknowledgment boundaries](runtime-transaction-data-boundaries.md).

## Hydration Catch-Up

Post-hydration catch-up captures one immutable config intent and enters the same
single-flight, coalescing `writePrefsMirror` queue as ordinary preference writes.
Only the successful latest mirror commit invokes `onLatestCommit` and sends its
captured Host payload. An older callback cannot send past a newer intent.

Storage failure retains the latest intent, visible mirror issue, and unsettled
actions; it sends no Host update and dispatches no action. A later user-driven
write retries or supersedes that intent. Passive hydration remains storage-only
and generation-gated; no touched preferences means no catch-up operation.

## Team Catalog Mutation Truth

Callback-style set/remove wrappers inspect `chrome.runtime.lastError` inside
their own callbacks and reject on failure. Both queue continuations remain
usable, so rejection cannot poison later work.

Identity/generation mismatch is `stale`; storage rejection is `failed`, never
`committed`. This applies to manifest/bookmark/304 writes, selection clears,
cache clears, and Reset. Failed selected sync omits items and timestamps. Reset
cannot claim success from a failed or stale response. Diagnostics use fixed
safe messages, not URLs, query strings, or thrown values.

## Reset Transaction

Options keeps `ResetTransaction` independently of coalescing mirror actions. It
captures the reset token, default team identity, request/bookmark generations,
and phases `host-pending`, `host-committed`, `sw-pending`,
`local-cleanup-pending`, `complete`.

A normal Reset creates a new transaction, applies defaults through the mirror,
and sends a tokenized Host update only after mirror durability. Only an
acknowledged response under `classifyConfigUpdateResponse` advances the Host
phase; explicit `config_saved: false` or malformed presence is not success.
`config_saved: true` can acknowledge persistence while reporting refresh failure.

Record `host-committed` before supersession checks. No retry may resend the
acknowledged defaults or re-enter `handleReset`/`persistPrefs`. Retry cleanup
resumes the same token's pending SW/local phases. Stale/failed/transport callbacks
leave truthful incomplete state, not a new Host write.

SW cleanup requires the captured default team identity. Team cleanup and personal
bookmark cleanup independently check their generations; newer edits win. Personal
Reset validates defaults before a generation-owned set, never removes bookmarks
first. A failed default load/write retains data and cleanup retry ownership.

## String-Only Errors

`safeErrorText(candidates, fallback)` returns the first non-empty string unchanged,
otherwise a trusted fallback. It never coerces, serializes, interpolates, or logs
objects, arrays, functions, symbols, or nullish candidates.

Analyze persistence/display, Native response normalization, config classification,
Options health/warnings, FAB errors, and SW immediate responses share this
boundary. Preserve normalized `error_code`, string `errorKind`, finite numeric
`httpStatus`, and unchanged success data. Malformed fields receive safe fixed or
localized fallbacks, never conversion hooks.

## Source References

- [Options.tsx](../../extension/src/components/Options.tsx)
- [teamCatalog.ts](../../extension/src/utils/teamCatalog.ts)
- [configUpdateResult.ts](../../extension/src/utils/configUpdateResult.ts)
- [safeErrorText.ts](../../extension/src/utils/safeErrorText.ts)
- [Prompt contract](prompt-source-isolation.md)
