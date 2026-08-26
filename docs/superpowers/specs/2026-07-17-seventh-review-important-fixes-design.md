# Seventh Review Important Fixes Design

**Date:** 2026-07-17

**Starting head:** `540283edcd03b64189a64368fe8fe984622e2033`

## Goal

Close both Important findings from the seventh whole-branch review without
changing public behavior outside preference-mirror durability and Team Catalog
storage-failure truth.

## Hydration Catch-Up Durability

The post-hydration catch-up is a preference persistence operation, not a direct
Host RPC. It captures one immutable config intent and wraps that snapshot in a
`PrefsMirrorIntent`. The intent enters the same single-flight, coalescing
`writePrefsMirror` queue as every user preference write.

Only the successful latest mirror commit may invoke `onLatestCommit`. Catch-up's
callback sends its captured Host payload with `suppressTransportWarning: true`.
An older successful storage callback does nothing when a newer mirror exists.
A failed storage callback retains the exact latest intent, its visible mirror
issue, and all unsettled actions; it sends no Host update and dispatches no
action. A later user-driven mirror retries or supersedes the pending snapshot,
and only that successful latest snapshot sends once.

Passive Host hydration remains storage-only and generation-gated. Catch-up
still performs no work when no preference was touched during hydration.

## Team Catalog Storage Failure Truth

`teamCatalog.ts` keeps callback-style wrappers around
`chrome.storage.local.set` and `remove`, but each wrapper reads
`chrome.runtime.lastError` synchronously inside its callback. A scoped error
rejects the Promise and a successful callback resolves it. The mutation queue
continues to use both fulfillment and rejection continuations, so one failed
mutation cannot poison later work.

Identity mismatch and generation supersession remain `stale`. Storage mutation
rejection is different: manifest-only sync, selected-team manifest/bookmark/304
commits, no-team clear, reset-cache clear, and Reset return structured `failed`
truth. Failed selected sync responses expose neither items nor a timestamp, so
Options cannot apply success state. Reset performs no Options-local cleanup and
shows no success unless its existing token/identity checks receive `committed`.

Errors remain credential-safe: storage failures use fixed messages and never
include manifest URLs, SAS query text, or thrown values.

## Test Strategy

Hydration tests defer the hydration mirror and catch-up mirror independently.
They prove failed catch-up storage produces zero `update_config`, a later
successful edit sends one latest payload, and a delayed older catch-up cannot
send before a newer edit commits. A temporary direct-send mutation must fail
these tests.

Team tests reject deferred storage callbacks to produce scoped `lastError` for
manifest, changed bookmarks, 304 timestamp, selection clear, full clear, and
Reset paths. Assertions require failed responses, unchanged cached state, no
items/timestamp success payload, no local Reset success, and successful queued
recovery. A temporary mutation that ignores `lastError` must fail.

Host code is unchanged, but focused and full Host tests still run with isolated
`LOCALAPPDATA`, `TEMP`, and `TMP`. Full Extension tests, production build,
source-only compileall, static scans, and diff checks remain required. Optional
authenticated smoke stays skipped because safe model/session isolation is not
guaranteed. Controller broad whole-branch review remains pending.

## Safety Constraints

- No push, tag, publish, version, package, registry, or release operation.
- No access to real `%LOCALAPPDATA%\DynamicsHelper` or MyCases state.
- Preserve all existing PS/PF/UI invariants, request generations, immutable
  action identities, sparse prompt revisions, logging secrecy, and race gates.
