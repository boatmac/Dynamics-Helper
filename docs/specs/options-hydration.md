# Options Hydration

Status: Implemented. Current contract. Section 4 and section 5 retain the
behavior/test meanings referenced by `Options.tsx` and `Options.test.tsx`.

## 1. Problem

Options starts with defaults, loads the local `dh_prefs` mirror, then reconciles
the Host's `get_config` response. Users can edit during this hydration window.
Late storage/Host reads must not overwrite those edits, and unhydrated default
values must not erase canonical Host configuration or prompt files.

### Why the guard exists (don't break this)

`prefsHydratedRef` gates Host preference writes and manifest fetching, not local
edit intent. Explicit Reset is a user choice of defaults; an initial render's
defaults are not. Keeping these distinct prevents accidental config erasure.

## 2. Solution overview

- **I1:** No unhydrated DEFAULT_PREFS-derived Host write. Explicit Reset follows
  the guarded transaction path in §4.5.
- **I2:** Preference persistence is queued locally without waiting for Host
  hydration. A successful storage commit drives `usePrefs()` subscriptions in
  outer Options, language providers, and FAB; storage is asynchronous, not a
  synchronous durability guarantee.
- **I3:** Window edits are retained for an inspected post-hydration catch-up.
  Host/storage failure must not be reported as successful durable persistence.
- **I4:** Hydration skips every user-touched field, even if the user changed it
  back to its original value before the response arrived.

Instant persistence has no Save button: selects/checkboxes/toggles persist
on change; text/number/color editors update state on change and persist on blur.
The manifest URL additionally validates before fetching. Touched tracking occurs
on edit, not only on blur, so unfinished typing is protected too.

## 3. Data model changes

### Touched-field ref: `userTouchedFieldsRef`

The existing `Set<keyof Preferences>` records touched camelCase preference keys
for the Options page session. The current values live in the current preference
snapshot/ref, not in this set. Reset marks all default preference keys touched.
Completing hydration does not clear the touched set.

Immutable config/mirror intents carry values and generations. `writePrefsMirror`
uses one single-flight, coalescing queue; prompt edits additionally carry matching
revision/value tokens. Reset owns a separate tokenized transaction, not merely a
generic preference-mirror action.

## 4. Behavioral changes

The six stable test invariants are **T-Inv1**, **T-Inv2**, **T-Inv3**,
**T-Inv4**, **T-Inv5**, and **T-Inv6**. Their definitions follow here and their
one-to-one test matrix remains in §5.

### 4.1 `persistPrefs` — three segments, independently gated

1. **Local mirror (T-Inv1):** Every persistence intent enters the `dh_prefs`
   queue, including during hydration. Coalescing retains the newest complete
   snapshot; at most one storage write is in flight.
2. **Host RPC (T-Inv2):** No `update_config` before hydration opens the gate.
   Afterward, only the successful latest mirror-commit callback may dispatch
   its current config intent. Merely starting a storage write is insufficient.
3. **Manifest action:** Requires hydration, an eligible captured catalog
   identity, and an explicit applicable fetch action. It cannot run before the
   successful latest mirror commit. Options requests the Worker, never directly
   mutates/fetches the team cache.

Callbacks inspect callback-scoped `chrome.runtime.lastError`. A failed mirror
retains its intent if no newer one supersedes it, shows a persistence warning,
and sends no Host update or carried action. Newer queued work drains first;
obsolete successful writes do not dispatch stale effects. Compatible team
actions carry forward and settle once; changed identities cancel them.

### 4.2 Edit handlers — mark touched

`updatePref(patch)` marks patched keys, updates the current preference snapshot,
and persists outside React state-updater closures. Text handlers mark fields
and update local state; blur persists the current ref-backed snapshot.

React updater functions are pure. Do not write storage, send RPCs, or export a
closure variable from an updater for later dispatch. React scheduling/replay is
not a persistence sequencing primitive.

### 4.3 Host hydration merge — respect touched

