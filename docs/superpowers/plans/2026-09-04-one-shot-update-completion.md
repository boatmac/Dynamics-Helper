# One-Shot Update Completion Implementation Plan

> **Historical, superseded execution record:** September 5 replaced mounted-time
> behavior and implementation. Subsequent qualification is paused after B2's
> failed cloud trial. Read `docs/session-handoff-2026-07-15.md`; do not execute
> this file or interpret old approval/next-step statements as current authority.

> **Current amendment authority (2026-09-05):** Product implementation is
> governed by `docs/superpowers/plans/2026-09-05-visible-update-completion.md`.
> Destructive qualification remains deferred. A smaller post-implementation
> qualification design/plan must be written after product implementation and
> independent review, pending separate user approval.

> Historical workflow references do not require any skill or coding-agent tool.

**Goal:** Consume each terminal update notice once after eight seconds of mounted UI time while preserving Service Worker storage ownership and rolled-back retry behavior.

**Architecture:** Add the originating transaction ID to the persisted `complete` state and a strict `DH_UPDATE_ACK_COMPLETE` coordinator message. The Service Worker serially converts matching committed completion to `idle` and matching rolled-back completion to `available`; FAB and Options only start/cancel timers and send the acknowledgment. After tests pass, disqualify private beta1 in delivery records, bump the three authoritative carriers to `2.0.76-beta.2`, and rerun complete qualification.

**Tech Stack:** React 19, TypeScript 5.9, Chrome MV3 Service Worker, Vitest 3 fake timers, Python 3.13, PyInstaller 6.22.2.

---

## Safety Rules

- Do not change Host transaction, journal, finalization, installer, or archive behavior.
- Do not let FAB or Options write `dh_update_state`.
- Do not clear completion through `update_not_available`.
- Do not tag, push, publish, upload, install, or mutate the cloud PC while implementing Tasks 1-4.
- Private `2.0.76-beta.1` remains unpublished; its successful transaction is evidence, not release qualification.
- Use TDD and perform break-and-fail for every new completion invariant.

### Task 0: Commit The Reviewed Plan

**Files:**
- Create: `docs/superpowers/plans/2026-09-04-one-shot-update-completion.md`

- [ ] **Step 1: Verify plan-only worktree scope**

Require `git status --short` to show only this untracked plan. Stage it, then run
`git diff --cached --check` and require no output. Inspect
`git diff --cached --stat` and require only this plan.

- [ ] **Step 2: Commit the plan before implementation**

```powershell
git add -- "docs/superpowers/plans/2026-09-04-one-shot-update-completion.md"
```

```powershell
git commit -m "docs(plan): add one-shot completion implementation plan"
```

Require a clean worktree before Task 1.

### Task 1: Add Completion Identity And Coordinator Transition

**Files:**
- Modify: `extension/src/background/updateRuntime.ts`
- Modify: `extension/src/background/updateRuntime.test.ts`
- Modify: `extension/src/components/FAB.update.test.tsx` (fixture shape only)
- Modify: `extension/src/components/Options.update.test.tsx` (fixture shape only)

- [ ] **Step 1: Write the RED strict-completion parser test**

Update every valid `complete` fixture in `updateRuntime.test.ts`,
`FAB.update.test.tsx`, and `Options.update.test.tsx` to include a valid
`transactionId`; define `TX` in each UI test file and derive its transaction
fixture from that constant. Change no UI behavior in Task 1. Add a table
test proving the old shape plus uppercase, non-string, accessor-backed,
non-enumerable, extra, and symbol-key transaction metadata are rejected without
invoking a getter:

- `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata`.

```typescript
expect(parseUpdateState({
  kind: 'complete',
  update: candidate,
  outcome: 'committed',
})).toBeNull()

expect(parseUpdateState({
  kind: 'complete',
  update: candidate,
  transactionId: TX.toUpperCase(),
  outcome: 'committed',
})).toBeNull()
```

- [ ] **Step 2: Run the parser test RED, implement the strict shape, then run GREEN**

Run only the new parser test. Expected RED: old shape is accepted or a valid
fixture lacks the required ID. Change the `UpdateState` variant and
`parseUpdateState` as shown below, then rerun the same parser test and require
PASS. Do not run the whole runtime file until Step 4 adds completion identity at
the finalization construction site:

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts -t "rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata"
```

Change the state variant to:

```typescript
| Readonly<{
    kind: 'complete'
    update: UpdateCandidate
    transactionId: string
    outcome: 'committed' | 'rolled-back'
  }>
```

In `parseUpdateState`, parse `complete` separately from `available`, requiring exactly `kind`, `update`, `transactionId`, and `outcome`, and validate the ID with `parseTransactionId`.

- [ ] **Step 3: Write the RED finalization-construction test**

Rename the existing test to
`persists receipt before acknowledgment and completes once with the transaction identity`
and change its final state, storage, and completion-broadcast expectations to:

```typescript
expect(runtime.getState()).toEqual({
  kind: 'complete',
  update: candidate,
  transactionId: TX,
  outcome: 'committed',
})
```

Run the focused runtime file. Expected RED: finalization construction omits
`transactionId`.

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts
```

- [ ] **Step 4: Implement completion construction and run GREEN**

When finalization acknowledgment succeeds, persist:

```typescript
const complete = await persist({
  kind: 'complete',
  update: transaction.update,
  transactionId: transaction.transactionId,
  outcome: receipt.outcome,
})
```

Run the focused runtime file, both UI update files, and TypeScript no-emit;
require PASS before adding ACK behavior. This proves strict type migration did
not leave an old-shape fixture in a later task.

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts src/components/FAB.update.test.tsx src/components/Options.update.test.tsx
```

- [ ] **Step 5: Write RED strict ACK parsing and transition tests**

Add tests around the public runtime message handler:

```typescript
const committed = {
  kind: 'complete' as const,
  update: candidate,
  transactionId: TX,
  outcome: 'committed' as const,
}
seedStorage({ [UPDATE_STATE_KEY]: committed })
const runtime = createUpdateRuntime(runtimeDeps({ broadcast }))
await runtime.initialize({ resume: false })

await expect(runtime.handleMessage({
  type: 'DH_UPDATE_ACK_COMPLETE',
  transactionId: TX,
})).resolves.toEqual({ handled: true, state: { kind: 'idle' } })
expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' })
expect(broadcast).toHaveBeenLastCalledWith({ kind: 'idle' })
```

Cover:

- committed → `idle`;
- rolled-back → `available` with the same candidate;
- storage persistence occurs before in-memory transition and broadcast;
- wrong/stale transaction ID is a no-op;
- duplicate ACK is a no-op;
- malformed/extra/accessor-backed ACK is `{handled:false}` without getter execution;
- storage failure retains the original in-memory and stored `complete` state;
- ACK for completion A cannot consume completion B;
- a new runtime instance hydrates an exact completion with the same Worker
  version and keeps it available for ACK;
- rolled-back completion `OLD_TX` acknowledges to `available`, then `start()`
  allocates and persists distinct `NEW_TX`; a late `OLD_TX` acknowledgment
  cannot consume or alter the new transaction.

Use explicit identities in that test rather than `runtimeDeps()`'s default:

```typescript
const OLD_TX = '0123456789abcdef0123456789abcdef'
const NEW_TX = 'fedcba9876543210fedcba9876543210'
const createTransactionId = vi.fn(() => NEW_TX)
```

Assert the persisted `preparing.transactionId` and `perform_update` payload both
equal `NEW_TX` and `createTransactionId` ran once. After resolving the retry's
Host path, rehydrate a runtime from `complete/NEW_TX`; send `OLD_TX` and prove no
storage write or broadcast, then send `NEW_TX` and prove the new completion is
consumed. Testing only while state is `preparing` is insufficient because every
completion ACK is a no-op in a non-complete state.

Use these exact test names so every matrix mutation has one focused target:

- `rejects malformed completion ACK metadata without consuming state`;
- `transitions a matching committed completion ACK to idle`;
- `transitions a matching rolled-back completion ACK to available with the same candidate`;
- `waits for ACK persistence before changing memory or broadcasting`;
- `retains complete state when ACK persistence fails`;
- `treats wrong stale and duplicate completion ACKs as idempotent no-ops`;
- `does not let completion A acknowledgment consume current completion B`;
- `hydrates an exact same-version completion for acknowledgment`;
- `uses NEW_TX for a rolled-back retry and ignores a late OLD_TX completion ACK`.

- [ ] **Step 6: Run ACK tests RED**

Run:

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts
```

Confirm the new ACK tests fail because `DH_UPDATE_ACK_COMPLETE` is unhandled.

- [ ] **Step 7: Implement serialized acknowledgment and run GREEN**

Inside `handleMessage`, strictly parse the two-key object before dispatch. For a valid ID, serialize this transition:

```typescript
const messageType = exactObject(value, ['type'])
  ?? (() => {
    const snapshot = snapshotDataObject(value)
    return snapshot && snapshot.type === 'DH_UPDATE_ACK_COMPLETE'
      ? snapshot
      : null
  })()
const ack = exactObject(value, ['type', 'transactionId'])
if (messageType?.type === 'DH_UPDATE_ACK_COMPLETE') {
  if (!ack) {
    return Promise.resolve(Object.freeze({ handled: false as const }))
  }
  const transactionId = parseTransactionId(ack.transactionId)
  if (!transactionId) {
    return Promise.resolve(Object.freeze({ handled: false as const }))
  }
  return serialize(async () => {
    if (
      state.kind !== 'complete'
      || state.transactionId !== transactionId
    ) return Object.freeze({ handled: true as const, state })

    const next = state.outcome === 'committed'
      ? { kind: 'idle' as const }
      : { kind: 'available' as const, update: state.update }
    return Object.freeze({ handled: true as const, state: await persist(next) })
  })
}

// Preserve the existing exact one-key GET_STATE and START handling below.
```

Because an exact ACK with invalid ID reaches the branch but a malformed/extra
ACK makes `exactObject` return null, add a descriptor-safe `type` precheck (or an
equivalent small parser) so every object whose own data `type` equals
`DH_UPDATE_ACK_COMPLETE` returns `{handled:false}` when the exact two-key parse
fails. Do not fall through to the generic unhandled path or invoke accessors.

Do not modify `clearAvailable()`.

- [ ] **Step 8: Establish a complete focused GREEN baseline**

Run the entire runtime test file and this exact TypeScript command. Require PASS
before any deliberate mutation:

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

After break-and-fail restoration, run the complete Extension suite and require
all files/tests PASS before committing:

```powershell
npm --prefix extension run test:run
```

- [ ] **Step 9: Break-and-fail and restore GREEN**

Execute every Task 1 row in the required break-and-fail matrix below, restoring
each mutation immediately after its named test fails. Then run the full runtime
test file and require PASS.

- [ ] **Step 10: Commit Task 1**

Rerun the TypeScript command and `git diff --check`, requiring no output; stage
only the four listed files and commit:

```powershell
git add -- "extension/src/background/updateRuntime.ts" "extension/src/background/updateRuntime.test.ts" "extension/src/components/FAB.update.test.tsx" "extension/src/components/Options.update.test.tsx"
```

```powershell
git commit -m "fix(update): consume terminal completion by identity"
```

### Task 2: Route Strict Completion ACK Through The Service Worker

**Files:**
- Modify: `extension/src/background/serviceWorker.ts`
- Modify: `extension/src/background/serviceWorker.update.test.ts`

- [ ] **Step 1: Write the RED valid-route and broadcast tests**

For this helper, use `completionVersion = targetVersion` consistently. Call
`setManifestVersion(completionVersion)` and seed `dh_update_worker_version` with
that version so initialization does not
interpret this as an Extension-version transition. Seed the new exact committed
completion, queue a Native port before importing the Worker, answer its ordered
`get_capabilities` and `verify_installation` requests with matching
`packaged/verified` current-version data, and await `updateRuntimeReady`. Then
dispatch:

First update every valid `complete` fixture in
`serviceWorker.update.test.ts` to carry `transactionId: TX`.

