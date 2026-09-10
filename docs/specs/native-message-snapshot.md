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
3. Require own enumerable primitive-string `action`, not `analyze_error`.
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
accepts only a parsed Analyze result or guarded non-Analyze snapshot. It captures
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

## Limits

This boundary closes top-level metadata and serialization races without claiming
deep immutability of every ordinary Host payload. Descriptor checks may encounter
Proxy traps, but rejected data never reaches getters/conversion-based display,
logs, telemetry, persistence, or Native send. No task sequence, review allowance,
or execution authorization is encoded in this document.
