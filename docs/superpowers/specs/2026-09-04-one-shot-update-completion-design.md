# One-Shot Update Completion Design

## Status

Approved design discovered during private Plan D qualification. Private candidate
`2.0.76-beta.1` completed a real transaction successfully but is disqualified
from publication because its success notice reappears on every FAB and Options
mount.

## Problem

`dh_update_state` persists `complete` after finalization acknowledgment. FAB and
Options are projection-only consumers, so every mount hydrates that same state
and renders the terminal notice again. The current state model has no durable
notification-consumption transition.

The real private qualification established that this is a UX lifecycle defect,
not an update failure:

- transaction `b1c2ad5ad2c4aeb59765302402450840` reached
  `complete/committed`;
- Host and Extension both reached `2.0.76-beta.1`;
- installation verification returned `packaged/verified`;
- active authority, transaction workspace, finalization cursor, and receipt were
  absent;
- finalization acknowledgment matched the transaction and target version; and
- Analyze and Options smoke checks passed.

The transaction ID is safe evidence. No private URL, case identity, prompt
content, or customer data belongs in the implementation or qualification record.

## Goal

Show each terminal update notice for eight seconds of actual mounted UI time,
then consume it durably through the Service Worker. A committed completion
becomes idle. A rolled-back completion becomes available so retry remains
possible without replaying the rollback notice on every mount.

## State Contract

Extend only the `complete` variant:

```typescript
Readonly<{
  kind: 'complete'
  update: UpdateCandidate
  transactionId: string
  outcome: 'committed' | 'rolled-back'
}>
```

`transactionId` is required, exact lowercase 32-hex, and survives parsing,
storage, hydration, and broadcasts. There is no legacy persisted `complete`
migration because `complete` was introduced only by the unpublished private
candidate. A malformed or old-shape `complete` remains fail-closed.

The acknowledgment transition is:

| Current state | Matching acknowledgment result |
|---|---|
| `complete/committed` | Persist and broadcast `idle` |
| `complete/rolled-back` | Persist and broadcast `available` with the same candidate |
| Any other state | No-op |
| Wrong, stale, or malformed transaction ID | No-op |

Committed acknowledgment removes the persisted candidate URL with the entire
state transition to `idle`. Rolled-back acknowledgment retains the candidate
only because it remains the retry input.

## Message Contract

Add one strict payload-free-style runtime message carrying only identity:

```typescript
{
  type: 'DH_UPDATE_ACK_COMPLETE'
  transactionId: string
}
```

The object must have exactly those two own enumerable data properties. Accessor,
symbol, extra-key, uppercase, missing, and non-string transaction IDs are
rejected as `{handled: false}` without invoking getters or mutating state.

The Service Worker routes the message only through `updateRuntime.handleMessage`.
FAB and Options never write `dh_update_state` directly.

For a valid message, the response is:

```typescript
{ handled: true, state: UpdateState }
```

The transition is serialized with every other coordinator action. Duplicate
acknowledgments are idempotent. A late timer from transaction A cannot consume
transaction B because it must match the currently stored
`complete.transactionId`. A rolled-back retry allocates a new transaction ID, so
the old timer cannot consume that retry's later completion either.

## UI Behavior

FAB and Options each follow the same rules:

1. Hydrate and render `complete` immediately.
2. Start an eight-second timer only while that component is mounted and the
   current state remains the same `complete.transactionId`.
3. On timeout, send `DH_UPDATE_ACK_COMPLETE` with that transaction ID.
4. Do not optimistically hide the notice.
5. Do not apply the ACK response to local state. The persisted
   `DH_UPDATE_STATE` broadcast is the only live transition authority.
6. Cancel the timer on unmount, transaction change, or departure from
   `complete`.

If the page closes before eight seconds, no acknowledgment occurs. The next
mount shows the notice and starts a fresh eight-second mounted-time interval.
This guarantees the user has an opportunity to see the result.

If storage or messaging fails, the terminal notice stays visible and retries on
a later mount. The UI must not claim consumption before the Service Worker
persists it.

