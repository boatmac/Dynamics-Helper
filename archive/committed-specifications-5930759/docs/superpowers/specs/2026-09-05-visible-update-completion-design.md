# Visible Update Completion Design

## Context

The one-shot completion implementation added durable transaction identity,
strict acknowledgment routing, and an eight-second mounted timer. Final review
found two boundaries that the original design did not define:

1. FAB can mount while its menu is closed, its Status bubble is disabled, or its
   tab is hidden. A mounted-only timer can therefore consume a completion that
   the user never saw.
2. A real rollback restores the prior Extension before finalization. Rolling B2
   back to private B1 restores code that has neither `complete.transactionId`
   nor `DH_UPDATE_ACK_COMPLETE`, so that outcome cannot qualify B2's new
   one-shot rollback UI.

This amendment defines visible-time acknowledgment and truthful cross-version
rollback qualification. It does not change Host transaction or rollback logic.

## Decisions

- Completion acknowledgment requires eight continuous seconds of a real visible
  completion surface, not merely a mounted React component.
- Hiding the document or surface cancels the current interval. A later visible
  epoch starts a fresh eight seconds; elapsed time is not accumulated.
- After ACK transport failure, there is no retry loop during the same continuous
  visible epoch. A later hide/show epoch may retry after a fresh interval.
- Cloud Scenario 2 qualifies only a committed B2 recovery. Safe rollback to B1
  with complete interruption evidence is `SAFE_ROLLBACK_INCONCLUSIVE`; missing
  interruption evidence makes it `INTERRUPTION_EVIDENCE_INCONCLUSIVE`. At most
  three guarded attempts are allowed.

## Shared Visibility-Epoch Boundary

Add one focused hook, `useVisibleCompletionAck`, shared by FAB and Options. It
accepts:

```typescript
type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>
```

The hook also reads `document.visibilityState`. Its effective visibility is:

```typescript
transactionId !== null
  && surfaceVisible
  && document.visibilityState === 'visible'
```

For one transaction, a visibility epoch is the maximal continuous interval in
which that aggregate predicate remains true. A hand-off between menu and bubble
that leaves the OR expression true remains the same epoch and keeps its original
deadline. A true-to-false transition ends the epoch; the next false-to-true
transition starts a new one.

The hook listens for `visibilitychange` and maintains a monotonically increasing
visibility-epoch generation. The document listener synchronously invalidates the
current generation and clears its timer before scheduling React state. Component
surface and transaction changes invalidate the generation in a layout effect.
For each exact `{transactionId, generation}` that becomes effectively visible,
the hook schedules one 8,000 ms timeout. Cleanup cancels the timeout on:

- unmount;
- transaction change;
- surface becoming hidden;
- document becoming hidden; or
- authoritative departure from `complete`.

Cancellation is not the only race defense. Before sending, the timeout callback
must verify all of the following again:

- its captured generation is still current;
- its captured transaction is still current;
- aggregate surface visibility is still true; and
- `document.visibilityState` is still `visible`.

A stale callback after hide, replacement, or authoritative departure is a no-op.
At timeout it marks the current epoch attempted and sends exactly:

```typescript
{
  type: 'DH_UPDATE_ACK_COMPLETE',
  transactionId,
}
```

It never reads or writes update storage and never applies the response. It
handles both a synchronously thrown extension-context error and a rejected
Promise without changing UI. Marking the current visibility epoch attempted
before sending means rejection or `{handled:false}` cannot create an in-place retry loop.
The next false-to-true visibility transition increments the epoch and may make
one new attempt after a full eight seconds.

Equivalent state broadcasts with the same transaction do not restart a visible
epoch. Visibility loss always resets elapsed time rather than pausing it.

## FAB Visibility

FAB supplies `surfaceVisible=true` only when the current completion has a surface
the user can actually read:

- the FAB menu is open and renders the terminal update banner; or
- the Status bubble is visible and its completion binding equals the current
  completion transaction ID.

The closed FAB red dot is not a completion surface. A generic success/error
bubble is not a completion surface. If Status bubble is disabled and the menu is
closed, no ACK timer runs.

Opening the menu starts a fresh visibility epoch for cold hydration only when no
bound bubble already makes the aggregate predicate true. Opening or closing the
menu while a bound completion bubble keeps the aggregate predicate true does not
restart the deadline. Closing the menu ends the epoch only when no exact bound
bubble remains visible. An unrelated bubble replacement removes bubble
eligibility; the menu may still independently keep the aggregate predicate true.

Status bubble preference controls creation, not the truth of an already-visible
surface. If the preference was disabled before completion, no bubble is created.
If a bound completion bubble is already visible and the preference then changes,
the actually visible bubble remains eligible until it hides or is replaced.