```typescript
async function loadWorkerWithCompletion(completion: UpdateState) {
  const completionVersion = targetVersion
  setManifestVersion(completionVersion)
  setActiveTabs([{ id: 42 }, { id: 43 }])
  seedStorage({
    telemetryUserId: 'stable-test-user',
    dh_update_worker_version: completionVersion,
    [UPDATE_STATE_KEY]: completion,
  })
  const port = queueNativePort(MAIN_HOST)
  const importing = import('./serviceWorker')
  await vi.waitFor(() => expect(port.posted).toHaveLength(1))
  emitFinal(port, port.posted[0], {
    host_version: completionVersion,
    capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
  })
  await vi.waitFor(() => expect(port.posted).toHaveLength(2))
  emitFinal(port, port.posted[1], {
    mode: 'packaged',
    integrity: 'verified',
    host_version: completionVersion,
    extension_version: completionVersion,
  })
  const worker = await importing
  await worker.updateRuntimeReady
return { worker, port }
}
```

Import `type UpdateState` beside `UPDATE_STATE_KEY` for this helper.
Capture `storageSet`, runtime-broadcast, and tab-broadcast call counts after
`updateRuntimeReady`; ACK assertions compare deltas so initialization's worker
metadata write and any setup broadcasts cannot create false positives. The
broadcast test asserts exact `DH_UPDATE_STATE` delivery to tab IDs 42 and 43.

```typescript
await dispatchRuntimeMessage({
  type: 'DH_UPDATE_ACK_COMPLETE',
  transactionId: TX,
})
```

Require `handled:true`, resulting `idle`, storage mutation, and `DH_UPDATE_STATE` broadcast to runtime plus every tab.

Use these exact test names:

- `routes an exact DH_UPDATE_ACK_COMPLETE message to durable committed consumption`;
- `broadcasts persisted completion consumption to runtime and every tab`.

- [ ] **Step 2: Run valid-route RED, implement routing, then run GREEN**

Run:

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/serviceWorker.update.test.ts
```

Expected: ACK is ignored by the production listener.

Extend the coordinator message branch:

```typescript
if (
  messageType === 'DH_UPDATE_START'
  || messageType === 'DH_UPDATE_GET_STATE'
  || messageType === 'DH_UPDATE_ACK_COMPLETE'
) {
  updateRuntimeReady
    .then(() => updateRuntime.handleMessage(message))
    .then(sendResponse)
    .catch(() => sendResponse({ handled: false }))
  return true
}
```

Do not add payload forwarding or generic Native Host handling.

- [ ] **Step 3: Write RED malformed-route tests**

Add missing, uppercase, non-string, non-enumerable, extra, symbol-key, and
accessor-backed `transactionId` cases plus accessor-backed outer `type` and a
nested spoof through generic `NATIVE_MSG`. Getter spies must remain at zero;
state, storage, broadcasts, and Native traffic must remain unchanged. Use:

- `leaves completion untouched for malformed completion ACK metadata`;
- rename/update the existing `ignores accessor-backed runtime messages without invoking them`
  test to `returns handled false for invalid outer completion ACK metadata without invoking getters`
  and change its expected response from `undefined` to `{handled:false}`;
- `rejects nested completion ACK spoofing through NATIVE_MSG without Host forwarding`.

Run the focused Worker file. Expected RED: malformed routed ACKs may not receive
the strict response, and an accessor-backed outer `type` currently returns no
response.

- [ ] **Step 4: Implement safe outer rejection and run GREEN**

`ownDataProperty` already avoids getter execution. Before returning from the
listener on invalid `type`, detect that the object has an own `type` descriptor
whose data value is absent/invalid and call `sendResponse({handled:false})`, then
return `false`; do not invoke the descriptor. Preserve the existing undefined
response for unrelated primitives/objects without an own `type`. Routed
malformed ACKs continue through strict `updateRuntime.handleMessage` and return
`{handled:false}`.

```typescript
if (type.kind !== 'value' || typeof type.value !== 'string') {
  let hasOwnType = false
  try {
    hasOwnType = typeof message === 'object'
      && message !== null
      && !Array.isArray(message)
      && Object.getOwnPropertyDescriptor(message, 'type') !== undefined
  } catch {
    // A hostile proxy is not safe to classify or execute.
  }
  if (hasOwnType) sendResponse({ handled: false })
  return false
}
```

Run the focused Service Worker file and require every valid/malformed routing
test GREEN.

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/serviceWorker.update.test.ts
```

- [ ] **Step 5: Establish GREEN, then break-and-fail**

Execute every Task 2 row in the required break-and-fail matrix below, restoring
each mutation immediately after its named test fails. Then rerun both Service
Worker and runtime update tests and require PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- "extension/src/background/serviceWorker.ts" "extension/src/background/serviceWorker.update.test.ts"
```

```powershell
git commit -m "fix(extension): route completion acknowledgment"
```

### Task 3: Auto-Consume Completion From FAB And Options

**Files:**
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/FAB.update.test.tsx`
- Modify: `extension/src/components/Options.update.test.tsx`

- [ ] **Step 1: Add shared setup and GREEN cold/live characterization tests**

Verify the Task 1 `TX` constants and exact completion fixtures remain intact.
Add the cold/live rendering tests listed below in each component file. These are
GREEN characterization tests for existing hydration/live projection behavior;
if either fails, fix only a real projection regression before timer work.

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx
```

- [ ] **Step 2: Add RED exact-deadline and cancellation tests**

Use `vi.useFakeTimers()` per timer test and restore real timers afterward. Add
the exact-deadline, same-ID, unmount/remount, and state/transaction cancellation
tests independently in both files. Run both files and require RED because no ACK
timer exists.

For both components test:

- cold completion renders immediately;
- no ACK at 7,999 ms;
- exactly one exact message at 8,000 ms:

```typescript
{
  type: 'DH_UPDATE_ACK_COMPLETE',
  transactionId: TX,
}
```

- unmount before 8 seconds sends no ACK;
- a live state/transaction change cancels the old timer;
- ACK rejection, disconnect, or `{handled:false}` does not optimistically hide
  completion;
- committed `DH_UPDATE_STATE idle` hides terminal UI;
- rolled-back `DH_UPDATE_STATE available` removes rollback wording and keeps enabled Retry;
- a delayed ACK response is ignored and cannot replace a newer state;
- duplicate timers from FAB and Options are safe because neither applies the ACK response;
- equivalent broadcasts carrying the same completion transaction do not restart
  the eight-second mounted-time interval;
- FAB's separate live-completion status bubble is bound to the same transaction
  ID and disappears when the authoritative post-ACK broadcast leaves that
  completion, rather than surviving for its independent ten-second timeout;
- replacing that completion bubble with an unrelated status bubble clears the
  binding, so a later update-state broadcast cannot hide unrelated feedback.

Create each shared invariant independently in both component files. Use these
exact names, with `it.each` only for outcomes/cancellation/failure rows:

- `renders a cold committed or rolled-back completion immediately`;
- `renders a live committed or rolled-back completion immediately`;
- `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms`;
- `keeps the original ACK deadline across an equivalent same-ID rebroadcast`;
- `cancels ACK on unmount and requires a fresh 8 seconds after remount`;
- `cancels transaction A after state departure or replacement by transaction B`;
- `keeps completion visible after a rejected or handled-false ACK and retries only after remount`;
- `ignores a successful ACK response until an authoritative state broadcast`;
- `ignores a delayed ACK response after a newer authoritative state arrives`;
- `hides committed completion only after an authoritative idle broadcast`;
- `replaces rollback wording with an enabled ordinary available action after authoritative available broadcast`.

The exact-deadline assertion must filter the message log for ACKs, require zero
at 7,999 ms, then one at 8,000 ms with exact own keys
`['type', 'transactionId']`, exact values, no second ACK after more time, and no
UI storage mutation.

- [ ] **Step 3: Implement minimal FAB and Options ACK timers and run GREEN**

Implement the scalar-identity effects shown below independently in FAB and
Options. Do not apply ACK responses or access storage. Run both files and require
the exact-deadline/cancellation tests GREEN.

- [ ] **Step 4: Add RED authority/failure/race tests**

Add ACK rejection/handled-false, delayed response, committed idle, rolled-back
available, successful ACK-response non-authority, and cross-view race tests. For
both components explicitly resolve `{handled:true,state:{kind:'idle'}}` while no
`DH_UPDATE_STATE` broadcast occurs and require the same completion to remain
visible. Run both files and require RED only for
behavior not already supplied by the live state listeners. Make no production
change if an existing listener already passes a test.

Add cross-component tests in `FAB.update.test.tsx` named:

- `keeps FAB and Options on a newer authoritative state when simultaneous duplicate ACK responses race`;
- `cancels the later view timer when the first global ACK broadcast consumes completion`.

For cross-view tests, replace the current full `MenuLogic` mock with a partial
mock that preserves `mergeMenus`, `teamCacheIsCurrent`, and other Options exports
while overriding only `useMenuLogic`/`resolveDynamicUrl`. Likewise preserve
`DEFAULT_PREFS` and other prefs exports while overriding only `usePrefs`. Add
the same DnD and `MarkdownPreview` mocks used by `Options.update.test.tsx`.
Queue two FIFO `DH_UPDATE_GET_STATE` deferred responses, one per mounted view,
two FIFO `DH_UPDATE_ACK_COMPLETE` deferred responses, one per view, and one
`get_config` deferred response for Options before rendering both. Do not
change `chromeMock.ts` or make ACK responses auto-broadcast. Tests explicitly emit
authoritative `DH_UPDATE_STATE` messages. After fake timers start, prefer
synchronous `getBy*` assertions inside `act()` instead of polling `findBy*` or
`waitFor`, which can advance fake time.

- [ ] **Step 5: Run authority/failure/race tests GREEN**

Run:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx src/components/Options.update.test.tsx
```

Expected: every shared and cross-view test passes without treating ACK responses
as authority.

- [ ] **Step 6: Add RED FAB completion-bubble lifecycle tests**

Add these FAB-only tests:

- `hides the transaction-bound live completion bubble on the authoritative post-ACK broadcast`;
- `keeps an unrelated replacement bubble visible when completion later leaves state`;
- `keeps a live completion bubble visible through 9,999 ms without an authoritative transition`;
- `hides a live completion bubble at its 10,000 ms fallback without an authoritative transition`;
- `does not let a replaced completion timeout hide an unrelated bubble at the old deadline`;
- `ignores a captured stale completion callback after a persistent progress bubble replaces it`;
- `does not let a hidden completion callback affect later feedback`;
- `clears the completion bubble timer on unmount`.

Capture the old timeout callback with a timer spy, replace the completion with a
zero-duration progress bubble, manually invoke the stale callback, and require
the progress bubble to stay visible with no current timeout handle. Use timer
spies or post-unmount state-warning detection to prove cleanup. Run the
FAB file and require RED where the current independent ten-second timer lacks
identity/timer-reset behavior.

- [ ] **Step 7: Implement the FAB completion-bubble lifecycle**

Derive a stable scalar identity:

```typescript
const completionTransactionId = updateState.kind === 'complete'
  ? updateState.transactionId
  : null
```

Place this scalar after `updateState` in each component. Add the effect beside
the existing update projection effect in FAB and beside the existing
`DH_UPDATE_STATE` listener effect in Options.

The ACK effect already added in Step 3 remains keyed only by scalar identity;
equivalent broadcasts must not restart the eight-second interval:

```typescript
useEffect(() => {
  if (!completionTransactionId) return
  const timer = window.setTimeout(() => {
    void chrome.runtime.sendMessage({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: completionTransactionId,
    }).catch(() => undefined)
  }, 8_000)
  return () => window.clearTimeout(timer)
}, [completionTransactionId])
```

Do not call `setUpdateState` from the ACK promise and do not access storage.

Bind only a completion-created FAB status bubble to its transaction. Extend
`showStatusBubble` with an optional completion identity, assign the ref to that
identity or `null` whenever a bubble replaces the current one, and compare it
with every authoritative live projection before announcing the next state.
Move `showStatusBubble` above the update projection effect or convert it to a
hoisted function declaration so the effect can call it without a temporal-dead-
zone dependency. Keep `latestTranslationRef` for live translations:

