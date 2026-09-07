# Prompt Scope Cleanup (`2.0.76-beta.2` Qualification-Pending Draft)

This is the corrected `2.0.76-beta.2` target. Artifact build, private cloud-PC
qualification, tag, and publication are still pending; this draft does not claim
a release.

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
- Team sync and related preference-mirror actions survive compatible later snapshots and cancel on incompatible team identity. Reset cleanup ownership is a separate phased transaction after its initial durable mirror/Host dispatch.
- Options and FAB menu Team Catalog reads ignore delayed results from old enabled/URL/team generations.
- FAB Analyze spinner and safety timers are request-ID scoped, so stale A response/finally/timeout paths cannot clear or report over request B.
- Preference mirrors are serialized/coalesced and inspect Chrome storage errors; no Host/team/Reset action runs before the latest durable commit, and failed intent remains retryable.
- Reset responses carry default identity, generation, and token with committed/stale/failed truth; stale, failed, transport, or superseded callbacks never claim success or clear newer edits, and an explicit Retry cleanup action resumes the original transaction.
- FAB retains request ownership through asynchronous case hashing, preventing stale response UI, duration, menu, and outcome telemetry.
- Session refresh config no longer reads Custom User Prompt; Options hydration and each Analyze perform their own single canonical read. Explicit-null editable prompt fields fail before any write.
- Hydration catch-up now enters the same immutable single-flight preference-mirror queue as normal edits; a failed mirror sends no Host update, and delayed older work cannot send over a newer edit.
- Team Catalog set/remove callbacks inspect scoped Chrome storage errors. Failed manifest, bookmark, 304 timestamp, clear, and Reset mutations never report committed or expose success items/timestamps, and later queued work can recover.
- Personal bookmark mutations and Reset now share a generation counter and serialized `dh_items` queue. Newer add/edit/delete/move/import/collapse changes survive delayed Reset response/removal, while normal Reset still reloads packaged defaults and partial cleanup is reported truthfully.
- Native Host error normalization preserves allowlisted `errorKind` and `httpStatus`, so model-list authentication failures select re-auth guidance without forwarding arbitrary Host fields.
- Manifest blur retries distinguish last successful from in-flight URLs. Failed, transport, stale, skipped, and first-time no-team requests can retry; committed/unchanged requests deduplicate, and old URL callbacks cannot disturb newer work.
- Reset now stores token, default identity, generations, retry action, and phase outside supersedable preference actions. Once Host durably commits, cleanup retry never resends Host or rewrites defaults; it uses the same token and safely scopes SW/local cleanup around newer preference/bookmark edits. Normal Reset intentionally starts a fresh transaction.
- Personal bookmark set/remove failures retain the newest snapshot/removal intent, keep a localized persistence warning visible, suppress false Reset completion, and recover on the next coalesced mutation.
- Options normalizes omitted team identity to the empty string for every manifest current/response check, so no-team committed/unchanged requests deduplicate while failed/stale/skipped requests remain retryable and old callbacks are ignored after team selection.
- One shared string-only selector now covers Analyze persistence, Native response normalization, config updates, prompt health, Options warnings, FAB nested errors, and Service Worker immediate paths. Objects, arrays, functions, symbols, and null are never coerced; valid strings and allowlisted metadata are preserved.

## Reliable transactional automatic updates

Plan D now activates the previously hardened package, transaction, and detached
recovery layers. The Service Worker owns durable `dh_update_state`, exact
capability/version/integrity checks, status polling, terminal reload, and
receipt-backed finalization. FAB and Options only render projected state and send
payload-free start requests.

Exactly four strict Host actions route to `UpdateService`. Ordinary application
failures restore the complete previous Host/Extension product; interruption
resumes through the detached runner, RunOnce recovery, and read-only status Host.
Mixed installs retain matching-full-installer guidance. Unsafe frozen startup
recovery exits `30` with empty stdout and exact stderr
`manual_recovery_required\n` before normal
Host initialization.

Plan D operations use a distinct cross-process mutex above the Plan B/C mutation
mutex. The matching installer now replaces `_internal` as an exact tree so stale
runtime files cannot survive repair, and probes a temporary complete product
view before any live mutation. Startup state hydration remains responsive while
recovery resumes in the background; source mode is check-only, exact pre-launch
activation failures are explicit-retry states, and rollback remains visible with
an explicit retry path.