**T-Inv3:** Merge only untouched fields from Host config into current preferences.
The guard uses TypeScript preference keys even when Host keys are snake_case.
Untouched fields still restore from the Host; missing prompt fields do not mean
empty content and must not clear an editor or canonical prompt file.

Hydration's mirror-only writes also enter the same queue with generation checks.
A late hydration snapshot must not overwrite a newer user intent.

### 4.4 Catch-up RPC at hydration COMPLETE

**T-Inv4:** On hydration completion with touched fields, schedule a revision-gated
effect that freezes the current merged intent. It enters `writePrefsMirror`;
only its successful latest-commit callback sends the inspected Host update.
The effect must not use a stale render closure or dispatch from a state updater.

The same ordering applies to successful `get_config`, transport/Host-down
fallback, and non-success response branches. Completion opens the local gate;
it does not prove the Host is healthy. Failed catch-up retains visible unsaved
state/retry intent, not a promise that reopening Options will silently repair it.

**T-Inv5:** With no touched fields, hydration may update the local mirror but
does not send a catch-up `update_config` merely because loading finished.

Every Host result distinguishes durable config acknowledgment from session
refresh success. Explicit prompt edit/clear acknowledgments advance only the
matching revision. Unrelated updates omit prompt fields. The latest acknowledged
update may perform one generation-gated, health-only `get_config`; that check
updates prompt health only, not preferences, and cannot start an update loop.

### 4.5 Reset handler — mark all touched

**T-Inv6:** Confirmed Reset marks every default preference key touched, so a late
Host hydration response cannot undo it. Defaults are explicit user intent here.

Each normal Reset creates one transaction with a token and captured generations.
The latest default-derived preference mirror must commit before the first
tokenized Host update. The matching durable Host acknowledgment must be recorded
before dispatching Worker cleanup. A successful config save and failed session
refresh are separate outcomes; cleanup follows durable acknowledgment, not a
generic success assumption.

Once defaults are acknowledged, cleanup retry resumes the same transaction and
must never send those defaults to the Host again. Keep Reset ownership separate
from settled mirror actions. Generation-scoped cleanup preserves newer preference,
prompt, personal bookmark, and team-selection edits. Personal removal/writes use
their own serialized queue; team/analysis cleanup remains Worker-owned. Failed
cleanup stays visibly incomplete rather than presenting Reset as completed.

## 5. Test matrix

`extension/src/components/Options.test.tsx` retains one primary test per invariant:

| ID | Scenario | Required assertion |
|---|---|---|
| T-Inv1 | Edit a persisted preference during hydration | Local mirror write succeeds without waiting for Host hydration |
| T-Inv2 | Edit during hydration, hold Host response | No early `update_config` leaks through the gate |
| T-Inv3 | Touched field conflicts with late Host value | User value survives; untouched fields can hydrate |
| T-Inv4 | Complete hydration after a window edit | Catch-up sends the user value after the latest mirror commits |
| T-Inv5 | Complete hydration without edits | No catch-up Host write |
| T-Inv6 | Confirm Reset during hydration | All Reset keys survive the late merge and follow the guarded Reset path |

The test fixture uses `deferNextResponse('get_config')` to hold the window open.
Queue failure, supersession, prompt health, and Reset retry cases supplement these
six definitions; they do not renumber or duplicate the primary invariants across
every field. Existing tests are not evidence of a new run.

New invariant tests require scoped break-and-fail verification under the current
test-safety rules. This document does not authorize test execution, broad
discovery, or a build during documentation maintenance.

## 6. Out of scope

No removal of Host hydration, single writable preference context, or new
cross-process config conflict-resolution protocol is introduced here. The Host
remains canonical backing storage; a browser mirror is not a replacement.

## 7. Files touched

Current implementation owners are `Options.tsx` and its focused regression tests,
with shared preference defaults/read-only subscriptions in the existing utilities.
This section identifies ownership, not a list of edits to perform.

## 8. Verification boundary

The contract preserves section numbering for source references. Documentation
cleanup changes no runtime behavior and claims no test, build, or release result.
