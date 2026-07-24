# Plan E Boundary Correction Design

**Status:** Accepted
**Date:** 2026-07-24
**Plan E product base:** `0dbb4852931b50153fb898b03129ae0092c46404`

## 1. Purpose

Correct contradictions discovered during the preflight review of
`docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md` before any
Plan E product or test implementation begins. This amendment preserves Plan
E's approved product scope while making its Native-message trust boundary,
TDD sequence, and commit evidence internally consistent.

This document overrides only conflicting Plan E text identified below. The
accepted whole-branch hardening design and every unaffected Plan E requirement
remain authoritative.

## 2. Problems Being Corrected

### 2.1 Mutable non-Analyze pass-through

The current Plan E text requires `guardNonAnalyzeNativeMessage` to inspect
reserved metadata and then return the original object by identity. That leaves
a check-to-send gap: a caller or stateful Proxy can change the object after the
descriptor check and before Native transport serialization. This contradicts
the requirement that `_persist` and `extension_warnings` never reach the Host.

### 2.2 Duplicate trust-boundary primitives

Plan E separately specifies `analysisField`, `ownField`, and
`ownDataProperty`, although all three implement the same descriptor-safe own
data-property classification. Keeping three copies creates divergent security
boundaries and conflicts with the task-review quality gate against verbatim
logic duplication.

### 2.3 Invalid TDD and evidence ordering

Several plan steps either implement behavior before its first failing test,
run a behavioral suite before every imported export has a shell, or filter on a
test title that was not yet declared. Task 8 also omits its Native ingress case
from the delivery RED filter. These sequences cannot provide the required
assertion-based RED evidence.

### 2.4 Incomplete staged-scope checks

The task commit commands stage named paths but do not prove that no unrelated
path was already staged. An independently reviewable task commit requires an
exact staged path-set check immediately before each commit.

## 3. Shared Own-Data Boundary

Task 1 owns a new focused utility:

```text
extension/src/utils/ownData.ts
extension/src/utils/ownData.test.ts
```

Its public interface is:

```ts
export type OwnDataProperty =
    | { kind: 'absent' }
    | { kind: 'value'; value: unknown }
    | { kind: 'invalid' }

export function ownDataProperty(
    value: unknown,
    key: PropertyKey,
): OwnDataProperty
```

`ownDataProperty` performs its complete object, array, and descriptor sequence
inside one `try` block. It accepts only an own data descriptor, does not invoke
getters, and contains revoked or throwing Proxies. It does not coerce,
serialize, interpolate, log, or otherwise inspect a rejected value.

The helper deliberately reports a missing property as `absent`, an own data
property as `value`, and an accessor or unsafe container as `invalid`. It does
not enforce field-specific types; each consumer retains ownership of its
schema.

Tasks 4, 5, 7, and 8 import this utility. They must not define equivalent local
single-property classifiers such as `analysisField` or `ownField`. Specialized
descriptor-map readers remain local where a parser must consume one
already-captured descriptor snapshot without re-reading the source object.
Task 1's recursive bookmark graph parser and Task 2's bookmark-document
consumers retain their specialized descriptor-map parsing; they are not generic
single-property boundary consumers.

## 4. Non-Analyze Native Snapshot

`guardNonAnalyzeNativeMessage` remains a narrow top-level boundary. It does not
introduce per-action schemas or recursively parse legacy Host payloads.

For an allowed non-Analyze object, the guard:

1. Rejects non-objects and arrays.
2. Captures `Object.getOwnPropertyDescriptors(inner)` exactly once inside a
   guarded block.
3. Rejects when `_persist` or `extension_warnings` is any own key, regardless
   of enumerability or whether the descriptor is data or accessor-backed.
4. Requires the captured `action` to be an own enumerable data property whose
   value is a primitive string other than `analyze_error`. Boxed strings and
   objects with conversion hooks are invalid.
5. Requires an own `requestId`, when present, to be an enumerable data property
   containing a non-empty primitive string. Absence remains valid because the
   final wire sender supplies an ID for legacy actions such as `get_config`.
6. Rejects any own `toJSON` key, regardless of enumerability or descriptor
   kind, so Native JSON serialization cannot replace the checked top-level
   envelope.