Cold hydration continues not to force a Status bubble. This preserves the user
preference and avoids intrusive background notifications. The existing ten-
second bubble fallback remains wall-clock based. If an ACK attempt fails and the
bubble reaches that fallback before a later visibility epoch completes, it hides
normally. A later retry then requires opening the FAB menu; the fallback is not
reset and is not converted to visible-time accounting.

## Options Visibility

Options supplies `surfaceVisible=true` whenever its current state is `complete`,
because its terminal status is rendered directly in the page. The shared hook
still requires `document.visibilityState === 'visible'`, so a background Options
tab cannot consume the global notice.

Returning the tab to the foreground starts a fresh eight-second epoch. Leaving
it hidden for any duration discards prior elapsed time.

## Multiple Views

This remains one global notification. Any visible FAB or Options surface can win
after its own continuous eight-second epoch. The Service Worker persists and
broadcasts the transition; every other view cancels when it receives the
authoritative non-`complete` state.

Hidden or non-surface views never race. Simultaneous visible views can still send
duplicate ACKs; runtime identity and serialization keep those idempotent.

## Cross-Version Rollback Qualification

B2-to-B1 rollback is a valid safe updater outcome but not one-shot UI evidence:

- B1 restores the old completion state shape without transaction identity;
- B1 has no strict completion ACK route;
- B2 cannot migrate that old shape after B1 is restored; and
- adding compatibility code to unpublished B1 is impossible without building a
  different baseline artifact.

Therefore Scenario 2 uses these outcomes:

| Outcome | Qualification treatment |
|---|---|
| Recovery commits B2 | Continue all B2 completion, integrity, smoke, and one-shot checks; attempt may PASS |
| Recovery safely rolls back B1 | With complete interruption evidence record `SAFE_ROLLBACK_INCONCLUSIVE`; with missing interruption evidence record `INTERRUPTION_EVIDENCE_INCONCLUSIVE`. Verify matching B1 versions/integrity and the explicit terminal residue allowlist; do not claim one-shot rollback; attempt does not PASS or FAIL the updater |
| Recovery-required, mixed install, integrity mismatch, or unsafe residue | FAIL and stop |

A safe B1 rollback intentionally retains exactly one terminal artifact:
`updates/finalization-ack.json`, whose canonical bytes must match the captured
transaction, `rolled-back`, and terminal B1 version. Active authority, the entire
transaction and receipt namespace contents, cursor/scratch files, RunOnce,
status-host registration, update runner, and status-host processes must all be
absent. The `transactions` and `receipts` parent directories may be absent or
plain non-reparse directories with zero entries.

B1 also leaves the old-shape browser `complete/rolled-back` state. Before another
attempt, use a per-attempt guarded private-state cleanup. It must require:

- the captured attempt transaction ID and exact rolled-back finalization ACK;
- matching B1 Host/Extension versions and packaged integrity;
- exact old-shape state keys `{kind, update, outcome}` with no `transactionId`;
- `outcome: 'rolled-back'` and exact B2 candidate identity/strict HTTPS ZIP URL;
- only the allowed fixed ACK plus otherwise empty recovery residue.

Only then remove `dh_update_state`, normally Stop/wake the Worker through Options,
and require public/stored `idle` with no candidate URL. This is private
qualification-state cleanup, not product compatibility code.

An attempt begins when `DH_UPDATE_START` allocates and durably exposes a new
transaction ID. Setup failures before allocation do not consume an attempt and
must be corrected before start. Every started transaction consumes one of at
most three attempts:

| Started-attempt result | Disposition |
|---|---|
| Exact interruption, zero-executor proof, recovery witness, committed B2, and all B2 gates | `PASS` |
| Exact interruption/witness with safe B1 rollback | `SAFE_ROLLBACK_INCONCLUSIVE`; guarded cleanup, re-establish B1, retry if attempts remain |
| Safe B1 rollback but missed interruption, zero-executor proof, or recovery witness | `INTERRUPTION_EVIDENCE_INCONCLUSIVE`; use the same guarded B1 cleanup, re-establish B1, and retry if attempts remain |
| Safe committed B2 with every lifecycle/integrity/smoke gate passing but missing interruption, zero-executor, or recovery-witness evidence | First ACK the visible completion through the new protocol and require durable `idle`/no URL; then use the matching B1 installer to re-establish baseline and retry if attempts remain. Disposition: `INTERRUPTION_EVIDENCE_INCONCLUSIVE` |
| `preparing`/`activating` error, operator abort after transaction allocation, recovery-required, mixed install, integrity mismatch, unsafe residue, or failed B2 lifecycle/smoke gate | `FAIL`; count the attempt, settle only with the matching full installer and reviewed terminal/browser-state guard, stop qualification, and investigate. No next transaction is allowed in this run |

