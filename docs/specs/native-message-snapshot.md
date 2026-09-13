# Native Message Snapshot Contract

## Shared Own-Data Boundary

[ownData.ts](../../extension/src/utils/ownData.ts) provides
`ownDataProperty(value, key)` with the distinct results `absent`, `value`, and
`invalid`. Its guarded object/array/descriptor checks accept only own data
properties, never invoke getters, and contain throwing/revoked Proxies. It does
not coerce, serialize, or log rejected values; consumers enforce field schemas.
Specialized parsers can read their already-captured descriptor map locally rather
than reopening the original object or duplicating the generic classifier.

## Non-Analyze Snapshot

`guardNonAnalyzeNativeMessage` in
[analyzeRequestHandler.ts](../../extension/src/background/analyzeRequestHandler.ts)
is a top-level compatibility boundary, not recursive per-action validation.

1. Reject non-objects/arrays and capture own descriptors once in a guarded block.
2. Reject any own `_persist`, `extension_warnings`, or caller `toJSON`, even
   non-enumerable or accessor-backed. Reject symbol keys and enumerable accessors.
3. Require own enumerable primitive-string `action`, not `analyze_error` or the
   private `analyze_with_attachments`.
   A present `requestId` must be own enumerable non-empty primitive string.
   An absent ID remains valid for ordinary legacy actions.
4. Ignore inherited/non-enumerable ordinary fields. Define enumerable string
   data fields on a fresh plain object, shadow inherited `toJSON` with own
   non-enumerable `undefined`, freeze, and return `forwarded`.

Nested values retain identity deliberately. The checked top-level object is
never returned by source identity: later caller mutation cannot inject reserved
metadata into the wire envelope. A routing-to-snapshot action change to Analyze
is denied, not sent through the ordinary path. Invalid input returns fixed
`invalid_native_message_metadata` before transport acquisition/send.

## Final Wire Sender

[nativeMessageWire.ts](../../extension/src/background/nativeMessageWire.ts)
accepts a parsed Analyze result, guarded non-Analyze snapshot, or the trusted
SW-built private attachment envelope described below. It captures
trusted descriptors once and builds a fresh frozen final object via data-property
definitions, not spread, assignment, or conversion. Only the inert non-enumerable
`toJSON: undefined` shadow is permitted outside enumerable string data fields.

An existing non-empty primitive request ID is preserved. Otherwise the injected
factory runs once, and its result must satisfy that type before any registration
or post. The final envelope defines that ID and the inert serialization shadow.
Register before `postMessage`; registration failure posts nothing. Synchronous
post failure unregisters exactly that ID once and rethrows without logging or
coercing the failure. No reconnect/retry or second pending-map cleanup is owned
by this helper.

## Analyze and Update Routing

Analyze uses its stricter parser-owned frozen action and payload, including an
inert payload `toJSON` shadow. Validate before authorization, commit durable
pending/latest owner before dispatch, and recheck serialized update permission
at send time. Invalid input cannot cause storage or Native effects. See
[analysis persistence](analysis-result-persistence.md).

The SW sends only the safe final wire object. Snapshot acceptance alone is not
authorization: the coordinator denies generic `NATIVE_MSG` forwarding of
`perform_update`, `activate_update`, `finalize_update_status`, and
`acknowledge_update_finalization`. Ordinary traffic also obeys hydration,
capability/integrity, and activation-suppression gates defined by the
[update runtime contract](transactional-auto-update.md).

## Private Attachment Analyze

