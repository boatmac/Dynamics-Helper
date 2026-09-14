# Update Completion Visibility

## Eligibility

Completion consumption requires eight continuous seconds of a readable terminal
surface in a foreground document. Mounting, a hidden page, or a closed FAB red dot
is insufficient. This defines visibility eligibility, not proof of human attention.
The [completion acknowledgment contract](update-completion-acknowledgment.md) defines
strict ACK identity and the SW-owned durable transition.

## Shared Visibility Epoch

[useVisibleCompletionAck](../../extension/src/hooks/useVisibleCompletionAck.ts)
accepts `transactionId: string | null` and `surfaceVisible: boolean`. Effective
visibility is exactly:

```typescript
transactionId !== null
  && surfaceVisible
  && document.visibilityState === 'visible'
```

An epoch is the maximal continuous interval where this predicate stays true for
the same transaction. One timeout is scheduled for 8,000 ms, not 7,999 ms. Losing
visibility discards elapsed time rather than pausing/accumulating it. Equivalent
same-ID state broadcasts do not restart the epoch.

The document `visibilitychange` listener synchronously invalidates the generation
and cancels its timer before scheduling React state. Surface/transaction changes
invalidate in a layout effect. Unmount, transaction replacement, hidden surface,
hidden document, or authoritative departure from complete cancels the timer.

Cancellation alone is insufficient. Before sending, the callback rechecks its
timer/generation, captured transaction, actual aggregate surface visibility, and
current visible document. A stale callback is a no-op. Mark the epoch attempted
before sending exactly `{type:'DH_UPDATE_ACK_COMPLETE', transactionId}`.

Synchronous context errors, Promise rejection, and `{handled:false}` do not change
UI or create an in-place retry loop. A later hide/show epoch may attempt once
after a fresh full interval. The hook never reads/writes update storage and never
applies the ACK response.

## FAB Surfaces

The aggregate qualifying surface is either:

- an open menu rendering the current terminal update banner; or
- an actually visible Status bubble bound to the exact completion transaction.

The closed red dot and unrelated success/error bubbles never qualify. Disabled
Status bubble plus closed menu means no timer. A menu/bubble hand-off that keeps
the OR predicate true preserves the original deadline; closing the last qualifying
surface ends the epoch. Replacing the bubble with unrelated content removes its
eligibility, while an open terminal menu may remain eligible independently.

Status bubble preference controls creation, not the truth of an already-visible
bound surface. Disabling the preference after that bubble appears does not
retroactively hide/invalidate it. Cold hydration does not force a bubble.

The existing ten-second bubble fallback remains wall-clock based, not visible
time. After a failed ACK it may hide normally; it is neither reset nor prolonged
to force consumption. Opening the menu later can supply a fresh retry epoch.

## Options and Multiple Views

Options qualifies its rendered complete status only while the document is visible.
Returning from background starts a fresh eight seconds. Hidden Options cannot
consume the global notice ahead of a visible FAB, and a closed unqualified FAB
cannot beat visible Options.

Multiple visible views may send duplicate matching ACKs. The SW persists one
transition and broadcasts it; all views cancel on that authoritative non-complete
state. Neither UI timer nor ACK response is permission to hide optimistically.

## Version Boundary

Rollback restores the actual prior Extension. If that code lacks transaction-bound
completion/ACK support, a safe product rollback does not establish this newer
notice behavior. Updater recovery evidence is not UI protocol verification.

## Source References

- [FAB eligibility and bubble binding](../../extension/src/components/FAB.tsx)
- [Options terminal projection](../../extension/src/components/Options.tsx)
- [Coordinator ACK idempotence](../../extension/src/background/updateRuntime.ts)
- [Update runtime](transactional-auto-update.md)

This document contains no installation, private-state cleanup, attempt budget,
release recipe, or authorization carried from an earlier qualification.