7. Rejects symbol keys and enumerable accessor properties.
8. Ignores inherited and non-enumerable non-reserved properties.
9. Defines each enumerable string data property on a fresh
   `Object.prototype` object with `Object.defineProperty`.
10. Defines an own non-enumerable `toJSON: undefined` data property on the
   snapshot to shadow any polluted `Object.prototype.toJSON` hook.
11. Freezes and returns that fresh shallow snapshot.

Nested values are retained by identity. This is intentional compatibility for
ordinary legacy Host actions; Plan E does not broaden into recursive schemas
for every action. The top-level snapshot closes the reserved-metadata
check-to-send race because later caller mutation cannot add a top-level field to
the object that is sent.

The successful decision changes to snapshot semantics:

```ts
export type NonAnalyzeNativeMessageDecision =
    | { ok: true; forwarded: Readonly<Record<string, unknown>> }
    | {
          ok: false
          response: {
              status: 'error'
              error: 'Invalid Extension Native message metadata.'
              error_code: 'invalid_native_message_metadata'
          }
      }
```

The Service Worker and later Plan D send only `guarded.forwarded`. Neither may
send the original object or repeat reserved-key inspection. Plan D invokes the
guard before acquiring a non-Analyze transport lease, so an invalid message
opens no port. Routing may perform the existing descriptor-safe Analyze check
before this guard, but the guard's captured `analyze_error` rejection is
mandatory: a source that changes from an ordinary action during routing to
`analyze_error` during snapshot is denied rather than sent as non-Analyze.

### 4.1 Final wire sender

Task 5 creates a side-effect-free module and direct unit test:

```text
extension/src/background/nativeMessageWire.ts
extension/src/background/nativeMessageWire.test.ts
```

The module exports a wire sender with injected dependencies:

```ts
export interface NativeMessageWireDeps {
    createRequestId(): string
    register(requestId: string): void
    unregister(requestId: string): void
    postMessage(message: Readonly<Record<string, unknown>>): void
}

export function postNativeMessageWire(
    forwarded: Readonly<Record<string, unknown>>,
    deps: NativeMessageWireDeps,
): string
```

`postNativeMessageWire` accepts only an Analyze parser result or a successful
non-Analyze guard snapshot. It captures the trusted input's descriptors once,
requires every enumerable own key to be a string data property, and constructs
a new final wire object without object spread, `Object.assign`, bracket
assignment, or conversion. The only permitted non-enumerable input key is an
own data `toJSON: undefined` safety shadow. It preserves an existing non-empty
primitive string `requestId`; when absent, it calls `createRequestId` once and
requires the same type. An invalid generated ID throws fixed
`Invalid Native message request ID` before registration or post. It defines or
replaces `requestId` as an enumerable own data property, defines an own
non-enumerable `toJSON: undefined` data property, and freezes the wire object.

The function calls `register(requestId)` before
`postMessage(finalWireObject)`. If registration throws, it does not post. If
posting throws, it calls `unregister(requestId)` exactly once and rethrows the
original posting failure without logging or coercing it. On success it returns
the exact request ID. Registration and unregistration operate on only the
trusted primitive ID.

`sendNativeMessage` delegates this construction, registration, and actual port
call to `postNativeMessageWire`. It no longer reads `message.requestId`, uses a
truthy fallback, spreads `message`, or calls `nativePort.postMessage` through
another path. The existing Promise rejection and `nativePort = null` behavior
after a synchronous post failure remains outside the pure helper. The outer
catch does not delete the pending entry again; the injected `unregister`
operation inside `postNativeMessageWire` is the only pending-map cleanup owner
for that failure.

Plan D must reuse `postNativeMessageWire` for the final post on its leased port
or provide an adapter proven to preserve the exact same final-wire and
register-before-post contract. It must not spread or otherwise reconstruct the
guarded snapshot.

Analyze remains governed by its stricter exact schema: a fresh frozen
three-key action, a validated payload, and parse -> acquire -> start -> send on
the same lease. Before freezing the fresh `AnalyzeNativePayload`, its parser
defines an own non-enumerable `toJSON: undefined` data property. Its exact
enumerable schema keys remain unchanged; `Reflect.ownKeys(payload)` additionally
contains only this inert safety key. This shadows polluted
`Object.prototype.toJSON` during recursive Native serialization without
allowing or forwarding a caller-provided hook. This amendment does not relax or
reorder the Analyze path.