```typescript
const completionStatusTransactionIdRef = React.useRef<string | null>(null)

const nextCompletionTransactionId = next.kind === 'complete'
  ? next.transactionId
  : null
if (
  completionStatusTransactionIdRef.current
  && completionStatusTransactionIdRef.current !== nextCompletionTransactionId
) {
  completionStatusTransactionIdRef.current = null
  if (statusTimeoutRef.current) {
    window.clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = null
  }
  setStatusBubble(previous => ({ ...previous, visible: false }))
}
```

Extend `showStatusBubble` to capture the optional identity per invocation:

```typescript
const showStatusBubble = (
  text: string,
  type: 'default' | 'success' | 'error' = 'default',
  autoHideDuration = 3000,
  completionTransactionId: string | null = null,
) => {
  if (!latestPrefsRef.current.enableStatusBubble) return
  if (statusTimeoutRef.current) {
    clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = null
  }
  completionStatusTransactionIdRef.current = completionTransactionId
  setStatusBubble({ visible: true, text, type })
  if (autoHideDuration > 0) {
    const timeoutIdentity = completionTransactionId
    const timeoutId = setTimeout(() => {
      if (statusTimeoutRef.current !== timeoutId) return
      statusTimeoutRef.current = null
      if (completionStatusTransactionIdRef.current === timeoutIdentity) {
        completionStatusTransactionIdRef.current = null
      }
      setStatusBubble(previous => ({ ...previous, visible: false }))
    }, autoHideDuration)
    statusTimeoutRef.current = timeoutId
  }
}
```

When `applyProjection` handles live `complete`, call
`showStatusBubble(text, type, 10_000, next.transactionId)`. Every other call
keeps the default `null`, which breaks the old binding immediately.

Pass `next.transactionId` only when announcing `next.kind === 'complete'`.
Ordinary Analyze, SAP, clipboard, available-update, and error bubbles pass no
completion identity and must not be hidden by a later completion ACK. Keep the
ten-second timeout as a fallback only; the authoritative `idle`/`available`
broadcast normally clears the transaction-bound bubble at eight seconds. Clear
the ref when its own timeout fires only if it still matches the timeout's
captured identity and set `statusTimeoutRef.current = null`. Tighten that ref to
`React.useRef<ReturnType<typeof setTimeout> | null>(null)`. On component unmount, clear both `statusTimeoutRef` and the
completion identity ref so the independent fallback callback cannot fire after
unmount.

Audit every direct `setStatusBubble(...visible:false)` site. Route it through a
small `hideStatusBubble()` helper that clears the current timeout handle and
completion binding before hiding, except where a test proves the call is paired
with an immediate replacement. This prevents page-scan/identity/auto-analyze
hides from leaving a stale completion timeout or binding.

```typescript
useEffect(() => () => {
  if (statusTimeoutRef.current) {
    clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = null
  }
  completionStatusTransactionIdRef.current = null
}, [])
```

- [ ] **Step 8: Run all UI tests GREEN before mutation testing**

Run both UI files, TypeScript no-emit, and the combined cross-view tests. Require
PASS before deliberate mutations.

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx src/components/Options.update.test.tsx
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

- [ ] **Step 9: Break-and-fail and restore GREEN**

Execute every Task 3 row in the required break-and-fail matrix below, restoring
each mutation immediately after its named test fails. Then run both focused UI
files and require PASS.

After the matrix, rerun the exact combined UI and TypeScript commands from Step
8; do not commit from per-test GREEN alone.

- [ ] **Step 10: Run all update-focused Extension tests**

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts src/background/serviceWorker.update.test.ts src/components/FAB.update.test.tsx src/components/Options.update.test.tsx src/content/updateErrorBridge.test.ts src/background/analyzeRequestHandler.test.ts
```

- [ ] **Step 11: Commit Task 3**

```powershell
git add -- "extension/src/components/FAB.tsx" "extension/src/components/FAB.update.test.tsx" "extension/src/components/Options.tsx" "extension/src/components/Options.update.test.tsx"
```

```powershell
git commit -m "fix(ui): make update completion notice one-shot"
```

### Required Break-And-Fail Matrix

Each row represents a distinct new invariant. Make one temporary production-code
mutation at a time, run the named focused test and require FAIL for the stated
reason, restore the mutation, and require PASS before continuing. Record the
concise RED/PASS result in `.superpowers/sdd/plan-d-reliable-update-progress.md`;
never stage deliberately broken code or the ignored progress log.

For each row, run the exact command matching its Task/file after the temporary
mutation. The named test in the row must be among the failures for the expected
reason; restore immediately and rerun the same command to PASS:

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/updateRuntime.test.ts
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/serviceWorker.update.test.ts
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx
```

| Task | Invariant | Temporary production mutation | Focused test that must fail |
|---|---|---|---|
| 1 | Missing completion identity is rejected | Return a parsed `complete` object when `transactionId` is absent | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Uppercase completion identity is rejected | Lowercase the ID before `parseTransactionId` | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Non-string completion identity is rejected | Coerce `{toString: () => TX}` before validation | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Accessor completion identity is not invoked | Read `value.transactionId` directly | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Non-enumerable completion identity is rejected | Accept non-enumerable descriptors in `snapshotDataObject` | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Extra completion metadata is rejected | Permit one extra string key | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Symbol completion metadata is rejected | Ignore symbol descriptors | `rejects a complete state with missing, invalid, accessor, extra, or symbol identity metadata` |
| 1 | Finalization preserves identity | Omit `transactionId` when constructing `complete` | `persists receipt before acknowledgment and completes once with the transaction identity` |
| 1 | ACK accessor is not invoked | Read `value.transactionId` directly | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK missing ID is rejected | Treat missing `transactionId` as the current ID | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK uppercase ID is rejected | Lowercase the ID before validation | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK non-string ID is rejected | Coerce `{toString: () => TX}` before validation | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK non-enumerable ID is rejected | Accept non-enumerable descriptors | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK extra metadata is rejected | Permit an extra string key | `rejects malformed completion ACK metadata without consuming state` |
| 1 | ACK symbol metadata is rejected | Ignore symbol descriptors | `rejects malformed completion ACK metadata without consuming state` |
| 1 | Committed transition | Keep `complete` instead of persisting `idle` | `transitions a matching committed completion ACK to idle` |
| 1 | Rolled-back retry projection | Persist `idle` instead of `available` | `transitions a matching rolled-back completion ACK to available with the same candidate` |
| 1 | Memory waits for persistence | Assign in-memory state before the deferred storage write settles | `waits for ACK persistence before changing memory or broadcasting` |
| 1 | Broadcast waits for persistence | Broadcast before the deferred storage write settles | `waits for ACK persistence before changing memory or broadcasting` |
| 1 | Persistence failure is non-consuming | Swallow the rejected storage write and advance state | `retains complete state when ACK persistence fails` |
| 1 | Wrong/stale identity is a no-op | Remove transaction equality validation | `treats wrong stale and duplicate completion ACKs as idempotent no-ops` |
| 1 | Duplicate ACK is a no-op | Treat non-complete state as a new completion | `treats wrong stale and duplicate completion ACKs as idempotent no-ops` |
| 1 | Completion A cannot consume B | Compare against the request only, not current completion identity | `does not let completion A acknowledgment consume current completion B` |
| 1 | Same-version restart preserves completion | Clear every completion during `initialize` regardless of Worker version | `hydrates an exact same-version completion for acknowledgment` |
| 1 | Rolled-back retry gets a fresh identity | Reuse `OLD_TX` instead of injected `NEW_TX` | `uses NEW_TX for a rolled-back retry and ignores a late OLD_TX completion ACK` |
| 2 | Dedicated strict route | Remove `DH_UPDATE_ACK_COMPLETE` from the coordinator branch | `routes an exact DH_UPDATE_ACK_COMPLETE message to durable committed consumption` |
| 2 | Outer accessor metadata receives safe rejection | Return before `sendResponse({handled:false})` for invalid own `type` | `returns handled false for invalid outer completion ACK metadata without invoking getters` |
| 2 | Routed missing ID is rejected | Fill missing ID with `TX` before runtime parsing | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed uppercase ID is rejected | Lowercase the ID before runtime parsing | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed non-string ID is rejected | Coerce `{toString: () => TX}` before runtime parsing | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed non-enumerable ID is rejected | Copy a non-enumerable ID into a new enumerable object | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed extra metadata is rejected | Strip an extra string key before runtime parsing | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed symbol metadata is rejected | Strip symbol keys before runtime parsing | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Routed getter remains uncalled | Read outer `transactionId` directly in Service Worker | `leaves completion untouched for malformed completion ACK metadata` |
| 2 | Generic forwarding cannot spoof ACK | Route nested ACK through `NATIVE_MSG` | `rejects nested completion ACK spoofing through NATIVE_MSG without Host forwarding` |
| 2 | Runtime broadcast follows persisted transition | Suppress `chrome.runtime.sendMessage` broadcast | `broadcasts persisted completion consumption to runtime and every tab` |
| 2 | Every tab receives persisted transition | Suppress `chrome.tabs.sendMessage` broadcast | `broadcasts persisted completion consumption to runtime and every tab` |
| 3 FAB | Cold completion renders | Suppress hydration-applied `complete` | `renders a cold committed or rolled-back completion immediately` |
| 3 Options | Cold completion renders | Suppress hydration-applied `complete` | `renders a cold committed or rolled-back completion immediately` |
| 3 FAB | Live completion renders | Drop live `complete` broadcasts | `renders a live committed or rolled-back completion immediately` |
| 3 Options | Live completion renders | Drop live `complete` broadcasts | `renders a live committed or rolled-back completion immediately` |
| 3 FAB | Exact mounted deadline | Change delay to `7_999` | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 Options | Exact mounted deadline | Change delay to `7_999` | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 FAB | Exactly one ACK | Send the same ACK twice from the timeout callback | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 Options | Exactly one ACK | Send the same ACK twice from the timeout callback | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 FAB | Exact ACK payload | Add an extra key to the ACK object | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 Options | Exact ACK payload | Add an extra key to the ACK object | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 FAB | UI never owns update storage | Add a `chrome.storage.local.set` beside the ACK send | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 Options | UI never owns update storage | Add a `chrome.storage.local.set` beside the ACK send | `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` |
| 3 FAB | Unmount cancellation | Remove timer cleanup | `cancels ACK on unmount and requires a fresh 8 seconds after remount` |
| 3 Options | Unmount cancellation | Remove timer cleanup | `cancels ACK on unmount and requires a fresh 8 seconds after remount` |
| 3 FAB | State-departure cancellation | Keep the old timer after leaving `complete` | `cancels transaction A after state departure or replacement by transaction B` |
| 3 Options | State-departure cancellation | Keep the old timer after leaving `complete` | `cancels transaction A after state departure or replacement by transaction B` |
| 3 FAB | Transaction-replacement cancellation | Keep A's timer after switching to completion B | `cancels transaction A after state departure or replacement by transaction B` |
| 3 Options | Transaction-replacement cancellation | Keep A's timer after switching to completion B | `cancels transaction A after state departure or replacement by transaction B` |
| 3 FAB | Equivalent state is timer-stable | Depend on the complete object rather than scalar transaction ID | `keeps the original ACK deadline across an equivalent same-ID rebroadcast` |
| 3 Options | Equivalent state is timer-stable | Depend on the complete object rather than scalar transaction ID | `keeps the original ACK deadline across an equivalent same-ID rebroadcast` |
| 3 FAB | Rejected ACK does not hide | Hide locally in the rejection path | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 Options | Rejected ACK does not hide | Hide locally in the rejection path | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 FAB | Handled-false ACK does not hide | Hide locally for `{handled:false}` | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 Options | Handled-false ACK does not hide | Hide locally for `{handled:false}` | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 FAB | Failed ACK does not loop in-place | Restart the timer from the ACK rejection handler | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 Options | Failed ACK does not loop in-place | Restart the timer from the ACK rejection handler | `keeps completion visible after a rejected or handled-false ACK and retries only after remount` |
| 3 FAB | ACK response is not authority | Apply the ACK promise result with `setUpdateState` | `ignores a delayed ACK response after a newer authoritative state arrives` |
| 3 Options | ACK response is not authority | Apply the ACK promise result with `setUpdateState` | `ignores a delayed ACK response after a newer authoritative state arrives` |
| 3 FAB | Immediate successful ACK response is not authority | Apply `{handled:true,state}` locally | `ignores a successful ACK response until an authoritative state broadcast` |
| 3 Options | Immediate successful ACK response is not authority | Apply `{handled:true,state}` locally | `ignores a successful ACK response until an authoritative state broadcast` |
| 3 FAB | Committed global consumption | Ignore authoritative `idle` | `hides committed completion only after an authoritative idle broadcast` |
| 3 Options | Committed global consumption | Ignore authoritative `idle` | `hides committed completion only after an authoritative idle broadcast` |
| 3 FAB | Rolled-back global retry | Hide all update UI on authoritative `available` | `replaces rollback wording with an enabled ordinary available action after authoritative available broadcast` |
| 3 Options | Rolled-back global retry | Hide all update UI on authoritative `available` | `replaces rollback wording with an enabled ordinary available action after authoritative available broadcast` |
| 3 Cross-view | Duplicate mounted views are idempotent | Make FAB apply its ACK response locally | `keeps FAB and Options on a newer authoritative state when simultaneous duplicate ACK responses race` |
| 3 Cross-view | Either response cannot override authority | Make Options apply its ACK response locally | `keeps FAB and Options on a newer authoritative state when simultaneous duplicate ACK responses race` |
| 3 Cross-view | First global ACK cancels later timer | Retain the later view timer after authoritative `idle` | `cancels the later view timer when the first global ACK broadcast consumes completion` |
| 3 FAB | Completion bubble follows committed authority | Remove the completion identity clear for authoritative `idle` | `hides the transaction-bound live completion bubble on the authoritative post-ACK broadcast` |
| 3 FAB | Completion bubble follows rollback authority | Clear only on `idle`, not authoritative `available` | `replaces rollback wording with an enabled ordinary available action after authoritative available broadcast` plus bubble assertion |
| 3 FAB | Unrelated bubbles remain independent | Retain the old completion binding when another bubble replaces it | `keeps an unrelated replacement bubble visible when completion later leaves state` |
| 3 FAB | Completion fallback waits 10 seconds | Change the completion bubble fallback to `9_999` | `keeps a live completion bubble visible through 9,999 ms without an authoritative transition` |
| 3 FAB | Completion fallback eventually hides | Disable the completion bubble fallback timeout | `hides a live completion bubble at its 10,000 ms fallback without an authoritative transition` |
| 3 FAB | Replaced timeout cannot hide new bubble | Stop cancelling/reidentifying the prior completion timeout | `does not let a replaced completion timeout hide an unrelated bubble at the old deadline` |
| 3 FAB | Stale timeout callback cannot clear a newer handle | Remove the captured timeout-handle equality guard | `ignores a captured stale completion callback after a persistent progress bubble replaces it` |
| 3 FAB | Zero-duration replacement nulls old handle | Clear the old timeout without nulling `statusTimeoutRef.current` | `ignores a captured stale completion callback after a persistent progress bubble replaces it` |
| 3 FAB | Direct hide clears completion timer | Leave page-identity/direct hide on raw `setStatusBubble` | `does not let a hidden completion callback affect later feedback` |
| 3 FAB | Bubble timeout is cleared on unmount | Omit `statusTimeoutRef` cleanup from unmount | `clears the completion bubble timer on unmount` |

