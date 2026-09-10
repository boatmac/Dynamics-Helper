# Update Completion Acknowledgment

## State Identity

The persisted `complete` variant contains exactly `kind`, `update`,
`transactionId`, and `outcome` (`committed` or `rolled-back`). Transaction ID is
required lowercase 32-hex, carried from the originating transaction through
finalization, parsing, storage, hydration, and broadcasts. Malformed/old-shape
completion fails closed; no compatibility migration is supplied for a prior shape.

Completion is not a transient per-component notification. It remains durable
until an eligible view acknowledges it through the Service Worker after
[eight continuous visible seconds](update-completion-visibility.md).
Mere mounting never grants consumption.

## Exact Message

```typescript
{ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: string }
```

Only these two own enumerable data properties are accepted. Extra/missing,
accessor, symbol, non-string, uppercase, or malformed identity input returns
`{handled:false}` without getter execution or state mutation. SW routes the
message through `updateRuntime.handleMessage`, not generic Native forwarding.

A valid message returns `{handled:true, state}`. UI ignores that response as
state authority; only persisted `DH_UPDATE_STATE` broadcasts drive live transition.

## Consumption Transition

| Current state | Matching ACK |
|---|---|
| `complete/committed` | Persist `idle`, removing the private candidate URL |
| `complete/rolled-back` | Persist `available` with the same candidate, preserving ordinary Retry |
| Different transaction or non-complete state | Idempotent no-op |

Every transition is serialized with the coordinator and persisted before its
projection/broadcast changes. Storage failure leaves completion unconsumed.
Duplicates, stale ACKs, and late timers cannot consume another transaction. A
later rollback Retry allocates a new ID; the old notice's timer has no authority.
`clearAvailable()` remains limited to available candidates, not completion.

## UI Authority

FAB and Options hydrate/render terminal state immediately. Their shared visible
epoch hook sends at most one ACK per eligible epoch, never writes update storage,
optimistically hides the notice, or applies an ACK reply. Hiding/unmount/replacement
cancels the epoch; transport failure needs a later fresh visible epoch to retry.

This is one global notification. The first eligible view whose matching ACK is
persisted consumes it for all views. Others cancel on authoritative departure
from complete; duplicate winners are harmless. Committed completion disappears;
rolled-back completion becomes ordinary available/Retry wording.

## References and Limits

- [Visibility eligibility and timer races](update-completion-visibility.md)
- [Coordinator parser and serialized ACK](../../extension/src/background/updateRuntime.ts)
- [SW ingress](../../extension/src/background/serviceWorker.ts)
- [Runtime and finalization](transactional-auto-update.md)

Host finalization ACK and UI completion ACK are distinct: the former settles
transaction evidence; the latter consumes the browser notice. This contract
changes neither Host rollback nor installer behavior and contains no deployment
procedure or qualification claim.
