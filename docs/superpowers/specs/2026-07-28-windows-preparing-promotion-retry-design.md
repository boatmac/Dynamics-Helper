# Windows Preparing Promotion Retry Design

**Status:** Accepted
**Date:** 2026-07-28
**Authorized during:** Plan E final verification

## 1. Purpose

Make the existing Plan B atomic promotion from a verified `.preparing`
transaction workspace to its final transaction root tolerate short-lived
Windows access-denied/sharing-lock errors. Plan E final Host verification reproduced
`PermissionError: [WinError 5]` at this exact promotion with fresh isolated
directories. A controlled open descendant handle produced the same failure;
closing it allowed immediate replay. That experiment supports a transient
external handle hypothesis but does not identify the owning process. Windows
errors 32/33 are included because they are the explicit sharing/lock variants;
error 5 remains broader `ERROR_ACCESS_DENIED` and is safe to retry only under
the state and budget checks below.

This is a narrowly authorized cross-plan fix. It does not redesign the update
journal, change publication order, or weaken transaction validation.

## 2. Preserved Contract

`os.replace(preparing_root, transaction_root)` remains the only publication of
the final transaction workspace. The prepared journal, ownership plan, probe
manifest, and staged files are all verified before the first attempt. Active
state is written only after promotion succeeds.

The implementation must not:

- copy and delete the workspace;
- use a non-atomic fallback;
- retry candidate, journal, ownership, copy, probe, hook, or active writes;
- retry general `PreparedTransactionConflict` failures;
- delete or rebuild the verified preparing workspace between attempts;
- touch live product files, registry state, or real update state in tests.

## 3. Retry Contract

Promotion has at most three total attempts. After retryable failures, production
waits exactly:

```text
after attempt 1: 50 ms
after attempt 2: 200 ms
```

A failure is retryable only when all of these are true:

1. The platform is Windows.
2. The exception is an `OSError`, `type(error.winerror) is int`, and the value
   is exactly `5`, `32`, or `33`.
3. The complete preparing journal, ownership, probe manifest, staged files,
   lexical/canonical containment, and non-reparse workspace still revalidate as
   the exact candidate.
4. `transaction_root` still does not exist.
5. Another attempt remains.

One private helper
`_require_preparing_promotion_candidate(package,candidate,candidate_bytes,paths,staging)`
owns complete source/destination validation. It requires:

- final `transaction_root` absent lexically and canonically;
- `updates_root`, `transactions_root`, preparing root, and every lexical parent
  between them to be real directories, contained under the fixed install root,
  and not symlink/reparse points;
- preparing journal to equal the full
  `transition(staging, JournalPhase.PREPARED)` value, including transaction ID,
  initiator, target/prior versions, fresh flag, ownership digest, failure fields,
  initiating process, and seed receipt;
- ownership bytes/digest exact;
- probe manifest exact;
- exact Host and Extension staged tree inventories and digests;
- the complete workspace inventory to contain only the expected directories
  and files: `journal.json`, `ownership.json`, `probe/update-manifest.json`,
  `staged/host/**`, and `staged/extension/**`, with no unsupported or reparse
  descendant.

This helper runs before the first replace, after each classified transient
failure, and after each sleeper immediately before another replace. Tests record
the exact call sequence. A first-attempt success calls it once. A one-retry
success calls it three times: initial, failure/pre-sleep, and post-sleep. Three
exhausted attempts call it five times: initial plus pre/post-sleep checkpoints
for the first two failures; the final failure has no remaining retry and is
wrapped immediately. A focused matrix independently mutates every prepared
journal field (including seed receipt), ownership, probe, Host tree, Extension
tree, extra topology, root/parent/descendant reparse classification,
destination creation, and state-read failure at both the pre-sleep and
post-sleep checkpoints. Pre-sleep fault rows assert zero sleeper calls. Separate
mutations remove the initial, failure/pre-sleep, and post-sleep helper calls;
the matching call-count/state-corruption rows must fail each mutation.