### Task 4: Align Documentation And Record Private Beta1 Evidence

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `README.md`
- Modify: `USER_GUIDE.md`
- Modify: `docs/plan-d-pragmatic-cloud-pc-runbook.md`
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md`
- Modify: `docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored; never stage)

- [ ] **Step 1: Document the state/message contract**

Apply this exact per-file responsibility map:

- `AGENTS.md`: extend **Production coordination** with required
  `complete.transactionId`, exact `DH_UPDATE_ACK_COMPLETE`, persistence before
  broadcast, committed → idle/private-URL removal, rolled-back → available,
  stale/duplicate no-op, and UI no-storage/no-response-authority rules.
- `ARCHITECTURE.md`: add the terminal completion/ack state transition and show
  Service Worker as the sole persistence owner and `DH_UPDATE_STATE` as the sole
  live UI authority.
- `DEVELOPER_GUIDE.md`: add implementation/test guidance for scalar identity,
  mounted-time timer cancellation, duplicate-view races, status-bubble binding,
  and per-invariant break-and-fail.
- `USER_GUIDE.md`: state that update success/rollback is shown for eight mounted
  seconds, then disappears globally; rollback returns to ordinary Retry.
- `README.md`: update the public Reliable Updates overview with the same concise
  one-shot eight-mounted-second behavior.
- `docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md` and its
  design spec: replace beta1 publication intent with beta2 qualification and
  one-shot completion acceptance, while retaining beta1 only as historical
  private evidence.
- `releases/notes-prompt-scope-cleanup-draft.md`: identify beta2 and describe the
  one-shot completion fix without claiming qualification before it passes.
- `.superpowers/sdd/plan-d-reliable-update-progress.md`: record concise task,
  review, break-and-fail, and gate outcomes; never stage it.

- [ ] **Step 2: Record the real beta1 transaction accurately**

In the result ledger, rename artifact B to `B1 (historical, disqualified)`, keep
its existing commit/hash, and add a sanitized historical transaction table with
transaction `b1c2ad5ad2c4aeb59765302402450840`: committed, matching beta1
Host/Extension, packaged/verified, terminal workspace/cursor/receipt absent,
matching finalization ACK, Analyze PASS, Options PASS, and qualification result
DISQUALIFIED because the completion notice replayed permanently. Add a new B2
artifact row for `2.0.76-beta.2` with source commit/hash/result initially
`PENDING`; keep all three formal Scenario rows `PENDING` until beta2 execution.

Do not include the test-case identity, private URL, Azure resource names, account, or logs.

- [ ] **Step 3: Document runbook candidate restart and completion checks**

This step edits documentation only. Do not run any cloud-PC, DevTools, storage,
process, installer, or Azure command while completing Task 4. Execution occurs
only in Task 5 after the matching explicit approval gate.

In the runbook, change the formal qualification matrix from A/B to B1/B2:

| Role | Version | Use |
|---|---|---|
| Historical A | `2.0.74-beta.4` | retained evidence only; not rerun |
| B1 baseline | `2.0.76-beta.1` | installed cloud-PC start and rollback prior |
| B2 target | `2.0.76-beta.2` | new private candidate, committed target, matching installer |

Replace every executable baseline/target path, expected version, candidate
version, watcher prior/target assertion, installer path, and Scenario 1/2/3
acceptance accordingly. Preserve the already-correct seed → Stop Worker → Options wake flow. Replace
manual terminal-state cleanup for all new beta2 transactions with the
eight-second ACK expectation. Require the notice and FAB completion bubble to
disappear globally and remain absent across FAB/Options refresh,
`DH_UPDATE_GET_STATE` to become `idle` after committed completion, and
`hasUpdateUrl:false`.

Add one narrowly scoped pre-beta2 exception for the cloud PC's already-persisted,
unpublished beta1 old-shape completion. Before deleting it, require matching
beta1 Host/Extension versions, `packaged/verified`, and absence of active
authority, transaction workspace, finalization cursor/receipt, runner, and
RunOnce/status-Host registration. The sole executable authority is the committed
runbook section `## One-Time Private B1 Completion Cleanup`; this plan does not
duplicate its commands. Task 5 must independently review that section after B2
identity is filled, then execute it only under the explicit cloud-PC storage/
Worker authorization. It requires exact known B1 finalization evidence, strict
old-shape candidate validation, zero recovery residue, removal of only
`dh_update_state`, normal Worker Stop/Options wake, and final idle/no-URL state.
Any mismatch preserves evidence. This is unpublished-test-state cleanup, never a
product migration or compatibility path.

- [ ] **Step 4: Verify, independently review, and commit docs**

Run the exact non-disclosing scan and `git diff --check`; both must produce no
output. Dispatch a documentation/runbook reviewer and fix all Critical/Important
findings before staging. Also run these exact concept checks and require every
command to return at least one intended line:

```powershell
git grep -n "DH_UPDATE_ACK_COMPLETE" -- AGENTS.md ARCHITECTURE.md DEVELOPER_GUIDE.md
```

```powershell
git grep -n -E "eight|8.second|mounted" -- README.md USER_GUIDE.md DEVELOPER_GUIDE.md docs/plan-d-pragmatic-cloud-pc-runbook.md
```

```powershell
git grep -n -E "2\.0\.76-beta\.1|2\.0\.76-beta\.2|DISQUALIFIED" -- docs/plan-d-pragmatic-cloud-pc-results.md releases/notes-prompt-scope-cleanup-draft.md
```

```powershell
if(Select-String -Path "docs/plan-d-pragmatic-cloud-pc-results.md","releases/notes-prompt-scope-cleanup-draft.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found in evidence/output docs'}
```

The runbook and delivery plans intentionally contain reviewed URL/SAS command
templates, so do not run the evidence regex against them. Inspect their staged
diffs directly and reject any concrete account, container, tenant, subscription,
token, customer, case, prompt, or log value.

```powershell
git add -- "AGENTS.md" "ARCHITECTURE.md" "DEVELOPER_GUIDE.md" "README.md" "USER_GUIDE.md" "docs/plan-d-pragmatic-cloud-pc-runbook.md" "docs/plan-d-pragmatic-cloud-pc-results.md" "docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md" "docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md" "releases/notes-prompt-scope-cleanup-draft.md"
```

```powershell
git commit -m "docs(update): define one-shot completion lifecycle"
```

### Task 5: Prepare And Qualify `2.0.76-beta.2`

> **Superseded Scenario 2 procedure:** Do not execute this historical Task 5.
> Its Scenario 2 state machine must be redesigned after visible-completion
> product implementation and independent review are complete. A smaller
> post-implementation qualification design/plan is pending separate user approval;
> only after approval may that future work update and commit
> `docs/plan-d-pragmatic-cloud-pc-runbook.md`. Versioning, artifact creation,
> installation, and qualification still require their own approval.

**Files:**
- Modify: `extension/package.json`
- Modify: `extension/manifest.json`
- Modify: `host/product_info.py`
- Modify after the beta2 artifact exists: `docs/plan-d-pragmatic-cloud-pc-runbook.md`
- Modify after gates: `docs/plan-d-pragmatic-cloud-pc-results.md`

- [ ] **Step 1: Obtain explicit beta2 versioning approval**

Show the completed fix commits and focused tests. Approval of this plan is not approval to version, build, upload, install, tag, push, or publish beta2.

- [ ] **Step 2: Bump only the three authoritative carriers**

First prove the exact beta2 carrier assertion is RED:

```powershell
$priorPythonPath=$env:PYTHONPATH;$carrierExit=0;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import json;from pathlib import Path;from product_info import VERSION;p=json.loads(Path('extension/package.json').read_text(encoding='utf-8'));m=json.loads(Path('extension/manifest.json').read_text(encoding='utf-8'));assert VERSION==p['version']==(m.get('version_name') or m['version'])=='2.0.76-beta.2';assert m['version']=='2.0.76'";$carrierExit=$LASTEXITCODE}finally{$env:PYTHONPATH=$priorPythonPath};if($carrierExit -ne 0){throw "Carrier assertion failed: $carrierExit"}
```

Expected before the bump: nonzero `AssertionError`. After explicit versioning
approval, update only package and Host to `2.0.76-beta.2`; Chrome `version` to
`2.0.76` and `version_name` to `2.0.76-beta.2`:

```powershell
& "host/venv/Scripts/python.exe" -c "import release_helper as r;r.update_json_version(r.PACKAGE_JSON,'2.0.76-beta.2');r.update_chrome_manifest_version(r.MANIFEST_JSON,'2.0.76-beta.2');r.update_python_version(r.HOST_FILE,'2.0.76-beta.2')"
```

Rerun the carrier assertion and require exit `0` with no output. Require
`git diff --name-only` to list exactly `extension/manifest.json`,
`extension/package.json`, and `host/product_info.py`. Stage those three files
only, then commit:

```powershell
git add -- "extension/package.json" "extension/manifest.json" "host/product_info.py"
```