## 5. Security and Compatibility Tests

The non-Analyze matrix must prove:

- ordinary enumerable string data survives in a fresh plain frozen object;
- the original object is unchanged and is not returned by identity;
- inherited and non-enumerable ordinary fields are absent from the snapshot;
- own `_persist` and `extension_warnings` are rejected for data, undefined,
  non-enumerable, and accessor descriptors;
- missing/non-string/boxed-string `action`, exact `analyze_error`, and any own
  `toJSON` descriptor receive the fixed denial before transport acquisition;
- a present malformed `requestId` receives the fixed denial, while an absent ID
  is supplied once by the final wire sender;
- a polluted inherited `Object.prototype.toJSON` cannot replace the snapshot
  final wire object, or strict Analyze payload because each serialized boundary
  has an inert own non-enumerable shadow;
- symbol keys, enumerable accessors, throwing descriptor traps, and revoked
  Proxies receive the fixed denial without getter, conversion, logging,
  storage, telemetry, or Native-send side effects;
- a stateful Proxy that reports an ordinary action to the initial routing check
  and `analyze_error` to the guard receives the fixed denial before transport
  acquisition or send;
- a stateful Proxy cannot change the captured snapshot after its one descriptor
  pass;
- adding reserved metadata to the source after a successful guard does not add
  it to the frozen forwarded snapshot;
- `postNativeMessageWire` registers before invoking its injected `postMessage`,
  and that spy receives one frozen wire object with the exact enumerable action
  fields plus one safe request ID and no serialized `toJSON` key;
- the Analyze payload reaching the `postMessage` spy is the parser-owned frozen
  payload with exact enumerable schema fields plus one non-enumerable inert
  `toJSON` property; polluted inherited hooks and caller hooks are never called;
- a request-ID-less `get_config` receives one generated ID and remains
  correlatable, while an Analyze action preserves its parser-owned ID;
- a synchronous post failure unregisters the same ID once and does not retry,
  reconnect, coerce, or log the rejected message;
- the Service Worker/Plan D seam posts only the wire sender's final object and
  never reopens or reacquires a transport for a denied message.

Nested object identity preservation is also asserted so this focused fix does
not silently become a deep migration of existing Host action payloads.

## 6. Corrected TDD Sequence

### 6.1 Shared utility

`ownData.test.ts` is written before `ownData.ts`. Its first isolated run may be
the sixth permitted missing-module RED in Plan E. A compile-only shell is then
created and the test is rerun to obtain assertion-based RED before the helper is
implemented. All later consumers import the established helper.

The Plan E missing-module allowlist is therefore exactly:

```text
extension/src/utils/ownData.ts
extension/src/utils/bookmarkItems.ts
extension/src/background/analyzeRequestHandler.ts
extension/src/utils/pageIdentity.ts
extension/src/utils/analyzeRequest.ts
extension/src/utils/nativeUpdateError.ts
```

### 6.2 Task-specific corrections

- Task 4 writes and runs the Reset-owner test before adding the owner key to
  Reset behavior.
- Task 5's compile-only shell exports
  `guardNonAnalyzeNativeMessage` before any behavioral rerun imports it.
- Task 5 writes `nativeMessageWire.test.ts` before
  `nativeMessageWire.ts`; the first RED uses a compile-only export shell, then
  fails named assertions for safe request-ID augmentation,
  register-before-post ordering, inherited-`toJSON` containment, and post
  cleanup. Missing-module or missing-export failure is not evidence for this
  module.
- Task 6 declares and writes both the post-run textarea-replacement test and
  the deferred hydration A-to-B test before their respective RED commands.
- Task 8 places the ingress test `delivers only the normalized error to runtime,
  tab, and FAB DOM` in `nativeUpdateError.test.ts`. Its delivery RED command
  includes that file and title in addition to the Options, FAB, and
  content-bridge files/titles. Verbose output must show all four titles and all
  four must fail their intended assertions before delivery implementation.

Every behavioral RED must collect and execute its named test, then fail an
assertion for the missing behavior. Missing exports, collection failures, zero
matched tests, and unrelated setup failures are not evidence.

Every filtered Vitest command uses `--reporter=verbose` and only titles declared
verbatim in the preceding test-writing step. Full-file or multi-file commands
without `-t` may use `--reporter=dot`.