Multiple FAB and Options instances may race. This is one global notification,
not one notification per view. Whichever mounted view first displays the same
completion for a full eight seconds sends the first matching acknowledgment,
performs the transition, and broadcasts it. Other views synchronize and hide the
terminal notice even if their own timers have not elapsed. Every later
acknowledgment sees a non-complete state and is an idempotent no-op.

For `complete/committed`, the banner/action disappears after acknowledgment. For
`complete/rolled-back`, the rollback wording disappears but the resulting
`available` state renders the ordinary update-available Retry action.

## Coordinator Construction

When finalization acknowledgment succeeds, create `complete` with the active
transaction's exact ID:

```typescript
await persist({
  kind: 'complete',
  update: transaction.update,
  transactionId: transaction.transactionId,
  outcome: receipt.outcome,
})
```

Every test fixture and parser case that constructs `complete` must carry a valid
transaction ID. `clearAvailable()` continues to affect only `available`; it does
not become a terminal-notice mechanism.

## Tests

Use fake timers for UI tests and preserve the Service Worker as sole storage
owner.

### Runtime Tests

- strict parsing accepts only the new exact `complete` shape;
- completion creation preserves the transaction ID;
- matching committed acknowledgment persists `idle` before broadcast;
- matching rolled-back acknowledgment persists `available` before broadcast;
- wrong/stale/malformed/duplicate acknowledgment is a no-op;
- storage failure leaves `complete` unchanged;
- a late acknowledgment cannot consume a newer completion;
- rolled-back acknowledgment still permits `start()` to allocate a new
  transaction.

### Service Worker Tests

- exact `DH_UPDATE_ACK_COMPLETE` routes to the coordinator;
- malformed metadata and accessor-backed messages are rejected without getter
  execution;
- generic `NATIVE_MSG` cannot forward or spoof the acknowledgment;
- all-tab broadcasts reflect the resulting state.

### FAB And Options Tests

- cold and live completion displays immediately;
- it remains visible before eight seconds;
- exactly one acknowledgment is sent at eight seconds;
- committed acknowledgment hides the terminal UI after authoritative state
  transition;
- rolled-back acknowledgment hides the terminal notice but preserves Retry;
- unmount before timeout sends no acknowledgment;
- transaction/state change cancels the old timer;
- failed acknowledgment keeps the notice visible;
- stale timer response cannot replace a newer state;
- multiple mounted projections are safe under duplicate acknowledgment.

For each new invariant, perform break-and-fail verification before restoring the
implementation.

## Qualification And Versioning

`2.0.76-beta.1` remains private and must not be tagged or published. The cloud PC
currently runs it and may be used as the new baseline after the fix is built.

The corrected candidate is `2.0.76-beta.2`. After implementation:

1. update the three authoritative version carriers to `2.0.76-beta.2`;
2. rerun complete Host and Extension suites and static gates;
3. build the corrected candidate exactly once;
4. validate the frozen Host, archive, capabilities, and SHA-256;
5. privately host the corrected ZIP;
6. run uninterrupted `beta.1 -> beta.2` and verify the notice disappears after
   eight seconds and stays gone across FAB/Options refresh;
7. rerun original-runner interruption recovery and matching-installer repair;
8. delete the private Blob and invalidate its SAS; and
9. request separate approval before tag, push, publication, or workload
   migration.

The earlier `beta.1` successful transaction remains useful evidence for the core
updater, but it is not release qualification for `beta.2`.

## Documentation

Update the Plan D runbook, result ledger, delivery plan, release notes, and agent
rules to describe one-shot completion acknowledgment and the disqualified
private `beta.1` candidate. Do not describe the real successful transaction as a
failed update.

## Non-Goals

- Changing Host transaction, journal, finalization, or installer behavior.
- Clearing terminal state through `update_not_available`.
- Allowing UI components to mutate update storage.
- Adding a manual close button in this iteration.
- Publishing `2.0.76-beta.1`.
- Reusing or restoring the deleted private `beta.1` Blob.