After three started transactions without a valid committed-B2 recovery, Scenario
2 is blocked. Record `BLOCKED: SAFE_ROLLBACK_INCONCLUSIVE` only when every one of
the three attempt dispositions is exactly `SAFE_ROLLBACK_INCONCLUSIVE`. If any
attempt is `INTERRUPTION_EVIDENCE_INCONCLUSIVE`, record
`BLOCKED: INTERRUPTION_EVIDENCE_INCONCLUSIVE`. Any `FAIL` stops immediately and
is never converted into a blocked/inconclusive result. Every attempt uses the
separately approved process/installer boundaries; no fourth attempt is
authorized.

Automated runtime and UI tests remain the release evidence for rolled-back
`complete/NEW_TX -> available/Retry` behavior within code that supports the new
protocol. A future B3 qualification may test that path end-to-end by rolling back
to fixed B2.

## Tests

### Shared Hook

- visible surface and visible document send one exact ACK at 8,000 ms;
- no ACK at 7,999 ms;
- hidden document sends no ACK;
- hiding at 4,000 ms and showing again requires a new full 8,000 ms;
- surface hide/show has the same reset behavior;
- same transaction/equivalent render does not restart the epoch;
- transaction replacement cancels the old epoch;
- a manually invoked stale callback after hide is a no-op;
- a manually invoked stale callback after transaction replacement is a no-op;
- a manually invoked stale callback after authoritative departure is a no-op;
- rejection and `{handled:false}` do not retry in place;
- synchronous `sendMessage` throws do not retry in place;
- hide/show after failure creates one new epoch and retry;
- unmount cancels the timer;
- ACK response is ignored.

### FAB

- cold completion with closed menu and no completion bubble sends no ACK;
- opening the menu starts the full interval;
- closing the menu cancels when no bound bubble is visible;
- disabled Status bubble plus closed menu never acknowledges;
- an exact bound completion bubble qualifies while the menu is closed;
- menu/bubble hand-offs that keep aggregate visibility true retain the deadline;
- disabling Status bubble after a bound bubble is already visible does not
  retroactively invalidate that actually visible surface;
- unrelated bubble replacement removes bubble eligibility;
- hidden-tab transitions reset the interval;
- authoritative departure cancels every visible epoch.
- after a failed ACK, the original bubble may reach its ten-second fallback;
  opening the menu afterward starts a fresh full eight-second retry epoch.

### Options

- visible foreground Options starts the interval;
- background Options sends no ACK;
- foreground-to-background-to-foreground resets the full interval;
- authoritative departure cancels the epoch.

### Cross-View

- hidden Options cannot beat a visible FAB;
- closed FAB cannot beat visible Options;
- first authoritative winner cancels every other timer;
- duplicate visible winners remain idempotent.

Document visibility is tested in isolated hook/component tests by replacing and
restoring the configurable `document.visibilityState` descriptor and dispatching
`visibilitychange`. Do not pretend two views in one jsdom document have different
visibility states. Cross-view authority is proven compositionally through each
view's visibility tests plus runtime idempotence and shared-broadcast tests.

Every new invariant requires break-and-fail verification.

## Documentation And Qualification

Update agent rules, architecture, developer/user guides, README, release notes,
runbook, ledger, and current plan to say "eight continuous visible seconds."
Remove mounted-only wording where it implies invisible consumption.

Cloud qualification does not require a cold FAB completion bubble. After reload,
the operator opens the FAB menu and observes its terminal banner. The Options
page is the designated foreground winning surface for the approximate cloud
integration interval; returning to the FAB verifies global disappearance and
non-replay. Status bubble may be observed if naturally present, but its preference
is not changed solely for qualification.

Runbook Scenario 2 must use the three-attempt state machine above. The ledger
needs an attempt table with only sanitized columns:
`Attempt`, `Transaction ID`, `Interruption`, `Recovery witness`, `Terminal
outcome`, `Versions/integrity`, `Residue`, and `Disposition`. Its scenario row
can be PASS only after one attempt commits B2 with complete interruption evidence
and all B2 gates pass.

Private distribution cleanup remains mandatory after PASS, FAIL, abort, or an
inconclusive three-attempt block, using the ownership-checked cleanup procedure.

The earlier one-shot completion spec and Plan D delivery design must each add an
`Amended by` notice pointing to this design. Their mounted-time wording and
rollback-PASS language are historical where this amendment differs.

## Non-Goals

- Changing Host rollback, transaction, finalization, or installer behavior.
- Adding backward compatibility for unpublished B1 completion state.
- Forcing Status bubble on when the user disabled it.
- Treating the FAB red dot as proof the terminal result was read.
- Adding production telemetry or a cloud timing harness.
- Building B3 in this iteration.
