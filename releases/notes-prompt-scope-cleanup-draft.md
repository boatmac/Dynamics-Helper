# Prompt Scope Cleanup (Next Beta Draft)

## Deterministic instruction sources

DH now disables Copilot CLI automatic custom-instruction discovery for DH sessions. Every analysis receives DH Core plus exactly one selected instruction source.

## Repository ONLY now includes instructions

With a non-empty Root Path, Repository ONLY selects Root `.github/copilot-instructions.md` together with repository Skills and MCP. When disabled, DH-specific Instructions are used instead. Custom User Prompt remains active for every Analyze.

## Existing-setting migration behavior

Existing `use_workspace_only=true` values take on the expanded behavior immediately. A selected but missing/unreadable Root instruction file blocks Analyze with an actionable error; an existing empty file is valid.

## Actionable prompt-source errors

Core, DH-specific, and Repository instruction read failures retain machine-readable error codes through immediate and rehydrated browser results.

## Review hardening

- Custom User Prompt is applied from its current value exactly once at every Analyze send; duplicate stale sections are removed from the first authoritative marker.
- Prompt health refreshes after acknowledged repairs without rehydrating or overwriting Options values.
- Delayed Chrome preference hydration cannot overwrite a newer storage event, including Reset/default/empty values.
- Full Team Catalog sync commits only while enabled, manifest URL, and selected team still exactly match; Options and Service Worker ignore stale results.
- Analysis consumption uses a separate identity-only acknowledgment, so it cannot rewrite a newer result; legacy seen records remain supported.
- Team Catalog diagnostics and bookmark telemetry no longer expose credential-bearing manifest or bookmark URLs.
- Host SDK response diagnostics contain metadata only and no-content reports never serialize raw response events or model content.
- Service Worker queues now serialize Team Catalog cache/reset commits and analysis pending/result/reset mutations; stale cache identities are rejected by consumers.
- Analysis acknowledgments use independent per-result keys, and hydration reads one coherent storage snapshot.
- SDK session/model failures expose safe operation and exception type only; raw SDK/CLI exception text is not logged, returned, or persisted.
- Every Team Catalog request carries captured enabled/URL/team identity and a token; stale Reset, no-team, manifest-only, and selected-team requests perform no network or cache mutation.
- Custom User Prompt is canonicalized again by the Host from `user_prompt.md` on every Analyze before PII scrubbing; stale payload sections are replaced or removed.
- Pending analyses use request-scoped storage keys, so concurrent cases and acknowledgments no longer compete across Service Worker restarts.
- Hydrated pending and local in-flight Analyze state are reconciled independently, preventing stuck or prematurely-cleared spinners.
- Permission and pre-tool approval logs omit request representations, tool names, paths, commands, URLs, and contents.
- Unreadable/invalid-UTF-8 Custom User Prompt health now preserves the browser mirror and omits Host content instead of substituting empty; unrelated settings cannot truncate it, while explicit edit/clear repairs it.
- Custom User Prompt writes are sparse, immutable revisioned intents like DH-specific Instructions; overlapping acknowledgements cannot lose a newer value.
- Team sync, Reset, and related preference-mirror actions survive compatible later snapshots, cancel on incompatible team identity, and run once after durable commit.
- Options and FAB menu Team Catalog reads ignore delayed results from old enabled/URL/team generations.
- FAB Analyze spinner and safety timers are request-ID scoped, so stale A response/finally/timeout paths cannot clear or report over request B.
- Preference mirrors are serialized/coalesced and inspect Chrome storage errors; no Host/team/Reset action runs before the latest durable commit, and failed intent remains retryable.
- Reset responses carry default identity, generation, and token with committed/stale/failed truth; stale, failed, transport, or superseded callbacks never claim success or clear newer edits.
- FAB retains request ownership through asynchronous case hashing, preventing stale response UI, duration, menu, and outcome telemetry.
- Session refresh config no longer reads Custom User Prompt; Options hydration and each Analyze perform their own single canonical read. Explicit-null editable prompt fields fail before any write.
- Hydration catch-up now enters the same immutable single-flight preference-mirror queue as normal edits; a failed mirror sends no Host update, and delayed older work cannot send over a newer edit.
- Team Catalog set/remove callbacks inspect scoped Chrome storage errors. Failed manifest, bookmark, 304 timestamp, clear, and Reset mutations never report committed or expose success items/timestamps, and later queued work can recover.

## Verification

- Seventh review product commit: `85355f8` (`fix(review): harden storage commit truth`); the evidence commit follows it.
- Isolated Host: **135/135 focused** and **207/207 full** tests passed.
- Extension: **159/159 focused across 4 files** and **272/272 full across 18 files** passed.
- Production build passed with **2,217 modules transformed** and **13 artifacts** listed.
- Isolated source-only compileall, `git diff --check`, static/version scans, and restored break-and-fail mutations passed.
- Optional authenticated marker smoke was not run because safe model-backed user/session isolation was unavailable; it remains non-gating.
- The controller broad whole-branch review remains pending after this seventh fix wave.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.