```powershell
git commit -m "chore: prepare v2.0.76-beta.2 candidate"
```

- [ ] **Step 3: Run complete automated gates sequentially**

For each Host partition, create a fresh existing root beneath
`C:\Users\zhaobo\AppData\Local\Temp\opencode`, point all six profile/temp variables there,
and set `PYTHONPATH` to repository root plus `host`. Run sequentially; give
partition 5 a 30-minute command timeout:

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$r=Join-Path $scratch ('plan-d-beta2-host1-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_analyze_timeout host.test_analyze_full host.test_analyze_flow host.test_analyzer host.test_case_id host.test_config_secrets host.test_debug_prompt_isolation host.test_early_cli host.test_host_integrity_actions host.test_install_integrity host.test_model_config host.test_native_messaging host.test_native_registration host.test_package_archive host.test_package_manifest host.test_pii_scrubber host.test_product_info host.test_prompt_session host.test_prompt_sources host.test_release_helper host.test_sdk_compat host.test_secret_store host.test_session_workspace host.test_version_parse;exit $LASTEXITCODE}
```

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$r=Join-Path $scratch ('plan-d-beta2-host2-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_early_update_dispatch host.test_update_actions host.test_update_engine_extension host.test_update_engine_host host.test_update_engine_rollback host.test_update_entrypoint host.test_update_journal host.test_update_mutex host.test_update_operation host.test_update_ownership host.test_update_platform host.test_update_status_host host.test_update_support;exit $LASTEXITCODE}
```

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$r=Join-Path $scratch ('plan-d-beta2-host3-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_service;exit $LASTEXITCODE}
```

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$r=Join-Path $scratch ('plan-d-beta2-host4-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_recovery;exit $LASTEXITCODE}
```

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$r=Join-Path $scratch ('plan-d-beta2-host5-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_resume;exit $LASTEXITCODE}
```

Expected: every discovered Host test passes; only the environment-gated frozen
selector may skip. Record fresh per-partition and total counts, not historical
counts. Then run these independently and sequentially; do not overlap Extension
tests and builds:

```powershell
npm --prefix extension run test:run
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

```powershell
$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path -LiteralPath 'installer_core.ps1'),[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){$errors|ForEach-Object{$_.ToString()};exit 1}
```

```powershell
& "host/venv/Scripts/python.exe" -m compileall -q host release_helper.py
```

```powershell
git grep -n -E "Updater\(|apply_update\(" -- "*.py"
```

Expected: Extension tests all PASS; TypeScript, parser, and compileall produce no
diagnostics; reachability lists only legacy tests and `host/updater.py`, with no
production `apply_update` caller. Finish with `git diff --check`, expecting no
output.

- [ ] **Step 4: Obtain explicit one-build authorization**

Present the exact beta2 version commit, fresh automated totals, proposed detached
worktree, dependency junctions, exact PyInstaller `6.22.2`, one Extension build,
one Host build, and one `create_zip` invocation. Wait for explicit approval.
Versioning approval does not authorize these build/package operations.

- [ ] **Step 5: Build beta2 exactly once**

Require `git status --short` to be empty and exact PyInstaller version `6.22.2`:

Set `$candidateCommit=(git rev-parse HEAD).Trim()` and verify the three beta2
carriers at that commit. The ledger receives this immutable source commit plus
the resulting archive hash immediately after validation. Any failed Extension build, Host
build, frozen probe, inventory, packaging, or archive validation disqualifies
this build attempt: preserve its outputs for diagnosis, record FAIL, and obtain
new explicit one-build approval before deleting the failed artifact/worktree and
starting a fresh attempt. Never rerun a failed build or `create_zip` in place.

```powershell
& "host/venv/Scripts/python.exe" -m PyInstaller --version
```

Refuse an existing artifact, create one detached worktree at `$candidateCommit`,
and junction existing dependencies without installing anything:

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';if(-not(Test-Path -LiteralPath $scratch -PathType Container)){throw 'Approved temp parent is missing'};$scratchItem=Get-Item -LiteralPath $scratch -Force -ErrorAction Stop;if(($scratchItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Approved temp parent must not be a reparse point'};$out=Join-Path $scratch 'plan-d-qualified-artifacts';if(Test-Path -LiteralPath $out){$outItem=Get-Item -LiteralPath $out -Force -ErrorAction Stop;if(-not $outItem.PSIsContainer -or (($outItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Artifact output parent is unsafe'}};$candidateCommit=(git rev-parse HEAD).Trim();$bZip=Join-Path $out 'DynamicsHelper_v2.0.76-beta.2.zip';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';if(Test-Path -LiteralPath $bZip){throw "Refusing to overwrite existing beta2 artifact: $bZip"};if(Test-Path -LiteralPath $bRoot){throw "Candidate worktree already exists: $bRoot"};git worktree add --detach $bRoot $candidateCommit;if($LASTEXITCODE -ne 0){throw 'Detached beta2 worktree creation failed'};try{New-Item -ItemType Junction -Path "$bRoot\host\venv" -Target (Resolve-Path 'host/venv') -ErrorAction Stop|Out-Null;New-Item -ItemType Junction -Path "$bRoot\extension\node_modules" -Target (Resolve-Path 'extension/node_modules') -ErrorAction Stop|Out-Null}catch{throw 'Dependency junction creation failed; candidate attempt requires reviewed cleanup'}
```

The approved temp parent already exists. Before adding the detached worktree,
verify it with `Test-Path -LiteralPath $scratch -PathType Container`; never create
or substitute a different external parent.

Require detached status empty and exact carrier identity:

Run the detached identity, Host build, hidden-import, onedir, packaging, and
archive-validation commands in a dedicated build shell, or save and restore
`PYTHONPATH` in `finally`. Never let detached-build environment variables leak
into Azure/GitHub authentication steps.

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';if(git -C $bRoot status --short){throw 'Detached beta2 worktree is dirty'};$detachedCommit=(git -C $bRoot rev-parse HEAD).Trim();if($detachedCommit -cne $candidateCommit){throw 'Detached worktree commit mismatch'};$env:PYTHONPATH="$bRoot;$bRoot\host";& "$bRoot\host\venv\Scripts\python.exe" -c "import json;from pathlib import Path;from product_info import VERSION;r=Path(r'$bRoot');p=json.loads((r/'extension/package.json').read_text(encoding='utf-8'));m=json.loads((r/'extension/manifest.json').read_text(encoding='utf-8'));assert VERSION==p['version']==(m.get('version_name') or m['version'])=='2.0.76-beta.2';assert m['version']=='2.0.76';print(VERSION)"
```

Expected: `2.0.76-beta.2`. Build Extension once, then Host once:

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{npm --prefix extension run build;if($LASTEXITCODE -ne 0){throw 'beta2 Extension build failed'}}finally{Pop-Location}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import release_helper;release_helper.build_host()";if($LASTEXITCODE -ne 0){throw 'beta2 Host build failed'}}finally{Pop-Location}
```

Expected: all default-item/build checks pass and `Host build successful.`. Do
not execute PyInstaller separately. Run the frozen probe, requiring one PASS and
no skip, then hidden-import and onedir inventories:

```powershell
& pwsh -NoProfile -Command {$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';$r=Join-Path $scratch ('plan-d-beta2-frozen-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:DH_PLAN_C_FROZEN_ONEDIR=(Resolve-Path 'dist/dh_native_host').Path;$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation -v;exit $LASTEXITCODE}finally{Pop-Location}}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import release_helper;from pathlib import Path;text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8');missing=[name for name in release_helper.PYINSTALLER_HIDDEN_IMPORTS if name not in text];assert not missing,missing;print(f'{len(release_helper.PYINSTALLER_HIDDEN_IMPORTS)}/{len(release_helper.PYINSTALLER_HIDDEN_IMPORTS)}')";if($LASTEXITCODE -ne 0){throw 'beta2 hidden-import graph check failed'}}finally{Pop-Location}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path;from update_recovery import inventory_onedir;i=inventory_onedir(Path('dist/dh_native_host').resolve(strict=True));print(f'files={len(i.internal_files)} dirs={len(i.internal_directories)}')";if($LASTEXITCODE -ne 0){throw 'beta2 onedir inventory check failed'}}finally{Pop-Location}
```

Expected hidden imports: `17/17`; record newly measured onedir counts. Invoke
`create_zip` exactly once. Immediately before it, recheck that `$bZip` does not
exist; collision fails instead of overwriting:

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';$out=Join-Path $scratch 'plan-d-qualified-artifacts';$bZip=Join-Path $out 'DynamicsHelper_v2.0.76-beta.2.zip';if(Test-Path -LiteralPath $bZip){throw 'Refusing to overwrite beta2 artifact'};if(-not(Test-Path -LiteralPath $out)){New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null};Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{if(Test-Path -LiteralPath $bZip){throw 'Refusing to overwrite beta2 artifact'};$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path;import release_helper;print(release_helper.create_zip('2.0.76-beta.2',source_root=Path.cwd(),output_dir=Path(r'$out')))";if($LASTEXITCODE -ne 0){throw 'beta2 packaging failed'}}finally{Pop-Location}
```

Validate and hash without rebuilding/repackaging:

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bZip=Join-Path $scratch 'plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.2.zip';$stage=Join-Path $scratch ('plan-d-beta2-validated-'+[guid]::NewGuid().ToString('N'));if(Test-Path -LiteralPath $stage){throw 'Fresh validation path collision'};$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path;from package_archive import stage_and_validate_archive;p=stage_and_validate_archive(Path(r'$bZip'),Path(r'$stage'),expected_version='2.0.76-beta.2');assert 'transactional-update-v1' in p.manifest.provided_capabilities;print(p.manifest.package_version)";if($LASTEXITCODE -ne 0){throw 'beta2 archive validation failed'}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bZip=Join-Path $scratch 'plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.2.zip';(Get-FileHash -Algorithm SHA256 -LiteralPath $bZip -ErrorAction Stop).Hash.ToLowerInvariant()
```

Expected: validated `2.0.76-beta.2` and one new lowercase 64-hex SHA-256. Rebind
the fixed archive path and record it immediately as `$qualifiedHash`:

```powershell
$bZip='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.2.zip';$qualifiedHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $bZip -ErrorAction Stop).Hash.ToLowerInvariant();if($qualifiedHash -cnotmatch '^[0-9a-f]{64}$'){throw 'Invalid beta2 qualified hash'}
```

Record the exact `$candidateCommit` and `$qualifiedHash` in the ledger before any later use. Remove
only the two validated junctions and exact detached worktree; retain the
qualified ZIP. Before removal, require each path is a reparse point whose target
matches the intended source dependency, and require detached HEAD still equals
`$candidateCommit`. Do not run global `git worktree prune`:

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bRoot=Join-Path $scratch 'Dynamics-Helper-plan-d-beta2';if((git -C $bRoot rev-parse HEAD).Trim() -cne $candidateCommit){throw 'Refusing cleanup of unexpected worktree commit'};$trackedStatus=@(git -C $bRoot status --short --untracked-files=no);if($trackedStatus.Count){throw 'Detached worktree contains tracked changes; preserve it'};$ignored=@(git -C $bRoot ls-files --others --ignored --exclude-standard);$unexpectedIgnored=@($ignored|Where-Object{$_ -notmatch '^(?:build/|dist/|extension/dist/|host/venv/|extension/node_modules/)' -and $_ -cne 'dh_native_host.spec'});if($unexpectedIgnored.Count){throw 'Detached worktree contains unexpected ignored paths; preserve it'};$pairs=@(@("$bRoot\host\venv",(Resolve-Path 'host/venv').Path),@("$bRoot\extension\node_modules",(Resolve-Path 'extension/node_modules').Path));foreach($pair in $pairs){$item=Get-Item -LiteralPath $pair[0] -Force -ErrorAction Stop;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 -or [IO.Path]::GetFullPath($item.Target) -cne [IO.Path]::GetFullPath($pair[1])){throw 'Refusing cleanup of unexpected dependency link'}};$generated=@(@("$bRoot\build",$true),@("$bRoot\dist",$true),@("$bRoot\extension\dist",$true),@("$bRoot\dh_native_host.spec",$false));foreach($entry in $generated){if(Test-Path -LiteralPath $entry[0]){$item=Get-Item -LiteralPath $entry[0] -Force -ErrorAction Stop;if((($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or [bool]$item.PSIsContainer -ne [bool]$entry[1]){throw 'Refusing cleanup of unsafe generated output'}}};foreach($pair in $pairs){Remove-Item -LiteralPath $pair[0] -Force -ErrorAction Stop};foreach($entry in $generated){if(Test-Path -LiteralPath $entry[0]){Remove-Item -LiteralPath $entry[0] -Recurse -Force -ErrorAction Stop}};if(git -C $bRoot status --short --untracked-files=all){throw 'Detached worktree is not clean after allowlisted cleanup'};git worktree remove $bRoot;if($LASTEXITCODE -ne 0){throw 'Exact detached worktree cleanup failed; preserve it'}
```

Normal Git status omits ignored build outputs. The cleanup command compares
`git ls-files --others --ignored --exclude-standard` against prefixes
`build/`, `dist/`, `extension/dist/`, `host/venv/`,
`extension/node_modules/`, and exact `dh_native_host.spec`; any other path
preserves the worktree. It must validate all dependency links and generated
output top-level types before removing any path, then delete only those
allowlisted outputs, require empty status, and use non-force worktree removal.

Record candidate commit/hash and all fresh gates in the ledger. Replace the
runbook's baseline/target, local ZIP path, versions, runner-watcher assertions,
matching-installer paths, and entry gate with exact beta1 → beta2 values and the
new hash. Retain beta1 as disqualified historical evidence. The runbook remains
the single executable authority for cloud-PC commands: update its exact
`Qualification Entry Gate`, `Artifact Identity`, `Installer Commands`,
the baseline-establishment section (renamed from `Establish plan-d-a` to
`Establish plan-d-b1`), `Controlled Candidate Start`, `Terminal Verification And
Cleanup`, Scenarios 1-3, and `Environment Handoff` sections before execution.
Do not duplicate or improvise those long commands in a second document. Before
any Azure or cloud-PC mutation, dispatch an independent reviewer to check every
updated command against the beta2 artifact identity, this plan's authorization
boundaries, and the current implementation; fix all Critical/Important findings
before proceeding. Run this exact scan plus `git diff --check`, requiring no
output, then stage only the runbook and ledger and commit the reviewed command
authority and candidate evidence:

Require the B2 row to be exactly:

```markdown
| B2 | `2.0.76-beta.2` | `<40-lower-hex-candidateCommit>` | `<64-lower-hex-qualifiedHash>` | BUILT |
```

Every later upload/tag/publication command first loads the B2 identity from the
fixed candidate-evidence commit and requires the current committed ledger B2 row
to match it byte-for-byte; later evidence commits may update scenario/handoff
rows but may not rewrite B2 identity. The evidence-commit SHA belongs only in
the ignored progress log, not a self-referential tracked row.

```powershell
if(Select-String -Path "docs/plan-d-pragmatic-cloud-pc-runbook.md","docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found'}
```

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-runbook.md" "docs/plan-d-pragmatic-cloud-pc-results.md"
```

Require `git diff --cached --name-only` to list exactly those two paths.

```powershell
git commit -m "docs(update): record beta2 candidate gates"
```

Immediately capture and record this commit as `$candidateEvidenceCommit` in the
ignored progress log. Do not add a self-referential commit value to the tracked
file. Before every later identity-sensitive operation, resolve this commit by
the unique subject `docs(update): record beta2 candidate gates`, require exactly
one matching commit on the current branch, then run
`git show $candidateEvidenceCommit:docs/plan-d-pragmatic-cloud-pc-results.md` to
load the frozen B2 row. Require the current committed ledger B2 row to equal the
frozen row byte-for-byte. Never use latest `HEAD` as the sole identity source.

- [ ] **Step 6: Obtain explicit Azure private-hosting authorization**

Present the Azure context for fresh confirmation and exact proposed scope:
create one new disposable private test-only container in the approved Storage account,
upload exactly `DynamicsHelper_v2.0.76-beta.2.zip` with overwrite disabled,
generate one four-hour HTTPS-only read-only user-delegation SAS, and delete the
container after qualification. Wait for approval; do not reuse the deleted
beta1 Blob/container or infer a different account/subscription.

After approval, verify the selected Azure account/context, create the container
with public access disabled, upload the qualified bytes, and generate the SAS.
Initialize only local variables without printing them, then use these commands
with beta2 as the fixed Blob name and artifact path:

```powershell
$approvedCloudName=Read-Host 'Approved Azure cloud name';$approvedTenantId=Read-Host 'Approved Azure tenant ID';$subscriptionId=Read-Host 'Approved Azure subscription ID';$approvedSubscriptionName=Read-Host 'Approved Azure subscription name';$accountName=Read-Host 'Approved test Storage account name';$containerName=Read-Host 'Approved new disposable private container name';$blobName='DynamicsHelper_v2.0.76-beta.2.zip';$artifact='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.2.zip';$ledgerText=(git show HEAD:docs/plan-d-pragmatic-cloud-pc-results.md|Out-String);if($LASTEXITCODE -ne 0){throw 'Committed ledger unavailable'};$identity=[regex]::Match($ledgerText,'(?m)^\| B2 \| `2\.0\.76-beta\.2` \| `?(?<commit>[0-9a-f]{40})`? \| `?(?<hash>[0-9a-f]{64})`? \| BUILT \|\r?$');if(-not $identity.Success){throw 'Committed B2 identity row is missing or malformed'};$candidateCommit=$identity.Groups['commit'].Value;$qualifiedHash=$identity.Groups['hash'].Value;$actualHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $artifact -ErrorAction Stop).Hash.ToLowerInvariant();if(-not $approvedCloudName -or $approvedTenantId -notmatch '^[0-9a-fA-F-]{36}$' -or $subscriptionId -notmatch '^[0-9a-fA-F-]{36}$' -or -not $approvedSubscriptionName -or -not $accountName -or -not $containerName -or $actualHash -cne $qualifiedHash){throw 'Approved Azure target or beta2 identity is unavailable'};$ownerMarkerPath='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-beta2-container-owner.json';if(Test-Path -LiteralPath $ownerMarkerPath){throw 'Beta2 container owner marker already exists'};$containerOwner=[guid]::NewGuid().ToString('N');$ownerRecord=[ordered]@{owner=$containerOwner;candidateCommit=$candidateCommit;qualifiedHash=$qualifiedHash;privateUrlDigest=''}
```

Run all Azure create/upload/SAS commands below in this same shell. If the shell
is lost before the owner marker is written, stop and inspect the approved target;
do not recreate, overwrite, or delete based on guessed variables.

Freeze identity before Azure mutation and overwrite the provisional HEAD-derived
variables only after exact equality succeeds:

```powershell
$evidenceCommits=@(git log --format='%H' --grep='^docs(update): record beta2 candidate gates$');if($evidenceCommits.Count -ne 1){throw 'Candidate evidence commit is missing or ambiguous'};$candidateEvidenceCommit=$evidenceCommits[0];$frozenText=(git show "$candidateEvidenceCommit`:docs/plan-d-pragmatic-cloud-pc-results.md"|Out-String);if($LASTEXITCODE -ne 0){throw 'Frozen ledger identity lookup failed'};$currentText=(git show HEAD:docs/plan-d-pragmatic-cloud-pc-results.md|Out-String);if($LASTEXITCODE -ne 0){throw 'Current ledger identity lookup failed'};$pattern='(?m)^\| B2 \| `2\.0\.76-beta\.2` \| `?(?<commit>[0-9a-f]{40})`? \| `?(?<hash>[0-9a-f]{64})`? \| BUILT \|\r?$';$frozen=[regex]::Match($frozenText,$pattern);$current=[regex]::Match($currentText,$pattern);if(-not $frozen.Success -or -not $current.Success -or $frozen.Value -cne $current.Value){throw 'Current B2 identity differs from frozen candidate evidence'};$candidateCommit=$frozen.Groups['commit'].Value;$qualifiedHash=$frozen.Groups['hash'].Value;if((Get-FileHash -Algorithm SHA256 -LiteralPath $artifact).Hash.ToLowerInvariant() -cne $qualifiedHash){throw 'Local beta2 artifact differs from frozen evidence'};$ownerRecord.candidateCommit=$candidateCommit;$ownerRecord.qualifiedHash=$qualifiedHash
```

```powershell
$cloud=az cloud show --query name --output tsv;if($LASTEXITCODE -ne 0 -or $cloud -cne $approvedCloudName){throw 'Azure cloud lookup or identity failed'};[pscustomobject]@{AzureCloudMatches=$true}|ConvertTo-Json -Compress
```

```powershell
$accountJson=az account show --subscription $subscriptionId --query "{tenantId:tenantId,subscriptionId:id,name:name}" --output json;if($LASTEXITCODE -ne 0 -or -not $accountJson){throw 'Azure account lookup failed'};$account=$accountJson|ConvertFrom-Json;if([string]$account.tenantId -cne $approvedTenantId -or [string]$account.subscriptionId -cne $subscriptionId -or [string]$account.name -cne $approvedSubscriptionName){throw 'Azure account identity mismatch'};[pscustomobject]@{AzureAccountMatches=$true}|ConvertTo-Json -Compress
```

First require `az cloud show --query name --output tsv` to return the separately
approved public Azure cloud. Then require `az account show` to match the
separately approved tenant, subscription ID, and subscription name before
mutation. Do not commit those resource identifiers or copy them to the ledger.

Persist the approved tuple and random owner marker only in the approved temp
directory so a later fresh cleanup shell can prove exclusive ownership. The
marker contains only opaque owner/commit/hash/digest values, never Azure account,
tenant, subscription, container, or SAS text:

```powershell
[IO.File]::WriteAllBytes($ownerMarkerPath,[Text.UTF8Encoding]::new($false).GetBytes(($ownerRecord|ConvertTo-Json -Compress)+"`n"));if(-not(Test-Path -LiteralPath $ownerMarkerPath -PathType Leaf)){throw 'Container owner marker was not persisted'}
```

```powershell
az storage container create --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --public-access off --fail-on-exist --metadata dhpurpose=plan-d-beta2 dhowner=$containerOwner dhcommit=$candidateCommit dhsha256=$qualifiedHash --output none;if($LASTEXITCODE -ne 0){throw 'Exclusive beta2 container creation failed'}
```

```powershell
$publicAccess=az storage container show --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --query properties.publicAccess --output tsv;if($LASTEXITCODE -ne 0 -or $publicAccess){throw 'Private container verification failed'};$metadataJson=az storage container metadata show --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --output json;if($LASTEXITCODE -ne 0 -or -not $metadataJson){throw 'Container ownership metadata verification failed'};$metadata=$metadataJson|ConvertFrom-Json;if([string]$metadata.dhpurpose -cne 'plan-d-beta2' -or [string]$metadata.dhowner -cne $containerOwner -or [string]$metadata.dhcommit -cne $candidateCommit -or [string]$metadata.dhsha256 -cne $qualifiedHash){throw 'Container ownership metadata mismatch'};[pscustomobject]@{PrivateContainer=$true;OwnershipMetadataMatches=$true}|ConvertTo-Json -Compress
```

Require the selected name and `publicAccess:null`.

```powershell
az storage blob upload --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --file $artifact --auth-mode login --overwrite false --validate-content --metadata dhowner=$containerOwner dhcommit=$candidateCommit dhsha256=$qualifiedHash --output none;if($LASTEXITCODE -ne 0){throw 'Private beta2 Blob upload failed'}
```

```powershell
$localSize=(Get-Item -LiteralPath $artifact -ErrorAction Stop).Length;$remoteJson=az storage blob show --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --auth-mode login --query "{size:properties.contentLength,blobType:properties.blobType,metadata:metadata}" --output json;if($LASTEXITCODE -ne 0 -or -not $remoteJson){throw 'Private beta2 Blob lookup failed'};$remote=$remoteJson|ConvertFrom-Json;if([int64]$remote.size -ne $localSize -or [string]$remote.blobType -cne 'BlockBlob' -or [string]$remote.metadata.dhowner -cne $containerOwner -or [string]$remote.metadata.dhcommit -cne $candidateCommit -or [string]$remote.metadata.dhsha256 -cne $qualifiedHash){throw 'Private beta2 Blob metadata does not match the qualified artifact'};$remoteNames=@(az storage blob list --subscription $subscriptionId --account-name $accountName --container-name $containerName --auth-mode login --query '[].name' --output tsv);if($LASTEXITCODE -ne 0 -or $remoteNames.Count -ne 1 -or $remoteNames[0] -cne $blobName){throw 'Disposable container does not contain exactly the beta2 Blob'};[pscustomobject]@{BlobCount=$remoteNames.Count;SizeMatches=$true;BlobType=[string]$remote.blobType;IdentityMetadataMatches=$true}|ConvertTo-Json -Compress
```

Require `BlobCount:1`, size match, and `BlockBlob`.

```powershell
$expiry=(Get-Date).ToUniversalTime().AddHours(4).ToString('yyyy-MM-ddTHH:mmZ');$sas=az storage blob generate-sas --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --permissions r --expiry $expiry --https-only --auth-mode login --as-user --output tsv;if($LASTEXITCODE -ne 0 -or -not $sas){throw 'SAS generation failed'};$privateBUrl="https://$accountName.blob.core.windows.net/$containerName/$blobName`?$sas";$ownerRecord.privateUrlDigest=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($privateBUrl))).ToLowerInvariant();[IO.File]::WriteAllBytes($ownerMarkerPath,[Text.UTF8Encoding]::new($false).GetBytes(($ownerRecord|ConvertTo-Json -Compress)+"`n"))
```

Keep account/container names and `$privateBUrl` only in local variables; do not
commit, echo, or paste them into chat. Download the SAS Blob to a fresh approved
temporary path and require its SHA-256 to equal `$qualifiedHash`; this binds
private delivery to the committed ledger, unlike ETag/size/service MD5 alone.

```powershell
$download='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-beta2-private-download.zip';if(Test-Path -LiteralPath $download){throw 'Private-download verification path already exists'};Invoke-WebRequest -Uri $privateBUrl -OutFile $download -UseBasicParsing;if((Get-FileHash -Algorithm SHA256 -LiteralPath $download).Hash.ToLowerInvariant() -cne $qualifiedHash){throw 'Private beta2 download hash mismatch'};Remove-Item -LiteralPath $download -Force -ErrorAction Stop;[pscustomobject]@{PrivateDownloadHashMatches=$true}|ConvertTo-Json -Compress
```

- [ ] **Step 7: Obtain explicit cloud-PC baseline/transfer authorization**

Confirm the cloud PC is still effectively empty with no workload/customer data.
Present and separately authorize: copy beta1/beta2 artifacts into
`C:\DH-CloudPC`; copy the runbook and a committed ledger snapshot extracted
from the fixed candidate-evidence commit; verify both copied hashes; run the
read-only beta1 terminal guard; delete only the exact
old-shape beta1 `dh_update_state`; Stop/wake the Service Worker; seed beta2
candidate storage; capture the prior Status bubble Boolean, enable it if needed,
run the uninterrupted normal Update action, then restore and verify the exact
prior Boolean after lifecycle and smoke checks. This approval does not authorize
installers, process termination, interruption, or sentinel mutation.

- [ ] **Step 8: Run uninterrupted beta1 to beta2**

Resolve the unique `docs(update): record beta2 candidate gates` commit and
checkout the exact runbook bytes from that commit into a read-only comparison
path. Require the working-tree runbook SHA-256 to match those committed bytes;
otherwise stop. Execute only that reviewed runbook, following this complete
order without substituting Extension Reload for Worker Stop:

1. Verify the installed beta1 Host/Extension, capabilities, packaged integrity,
   and absence of active/workspace/cursor/receipt/runner/RunOnce state.
2. Record beta1's historical safe terminal fields, perform the one-time guarded
   old-shape completion cleanup from Task 4, Stop the Worker, wake it through
   Options, and require `idle` with no retained candidate URL.
3. Capture the effective Status bubble Boolean. Enable it through Options and
   verify `true` before candidate seeding, retaining the original Boolean for
   later restoration.
4. Copy beta2 to `C:\DH-CloudPC`, hash it locally, and require exact equality to
   the committed ledger `$qualifiedHash`; re-download through the SAS immediately
   before seeding and require the same hash. Use the separately authorized fresh
   private single-Blob container/SAS from Step 6, seed beta2 `available`
   without printing the URL, Stop the Worker, wake it through Options, and
   require `DH_UPDATE_GET_STATE` to return that candidate.
5. Run uninterrupted beta1 → beta2 through the normal Update action while the
   safe storage/process watchers are active. Require `complete/committed`,
   matching beta2 Host/Extension, `packaged/verified`, no active/workspace/
   cursor/receipt/RunOnce residue, and matching finalization acknowledgment.
6. Require the fresh B2 automated FAB/Options gate to prove exact 7,999/8,000 ms
   timing. On the cloud PC, observe both real terminal UIs appear after reload
   and disappear globally without storage editing/manual ACK or use of the ACK
   response as authority. Verify the authoritative committed state is `idle`
   with `hasUpdateUrl:false` and completion remains absent across FAB/Options
   refresh. Cloud timing is an approximate integration observation, not a second
   exact-millisecond proof.
7. Run Analyze and Options smoke checks. Restore Status bubble to the captured
   prior Boolean through Options, reread and require the exact original value,
   then record only sanitized PASS/FAIL and `preference restored`.

Use the updated runbook's exact ledger parser on the cloud PC rather than manual
hash transcription. It must extract one B2 row from the committed ledger copy,
require its 40-hex commit, 64-hex hash, version, and `BUILT` result, then compare
both the redirected/local ZIP and actual SAS download against that hash before
storage seeding. Any mismatch stops before `DH_UPDATE_START`.

- [ ] **Step 9: Obtain explicit installer/interruption authorization**

Present and authorize the exact remaining cloud-PC mutations: close Edge; stop
only processes whose executable paths equal the installed DH Host or recovery
runner paths; and run the exact beta1 full installer followed, if interruption
rolls back, by the exact beta2 installer needed to settle the next baseline,
including Native Messaging registration changes. Wait for this installer/process
approval. Do not kill by name alone, alter transaction files, or broaden this to
the old workstation. Sentinel injection remains excluded until Step 12.

- [ ] **Step 10: Obtain explicit deliberate-interruption authorization**

Present the exact captured original `--complete-update` executable path/PID/
transaction guard and same-transaction `--recover-active` witness. Wait for a
separate approval to terminate that exact process. Installer approval does not
authorize deliberate interruption.

- [ ] **Step 11: Run interruption recovery**

Reinstall the exact beta1 private package through the runbook's marker/path/
process guards and verify the full beta1 baseline. Reseed the same beta2 artifact
with the current private URL and rerun the original `--complete-update`
interruption with the exact-PID/path guard and same-transaction
`--recover-active` witness. Accept only committed beta2 or rolled-back beta1,
then apply the same terminal ACK and smoke checks.

Immediately before reseeding, download through the current URL and require the
committed ledger SHA-256. If it is expired or has under one hour remaining, do
not continue: obtain fresh explicit SAS-renewal approval, regenerate only a
four-hour read-only SAS for the same ownership-verified Blob, update the local
URL digest marker, and repeat the download/hash gate. Renewal never authorizes a
new container, Blob overwrite, or different artifact.

- [ ] **Step 12: Obtain explicit matching-installer sentinel authorization**

Present the exact beta2 installer, `_internal` sentinel path/bytes, user-owned
hash capture, guarded browser/Host/runner stops, and Native Messaging
registration mutation. Wait for separate approval. Interruption approval does
not authorize sentinel or installer repair.

- [ ] **Step 13: Run matching-installer repair**

Re-establish matching beta2, capture user-owned hashes, inject the single
`_internal` sentinel, close only guarded browser/Host/runner processes, run the
exact beta2 full installer, and require sentinel removal, user-file preservation,
matching versions, capabilities, packaged integrity, and idle/no-URL state.

Run this non-secret ledger scan and `git diff --check`, requiring no output;
stage only the results ledger, require
`git diff --cached --name-only` to return exactly that path, and commit the
completed beta2 cloud-PC evidence:

```powershell
if(Select-String -Path "docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found'}
```

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record beta2 cloud PC qualification"
```

- [ ] **Step 14: Delete the private beta2 container after qualification**

Under the Step 6 authorization, re-enter the approved tuple in a fresh shell,
revalidate cloud/account, exact ownership metadata, and exactly one matching
Blob before deleting the whole disposable container. Compare ownership commit/
hash to the committed ledger, not current local bytes. If any check fails,
delete nothing and preserve the resource. Record only PASS/FAIL; never record
the URL, account, container, token, or command output.

```powershell
$approvedCloudName=Read-Host 'Approved Azure cloud name';$approvedTenantId=Read-Host 'Approved Azure tenant ID';$subscriptionId=Read-Host 'Approved Azure subscription ID';$approvedSubscriptionName=Read-Host 'Approved Azure subscription name';$accountName=Read-Host 'Approved test Storage account name';$containerName=Read-Host 'Approved disposable beta2 container name';$ownerMarkerPath='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-beta2-container-owner.json';if(-not(Test-Path -LiteralPath $ownerMarkerPath -PathType Leaf)){throw 'Beta2 container owner marker is missing'};$markerValue=[IO.File]::ReadAllText($ownerMarkerPath)|ConvertFrom-Json -AsHashtable -ErrorAction Stop;if($markerValue.Keys.Count -ne 4 -or @('owner','candidateCommit','qualifiedHash','privateUrlDigest')|Where-Object{-not $markerValue.ContainsKey($_)}){throw 'Beta2 owner marker shape is invalid'};$containerOwner=[string]$markerValue.owner;$candidateCommit=[string]$markerValue.candidateCommit;$qualifiedHash=[string]$markerValue.qualifiedHash;if($containerOwner -cnotmatch '^[0-9a-f]{32}$' -or $candidateCommit -cnotmatch '^[0-9a-f]{40}$' -or $qualifiedHash -cnotmatch '^[0-9a-f]{64}$' -or [string]$markerValue.privateUrlDigest -cnotmatch '^[0-9a-f]{64}$'){throw 'Beta2 owner marker values are invalid'};$evidenceCommits=@(git log --format='%H' --grep='^docs(update): record beta2 candidate gates$');if($evidenceCommits.Count -ne 1){throw 'Candidate evidence commit is missing or ambiguous'};$frozenText=(git show "$($evidenceCommits[0]):docs/plan-d-pragmatic-cloud-pc-results.md"|Out-String);$frozen=[regex]::Match($frozenText,'(?m)^\| B2 \| `2\.0\.76-beta\.2` \| `?(?<commit>[0-9a-f]{40})`? \| `?(?<hash>[0-9a-f]{64})`? \| BUILT \|\r?$');if(-not $frozen.Success -or $frozen.Groups['commit'].Value -cne $candidateCommit -or $frozen.Groups['hash'].Value -cne $qualifiedHash){throw 'Owner marker differs from frozen candidate evidence'};$blobName='DynamicsHelper_v2.0.76-beta.2.zip';$cloud=az cloud show --query name --output tsv;if($LASTEXITCODE -ne 0 -or $cloud -cne $approvedCloudName){throw 'Azure cloud revalidation failed'};$accountJson=az account show --subscription $subscriptionId --query "{tenantId:tenantId,subscriptionId:id,name:name}" --output json;if($LASTEXITCODE -ne 0 -or -not $accountJson){throw 'Azure account revalidation failed'};$account=$accountJson|ConvertFrom-Json;if([string]$account.tenantId -cne $approvedTenantId -or [string]$account.subscriptionId -cne $subscriptionId -or [string]$account.name -cne $approvedSubscriptionName){throw 'Azure account identity mismatch'};$metadataJson=az storage container metadata show --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --output json;if($LASTEXITCODE -ne 0 -or -not $metadataJson){throw 'Container ownership lookup failed'};$metadata=$metadataJson|ConvertFrom-Json;if([string]$metadata.dhpurpose -cne 'plan-d-beta2' -or [string]$metadata.dhowner -cne $containerOwner -or [string]$metadata.dhcommit -cne $candidateCommit -or [string]$metadata.dhsha256 -cne $qualifiedHash){throw 'Container ownership mismatch; delete nothing'};$blobJson=az storage blob show --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --auth-mode login --query "{blobType:properties.blobType,metadata:metadata}" --output json;if($LASTEXITCODE -ne 0 -or -not $blobJson){throw 'Blob ownership lookup failed'};$blob=$blobJson|ConvertFrom-Json;if([string]$blob.blobType -cne 'BlockBlob' -or [string]$blob.metadata.dhowner -cne $containerOwner -or [string]$blob.metadata.dhcommit -cne $candidateCommit -or [string]$blob.metadata.dhsha256 -cne $qualifiedHash){throw 'Blob ownership mismatch; delete nothing'};$names=@(az storage blob list --subscription $subscriptionId --account-name $accountName --container-name $containerName --auth-mode login --query '[].name' --output tsv);if($LASTEXITCODE -ne 0 -or $names.Count -ne 1 -or $names[0] -cne $blobName){throw 'Container contents changed; delete nothing'};az storage container delete --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --fail-not-exist --output none;if($LASTEXITCODE -ne 0){throw 'Private beta2 container deletion failed'}
```

```powershell
$exists=az storage container exists --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --query exists --output tsv;if($LASTEXITCODE -ne 0 -or $exists -ne 'false'){throw 'Private beta2 container still exists'};$clipboard=Get-Clipboard -Raw -ErrorAction SilentlyContinue;$clipboardDigest=if($clipboard){[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($clipboard))).ToLowerInvariant()}else{''};$clipboardMatched=$clipboardDigest -ceq [string]$markerValue.privateUrlDigest;if($clipboardMatched){Set-Clipboard -Value '' -ErrorAction Stop;$afterClipboard=Get-Clipboard -Raw -ErrorAction SilentlyContinue;$afterDigest=if($afterClipboard){[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($afterClipboard))).ToLowerInvariant()}else{''};if($afterDigest -ceq [string]$markerValue.privateUrlDigest){throw 'Private URL remains on clipboard'}};Remove-Variable sas,privateBUrl -ErrorAction SilentlyContinue;Remove-Item -LiteralPath $ownerMarkerPath -Force -ErrorAction Stop;[pscustomobject]@{ContainerAbsent=$true;PrivateUrlCleared=$clipboardMatched;ClipboardDidNotContainPrivateUrl=-not $clipboardMatched;OwnerMarkerRemoved=$true}|ConvertTo-Json -Compress
```

If the clipboard digest matched, require `Set-Clipboard` success and reread the
clipboard to prove its digest no longer matches before reporting
`PrivateUrlCleared:true`; otherwise report `ClipboardDidNotContainPrivateUrl:true`
instead. Expected: container absent, URL variables removed, owner marker removed,
and the applicable clipboard predicate true. Do not print clipboard contents.

Run the ledger secret scan, record the private-container cleanup PASS in a
dedicated row, stage only the ledger, require the cached path is exactly the
ledger, and commit before old-workstation or
publication work:

```powershell
if(Select-String -Path "docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found'}
```

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record beta2 private delivery cleanup"
```

- [ ] **Step 15: Obtain separate old-workstation authorization**

Keep the old workstation on displayed `v2.0.75-beta.1`. Present the choice to
disable beta updates or disable the Extension and wait for explicit approval.
Do not update/install, change registration, or delete data there. Record the
approved action in the sanitized ledger, run the ledger secret scan shown before
the cloud-PC evidence commit and `git diff --check`; require the cached path is
exactly the ledger and commit it separately.

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record beta2 environment handoff readiness"
```

- [ ] **Step 16: Finalize notes and obtain explicit tag approval**

Update release notes to beta2 and the fresh automated/cloud-PC evidence. Run
this exact scan plus `git diff --check`, requiring no output, then commit only
the release notes with
`docs(release): finalize v2.0.76-beta.2 notes`. Present candidate commit,
qualified ZIP path/hash, and proposed tag command; wait for tag approval, then
create local tag `v2.0.76-beta.2` at the exact recorded candidate commit. Do not
push or publish under tag approval.

Require `git diff --cached --name-only` to return exactly
`releases/notes-prompt-scope-cleanup-draft.md` before the notes commit.

```powershell
if(Select-String -Path "releases/notes-prompt-scope-cleanup-draft.md","docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found'}
```

```powershell
git add -- "releases/notes-prompt-scope-cleanup-draft.md"
```

```powershell
git commit -m "docs(release): finalize v2.0.76-beta.2 notes"
```

```powershell
$evidenceCommits=@(git log --format='%H' --grep='^docs(update): record beta2 candidate gates$');if($evidenceCommits.Count -ne 1){throw 'Candidate evidence commit is missing or ambiguous'};$candidateEvidenceCommit=$evidenceCommits[0];$frozenText=(git show "$candidateEvidenceCommit`:docs/plan-d-pragmatic-cloud-pc-results.md"|Out-String);if($LASTEXITCODE -ne 0){throw 'Frozen ledger identity lookup failed'};$currentText=(git show HEAD:docs/plan-d-pragmatic-cloud-pc-results.md|Out-String);if($LASTEXITCODE -ne 0){throw 'Current ledger identity lookup failed'};$pattern='(?m)^\| B2 \| `2\.0\.76-beta\.2` \| `?(?<commit>[0-9a-f]{40})`? \| `?(?<hash>[0-9a-f]{64})`? \| BUILT \|\r?$';$frozen=[regex]::Match($frozenText,$pattern);$current=[regex]::Match($currentText,$pattern);if(-not $frozen.Success -or -not $current.Success -or $frozen.Value -cne $current.Value){throw 'Current B2 identity differs from frozen candidate evidence'};$candidateCommit=$frozen.Groups['commit'].Value;git cat-file -e "$candidateCommit`^{commit}";if($LASTEXITCODE -ne 0){throw 'Invalid beta2 candidate commit'};$localTag=(git tag --list 'v2.0.76-beta.2');if($localTag){throw 'Local beta2 tag already exists'};git ls-remote --exit-code --tags origin refs/tags/v2.0.76-beta.2 *> $null;if($LASTEXITCODE -eq 0){throw 'Remote beta2 tag already exists'};if($LASTEXITCODE -ne 2){throw 'Remote tag preflight failed'};git tag "v2.0.76-beta.2" $candidateCommit
```

- [ ] **Step 17: Obtain explicit branch/tag push approval**

Present the exact branch and local tag refs. Only after approval, push
`hardening/plan-d-runtime-installer` and `v2.0.76-beta.2` independently. Do not
create the GitHub release under push approval. Before each push, require
`git status --short` empty and `git diff --cached --name-only` empty.

```powershell
git push -u origin hardening/plan-d-runtime-installer
```

```powershell
git push origin "v2.0.76-beta.2"
```

Require both commands to exit `0`, then verify the remote branch tip and remote
tag resolve to the intended local refs before publication.

```powershell
$localBranch=(git rev-parse hardening/plan-d-runtime-installer).Trim();$remoteBranch=(git ls-remote origin refs/heads/hardening/plan-d-runtime-installer|ForEach-Object{($_ -split "`t")[0]});$localTag=(git rev-parse 'v2.0.76-beta.2^{}').Trim();$remoteTag=(git ls-remote origin refs/tags/v2.0.76-beta.2|ForEach-Object{($_ -split "`t")[0]});if($remoteBranch -cne $localBranch -or $remoteTag -cne $localTag){throw 'Remote branch or tag verification failed'}
```

- [ ] **Step 18: Obtain explicit GitHub prerelease publication approval**

Present the exact already-qualified ZIP/hash and release-note path. Only after
approval, create the `v2.0.76-beta.2` prerelease with `--verify-tag`; never run
`release_helper.py` or rebuild/repackage. Download the published asset to a new
temporary path and require its SHA-256 to equal the qualified hash.

```powershell
$evidenceCommits=@(git log --format='%H' --grep='^docs(update): record beta2 candidate gates$');if($evidenceCommits.Count -ne 1){throw 'Candidate evidence commit is missing or ambiguous'};$candidateEvidenceCommit=$evidenceCommits[0];$frozenText=(git show "$candidateEvidenceCommit`:docs/plan-d-pragmatic-cloud-pc-results.md"|Out-String);if($LASTEXITCODE -ne 0){throw 'Frozen ledger identity lookup failed'};$currentText=(git show HEAD:docs/plan-d-pragmatic-cloud-pc-results.md|Out-String);if($LASTEXITCODE -ne 0){throw 'Current ledger identity lookup failed'};$pattern='(?m)^\| B2 \| `2\.0\.76-beta\.2` \| `?(?<commit>[0-9a-f]{40})`? \| `?(?<hash>[0-9a-f]{64})`? \| BUILT \|\r?$';$frozen=[regex]::Match($frozenText,$pattern);$current=[regex]::Match($currentText,$pattern);if(-not $frozen.Success -or -not $current.Success -or $frozen.Value -cne $current.Value){throw 'Current B2 identity differs from frozen candidate evidence'};$qualifiedHash=$frozen.Groups['hash'].Value;$candidateCommit=$frozen.Groups['commit'].Value;$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$bZip=Join-Path $scratch 'plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.2.zip';if((Get-FileHash -Algorithm SHA256 -LiteralPath $bZip).Hash.ToLowerInvariant() -cne $qualifiedHash){throw 'Qualified beta2 file no longer matches frozen evidence'};if((git rev-list -n 1 'v2.0.76-beta.2').Trim() -cne $candidateCommit){throw 'Beta2 tag does not match committed candidate'};$notes='releases/notes-prompt-scope-cleanup-draft.md';$committedNotesBlob=(git rev-parse "HEAD:$notes").Trim();$workingNotesBlob=(git hash-object $notes).Trim();if($committedNotesBlob -cne $workingNotesBlob){throw 'Working release notes differ from committed bytes'};gh release create "v2.0.76-beta.2" $bZip --title "v2.0.76-beta.2" --notes-file $notes --prerelease --verify-tag;if($LASTEXITCODE -ne 0){throw 'GitHub prerelease creation failed'}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$download=Join-Path $scratch 'plan-d-published-beta2';if(Test-Path -LiteralPath $download){throw 'Published beta2 verification directory already exists'};New-Item -ItemType Directory -Path $download|Out-Null;gh release download "v2.0.76-beta.2" --pattern "DynamicsHelper_v2.0.76-beta.2.zip" --dir $download;if($LASTEXITCODE -ne 0){throw 'Published beta2 download failed'}
```

```powershell
$scratch='C:\Users\zhaobo\AppData\Local\Temp\opencode';$published=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $scratch 'plan-d-published-beta2\DynamicsHelper_v2.0.76-beta.2.zip')).Hash.ToLowerInvariant();if($published -cne $qualifiedHash){throw 'Published beta2 hash does not match committed ledger'};$published
```

- [ ] **Step 19: Obtain explicit workload-handoff approval**

Recheck cloud-PC beta2 version, packaged integrity, Analyze, and Options without
reinstalling. Present the evidence and wait for separate workload-handoff
approval. Migration remains user-operated unless separately designed and
approved. After the user confirms handoff, record only sanitized outcomes and
run the ledger secret scan plus `git diff --check`, then commit
`docs(update): record first Plan D beta2 delivery`; require the cached path is
exactly the ledger first.

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record first Plan D beta2 delivery"
```

The final evidence commit is newer than the already-pushed release tag. Present
its exact SHA and obtain one additional explicit branch-push approval. Only then:

```powershell
git push origin hardening/plan-d-runtime-installer
```

Require exit `0` and verify the remote branch tip equals local HEAD.

Do not move the release tag or modify the published release.

## Verification Summary

- Runtime: strict complete identity and serialized idempotent transition.
- Service Worker: strict exact message routing and all-tab broadcast.
- UI: global one-shot eight-second mounted-time behavior without direct storage ownership.
- Privacy: committed completion removes persisted private URL.
- Retry: rolled-back completion becomes `available`.
- Qualification: private beta1 remains unpublished; beta2 repeats complete automated and cloud-PC gates.