**Implemented-source; focused offline milestones passed, runtime UNVERIFIED:**
the initial 13-file frontend run passed 519/524, with five failures in
`FAB.pageIdentity.test.tsx`. Moving premature progress settlement after terminal
page revalidation was followed by an affected four-file 98/98 PASS, including two
new cases. The selected inventory is 526 in aggregate, not a full 526-test run.
The two new cases failed 2/2 as expected under an early-settle mutation, now
removed; restored GREEN is confirmed (2 passed, 45 skipped, exit 0), with FAB's
raw hash matching the pre-RED ownership-fixed bytes (prefix `D5DF`). Final
TypeScript (`attachments-final`) exited 0 with sources unchanged.
Pure-Host 21/21 uses mocked filesystem/readers and SDK-shaped RPCs, not real file
I/O or Host/SDK runtime. The updated SDK Host-source review hash is not a fixed-SDK
rerun or runtime qualification. Production is not built, installed or live-verified;
no actual attachment model inputs were exercised. See the
[milestone results](../dtm-attachment-investigation.md#initial-verification-status).
A standalone diagnostic `complete` result establishes only that historical
observation, not production Analyze, Host import, model compatibility or
installed-runtime qualification.

The page still submits parsed `analyze_error` without attachment paths. On every
valid case Analyze with the captured supported-origin, same-extension, top-frame
document binding, the SW runs `prepareAttachments` before the first model send,
even for repeated Analyze on the same case. Pending/latest-owner commit precedes
preparation. Recheck durable ownership, generation, source document and updater
send permission; stale preparation cannot dispatch. Requests without the required
binding do not gain attachment access.

Only the SW constructs this Native envelope:

```text
{action: 'analyze_with_attachments', requestId,
 payload: {analysis: <parsed Analyze payload>,
           attachments: {files: [{path, size}], inventory, skipped, reason, language}}}
```

`inventory` is `known` or `unknown`; `reason` is `none`, `auth_timeout`,
`unavailable`, `folder_unavailable`, `download_failed` or `stale`; `language` is `en` or `zh`.
`folder_unavailable` retains unknown inventory: the portal's exact message does
not distinguish an empty folder from insufficient access. It ends preparation
without waiting for the readiness deadline or claiming confirmed zero files.
`files` contains only SW-selected completed browser-download paths/sizes.
Generic/page `NATIVE_MSG` forwarding of `analyze_with_attachments` is denied by
both routing and the non-Analyze guard. `_persist` and `extension_warnings` remain
extension-only. Host validates exact outer/private metadata shapes before reads;
path validation itself does not authenticate a sender or make a generic reader safe.

DTM has a 30-second create-to-ready/auth deadline outside the model timeout.
Retry only transient read-only inspection, never uncertain selection/download
clicks. Browser sign-in and safety approval require the user, with no automatic
focus/approval. Auth expiry skips unavailable files and automatically continues
the still-current Analyze. Late authentication/downloads cannot enter its frozen
set; already-dispatched browser work is not cancelled. Unknown inventory produces
cautious completeness wording, never an unsupported claim that attachments exist.

Limits are four files, 2 MiB each, 8 MiB total, with `.png`, `.jpg`, `.jpeg`,
`.txt`, `.log`, `.json`, `.xml`, `.csv`, `.md` allowed. Text is strict UTF-8 with
BOM/newlines retained. Unsupported/unreadable/oversized files are skipped with
notice accounting. Host rejects observed links/reparse points and performs bounded
reads into frozen bytes, not an OS sandbox or a proof against filesystem races.
Images require the effective session model's vision/media/count/size support;
unknown support skips them, with no automatic model switching. Raw attachment
bytes bypass PII scrubbing; case/context/canonical Custom User Prompt scrubbing
is unchanged. No raw attachment URL, credential or content logging is allowed.
Downloads remain in the browser's default destination; no Root staging or change
to Root/report paths is introduced.

The helper bounds browser preparation to 89 seconds of work plus up to one second
of cleanup. FAB uses `(clampedModelSeconds + 120 + 10) * 1000` milliseconds, with
model seconds clamped to [60, 3600], 120 seconds of preparation allowance and
10 seconds (not milliseconds) of fallback grace. The Host model timeout is
unchanged. Host import uses one owned task and a cooperative five-second caller
wait. Timeout or a busy import skips this invocation's selected files; late
results are discarded. Caller cancellation propagates without releasing the
still-running import slot. This does not bound OS reads or executor shutdown;
existing startup/session refresh is also not fully bounded. These numbers do not
guarantee a Host-first or end-to-end completion deadline or cancellation.

A matching updated Host is necessary. No attachment capability or negotiation
was added to `get_capabilities`; existing version/integrity checks do not prove
support for this private action. An old runtime fails without a legacy-action
fallback. Source wiring does not qualify a frozen/installed runtime.

Host now emits nonempty wire `attachment_notice` in success `data` or the inner
Analyze error, mapped to stored/rendered `attachmentNotice`. It no longer prefixes
returned model Markdown/error text. Saved reports write the notice in their own
`Attachment Status` section, including skipped/unknown outcomes; known prompt-error
localization does not replace the separate notice. Before every send attempt,
after image qualification, Host supplies a fixed input-status summary when
nonempty, using frozen preparation and the qualified-image count. It asks the
model not to repeat status or claim omitted files were reviewed. This is
implemented source, not verified model compliance or end-to-end runtime behavior;
production runtime remains UNVERIFIED despite the focused offline milestones. See
[notice persistence](analysis-result-persistence.md#46-attachment-notices).

## Analyze Progress Contract

`host/analyze_progress.py::AnalyzeProgress` is a best-effort, request-local
projection, enabled only by integer `progressVersion: 1` in the inner
`analyze_error` payload, or `payload.analysis` for private attachment Analyze
(not the outer Native envelope). The Host emits exactly
`{requestId, status: 'progress', data}`. Progress never resolves/rejects Analyze,
changes its timeout, or establishes the final outcome; malformed events, delivery
failures and exhausted progress budgets do not stop model work.

The closed v1 `data` schema is enforced by the Host emitter and
[`parseAnalyzeProgress`](../../extension/src/utils/analyzeProgress.ts):

| Field | Accepted values |
|---|---|
| `version` | Exactly `1` |
| `seq` | Positive safe integer; Host increases it per request |
| `elapsedMs` | Non-negative safe integer; Host elapsed time is nondecreasing |
| `stage` | `prepare`, `session_resuming`, `session_creating`, `session_reused`, `session_ready`, `session_reconnecting`, `auth`, `agent`, `tool`, `response`, `report` |
| `state` | `running`, `succeeded`, `failed`, `unavailable`, `needs_auth` |
| `service` (optional) | `workiq`, `webiq`, `ado`, `mslearn`, `kusto`, `enghub`, `icm`, `research`, `filesystem`, `other` |
| `toolId` (optional) | `tool-` plus a positive decimal integer without leading zeros, at most 128 characters; only on `tool` events |
| `sessionId` (optional) | Canonical lowercase hyphenated UUID; only on `session_ready` with `state: 'succeeded'` |

`tool` requires both `service` and `toolId`. No other stage/state combination
restriction is enforced. The parser accepts only plain/null-prototype objects
with the listed own enumerable data properties, rejecting extra/symbol keys,
accessors and malformed values without coercion. `sessionId`, when emitted, is
the actual SDK session's canonical UUID, never a requested-ID fallback; a ready
event may omit it. Tool starts/completions expose only request-local `tool-N`
aliases and allowlisted service categories (`icm-mcp` maps to `icm`, unknown to
`other`), never real tool/server names, raw call IDs, arguments, results, URLs or
prompt content. Per request, the Host caps events at 4096, tool aliases at 1024
and active tools at 128; attempt-scoped listeners reject stale callbacks.

The Worker captures the originating same-extension sender's supported origin
(`https://onesupport.crm.dynamics.com`), tab, top frame (`frameId: 0`) and
`documentId` before any await. Progress must match the pending request and Native
port; structured events additionally require v1 opt-in. Delivery uses that exact
tab/frame/document only, with no active-tab fallback for Analyze. Missing targets
drop progress, not Analyze. `NATIVE_PROGRESS` is parsed again in the content script
and passed to FAB through `analyzeProgressChannel.ts`, an isolated-world module
channel, never a public DOM event bus. Legacy non-empty strings retain only known
fixed messages or the bounded `Copilot is analyzing (max N min)...` format;
unknown text becomes `Analysis in progress`, never raw display text.

FAB accepts events only for its current local request, ignores non-increasing
sequences, and does not let legacy text replace v1 progress. Page identity and
scan-generation gates control display, not retention of owned events. Intake
freezes at response receipt before the `hashCaseId` await; ownership still gates
the existing terminal path. The menu shows current phase, activity and optional
session UUID copy. Closing it preserves local progress; the status bubble is
optional. UI history keeps 40 events; active tools are tracked separately up to
128, with at most 40 shown and a remaining count. Elapsed is last-event elapsed,
not a live timer, ETA or percent. Progress has no storage or replay; a hydrated
pending request has no recovered details. See
[analysis persistence](analysis-result-persistence.md#43-read-paths).

`auth` describes Copilot authentication, not per-service MCP authentication or
wait detection. There is no cancellation, initialization-complete event,
meaningful tool-operation labeling or concurrent CLI-view guarantee. These are
not implied by a session UUID or successful progress phase.

## Limits

This boundary closes top-level metadata and serialization races without claiming
deep immutability of every ordinary Host payload. Descriptor checks may encounter
Proxy traps, but rejected data never reaches getters/conversion-based display,
logs, telemetry, persistence, or Native send. No task sequence, review allowance,
or execution authorization is encoded in this document.