## 7. Commit Scope and Evidence

Task 1's file set expands to include `ownData.ts` and `ownData.test.ts`. Each
Task 1-8 commit must, immediately before `git commit`:

1. Read `git diff --cached --name-only`.
2. Compare it as a set against that task's exact listed file allowlist.
3. Stop if any expected path is missing or any additional path is staged.

Unrelated unstaged or untracked work may remain and must not be modified. This
rule supplements, rather than replaces, the existing prohibition on staging
unrelated changes.

Task 9 records the corrected RED sequence, the sixth missing-module allowance,
the shared utility mutation evidence, the non-Analyze snapshot mutation proof,
and exact staged-scope checks in the final evidence report. Its focused
Extension suite includes `src/utils/ownData.test.ts` and
`src/background/nativeMessageWire.test.ts`. Its parser-boundary no-coercion scan
includes `extension/src/utils/ownData.ts` and
`extension/src/background/nativeMessageWire.ts`. A static sender scan rejects
object spread of a Native message and requires the Service Worker to call
`postNativeMessageWire`; direct `nativePort.postMessage` is allowed only in the
one injected production adapter passed to that helper.

## 8. Plan and Base Handling

The existing `plan-e-base.txt` value remains the immutable Plan E integration
base because this correction is authored before any Plan E product or test
change. The correction spec and repaired plan are planning documentation, not
Task 1-8 product implementation. Task 9 must identify their commits separately
and must not misrepresent them as Task 1-8 product commits.

The repaired preflight is resumable. When `plan-e-base.txt` is absent, it
restores only the declared base
`0dbb4852931b50153fb898b03129ae0092c46404` after validating that commit and the
A-C evidence as ancestors of current HEAD and proving no Plan E product/test
path differs from that base. It never captures current HEAD or another dynamic
value. When the file already exists, it reads and validates one lowercase
40-hex SHA plus LF, requires that exact declared base, verifies the same
ancestry and no-product-drift conditions, confirms every Plan D sentinel
remains absent, and leaves the file byte-for-byte unchanged. A mismatch stops
execution.

Task 9's integration-range path inventory explicitly allows these two planning
documentation paths in addition to the exact Task 1-8 file map:

```text
docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md
docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md
```

Both Plan-E-only review packages include the planning changes because their
immutable range starts at `plan-e-base.txt`. The evidence report identifies the
planning commits separately from the eight product/test task commits.

After this spec is committed and reviewed, the implementation plan must be
revised in place to incorporate every correction above. No Task 1 product or
test edit may begin until that repaired plan has been reviewed and committed.

## 9. Out of Scope

- Recursive cloning or per-action schemas for every non-Analyze Host action.
- Any Plan D runtime, updater, installer, gate, or coordinator implementation.
- Product version, package dependency, release asset, registry, installed-file,
  AppData, MyCases, or authenticated model changes.
- Changes to the approved bookmark, Analyze, SPA identity, one-request Root,
  update-error, or config-acknowledgment product behavior except where required
  to close the contradictions defined in this amendment.

## 10. Acceptance Criteria

- One descriptor-safe generic own-data classifier is shared by Tasks 4, 5, 7,
  and 8; no equivalent local `analysisField`, `ownField`, or
  `ownDataProperty` implementation remains.
- No successful non-Analyze decision returns the untrusted source by identity.
- Reserved Extension metadata cannot be introduced between guard and send.
- A source cannot bypass Analyze parsing by changing its action between the
  initial routing check and the non-Analyze guard snapshot.
- Native serialization cannot replace the checked top-level snapshot through a
  boxed action or caller-provided `toJSON` hook.
- Recursive Native serialization cannot replace the strict Analyze payload
  through an inherited `toJSON` hook.
- Request-ID augmentation cannot discard the safe snapshot or its serialization
  protection, and request-ID-less legacy actions remain correlatable.
- Invalid non-Analyze metadata returns the fixed denial before transport
  acquisition or Host send.
- Every production behavior has valid test-first RED evidence.
- Every filtered title exists before execution and runs under the verbose
  reporter.
- Every Task 1-8 commit contains exactly its allowed staged paths.
- The repaired Plan E remains within the frozen `A -> B -> C -> E -> D`
  execution order and leaves all Plan D sentinels absent.