Final hardening bounds every main update lease, retries finalize/ack in their
exact persisted phase, and requires a newly loaded Worker before terminal
finalization. The matching installer validates exact release inventory, probes
the repaired live product, and settles compatible preserved transaction
authority without deleting contradictory evidence.

Terminal completion is transaction-bound and consumed only after eight
continuous visible seconds. A foreground Options status, an open FAB terminal
banner, or the exact transaction-bound FAB completion bubble can acknowledge it;
background tabs, a closed FAB red dot, and unrelated bubbles cannot. Visibility
loss starts the interval over, and an ACK transport failure gets no same-epoch
retry. Beta2 artifact creation and destructive cloud-PC qualification remain
deferred. A smaller post-implementation qualification design/plan must be written
after product implementation and independent review, pending separate user
approval.

Private `2.0.76-beta.1` completed its update transaction, integrity checks,
finalization ACK, Analyze, and Options checks successfully, but is DISQUALIFIED
because its completion notice replayed permanently. It remains unpublished and
is historical evidence only, not qualification for `2.0.76-beta.2`.

## Verification

- Prompt-scope tenth-wave evidence: isolated Host **143/143 focused** and
  **207/207 full**; Extension **210/210 focused** and **340/340 full**; production
  build **2,218 modules / 13 artifacts**.
- Plan C source-focused command ran 182 tests with 181 passes and one expected
  environment-gated frozen skip. The same frozen selector passed separately
  `1/1` against the built runtime.
- Committed-head full Host discovery ran **523** tests with that same sole frozen
  skip; the separate frozen selector passed.
- Historical Plan C frozen gate passed exact PyInstaller **6.18.0**, all **15/15** required
  modules, and an onedir inventory of **73 internal files / 10 directories**.
- Plan A/B regressions passed **134/134**; full Extension remained **340/340**;
  isolated compile/static/scope gates and restored break-and-fail mutations
  passed.
- The approved pragmatic B2 cloud-PC gate replaces the broader disposable-VM
  claim. It requires uninterrupted B1-to-B2 update, exact original-runner
  interruption with same-transaction recovery, and matching-installer repair on
  an effectively empty cloud PC. All three scenarios remain pending until
  separately authorized execution; this draft does not claim they passed.
- Finalization durability now covers every reserved/receipt/receipt-ready/ack/
  cursor-removal crash boundary, ordinary fault replay, receipt-scratch cleanup,
  lexical reparse rejection, exact entry-type errors, and serialized concurrent
  finalizers. Full committed-head verification is rerun after this correction.
- Follow-up hardening adds durable first-receipt-directory publication, exact
  finalization contention errors, crash-resumable partial status unregister,
  and Plan B cleanup crash replay. Production Plan D now consumes these paths.
- Final clean-head verification passed focused **206** (one expected frozen
  skip), Plan A/B **134/134**, full Host **547** (same sole skip), Extension
  **340/340**, compile/build/static/scope, and rebuilt frozen probe **1/1**. A
  final post-evidence no-drift rerun and broad branch verdict remain pending.
- Plan D cutover gates pass Host **663/663** in bounded, disjoint source
  partitions (one expected environment-gated frozen skip), Extension
  **894/894**, production Extension build **2,228 modules**, Python compilation,
  and diff/static checks. The approved project venv built the frozen Host with
  exact PyInstaller **6.22.2**; the graph contains all **17/17** reviewed hidden
  imports, the onedir inventory is **35 internal files / 10 directories**, and
  the real frozen staged-probe integration passes **1/1**.
- Implementer-reported one-shot development checks passed Extension
  **951/951**, update-focused **181/181**, UI **55/55**, and TypeScript. B2
  artifact and cloud-PC qualification remain pending.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.

Release packages now include canonical `update-manifest.json`,
`host/release-integrity.json`, and `host/installed-product.json`. The Host can
report package capabilities and frozen-install integrity, and its early probe
runs before normal startup side effects. These checks detect incomplete or
mixed product files; SHA-256 values are consistency checks, not package
authentication.

The first upgrade from `v2.0.75-beta.1` into the cutover release still runs the
old version's historical in-place updater and is not retroactively
transactional. Cutover startup immediately verifies Host, Extension, capability,
and package integrity. A complete install enables all future transactional
updates; either mixed direction persists matching-full-installer guidance.

Subsequent updates cannot report success before terminal verification and
finalization. Standalone bootstrap and per-write power-loss guarantees remain
deferred, so an extreme interruption may still require the matching full
installer.