The complete source/destination state is therefore validated after each classified
transient failure, before invoking the sleeper, and again after the sleeper
immediately before another replace attempt. A changed/corrupt/reparse state,
destination appearance, or state-read error is never retried and immediately
follows the existing fixed `PreparedTransactionConflict` semantics.

After the third classified transient failure, the original promotion operation fails
through the existing preparation wrapper and is exposed only as the existing
fixed conflict type. Raw OS messages are not persisted, returned to the
Extension, or logged by this change.

Non-Windows errors, Windows errors outside the allowlist, hooks, and state
conflicts are attempted once.

## 4. Dependency Boundary

The frozen public `UpdateEngine` constructor remains byte-for-byte unchanged.
The module defines three private production seams:

```py
_replace_path = os.replace
_sleep = time.sleep
_is_windows = os.name == "nt"
```

Production calls these defaults. These are the only new production seams.
Focused tests patch them and may also temporarily patch existing filesystem APIs
(`Path.lstat`, reads, and inventory walks) solely to inject deterministic
revalidation corruption/read/reparse faults; every patch is restored in test
cleanup. No hook or public dependency surface changes.

`_sleep` is used only for the two promotion retry delays, with exact arguments
`0.05` and `0.2`; elapsed wall-clock duration is not asserted. Tests patch
`_replace_path` to fail only when source/destination equal the exact promotion
paths. Existing before/after filesystem hooks execute once around the logical
promotion operation; hook failures are outside the retry loop and are never
retried.

## 5. Required Tests

Add focused tests proving:

1. First promotion attempt raises Windows error 5, source remains and target is
   absent, second attempt succeeds, result is `PREPARED`, attempts equal two,
   delay equals `[0.05]`, final workspace is exact, `.preparing` is absent,
   active is written, and live product bytes are unchanged.
2. Three Windows sharing violations produce exactly three attempts and delays
   `[0.05, 0.2]`, then the existing fixed conflict; active/final root remain
   absent and verified `.preparing` evidence remains. The fixed conflict retains
   the final allowlisted `OSError` as its cause.
3. Windows errors 32 and 33 are classified as retryable.
4. Patch the private Windows discriminator used by the implementation to false;
   the same error receives one attempt and no delay. A non-allowlisted Windows
   error and a generic `OSError` also receive one attempt and no delay.
5. If source disappears, target appears, a preparing file changes, a reparse
   component appears, or any revalidation read fails either before or after the
   sleeper, no further promotion attempt occurs and the existing fixed conflict
   is raised.
6. Existing operation-hook order remains one before/after operation pair for the
   logical promotion, not one hook transition per retry attempt.
7. `inspect.signature(UpdateEngine)` remains exactly the pre-change constructor:
   positional `install_root`, keyword-only `mutex_factory` and `hooks`, with no
   sleeper/replace/platform parameter.

Mutation proof temporarily removes the retryable Windows classification or the
attempt bound; the corresponding focused test must fail before restoration.

## 6. Verification And Evidence

After the focused change:

- run the focused retry tests;
- run `host.test_update_engine_resume`;
- run all Plan A-C update/package/recovery gates already required by Plan E;
- run full isolated Host discovery in fresh six-directory phase roots;
- run source compile verification;
- rerun Plan E Steps 1-8 at the new committed head;
- regenerate both immutable review packages and repeat both controller reviews.

Plan E evidence records this design, the authorization, the original and
controlled `WinError 5` observations, RED/GREEN/mutation output, exact retry
parameters, and the later clean full Host run. It does not erase the historical
failures.

## 7. Scope

Product/test scope is limited to:

```text
host/update_engine.py
host/test_update_engine_resume.py
```

The Plan E implementation plan must be committed before product implementation.
Task 9 Step 1's literal `$expectedRangePaths` is expanded by these two Host paths
plus this spec: 60 paths total, and its expected prose/count is updated from 57
to 60. Its prerequisite prose/checks explicitly permit the authorized
`host/update_engine.py` delta only through this committed design and require the
focused retry evidence before readiness. The final evidence report records the authorized exception; both review
packages include the entire expanded range. No Plan D implementation, product version,
dependency, installer, registry, package, release, or publish change is in
scope.
