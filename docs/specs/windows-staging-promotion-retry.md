# Windows Staging Promotion Retry

## Atomic Publication

[UpdateEngine](../../host/update_engine.py) publishes a verified workspace only
with `os.replace(preparing_root, transaction_root)`. The roots are
`updates/transactions/<id>.preparing` and `updates/transactions/<id>`.
Prepared journal, ownership plan, probe manifest, and staged files are verified
before promotion; active authority is written only after success.

This retry handles transient Windows locks without copying/deleting the workspace,
rebuilding it, weakening validation, or retrying journal/copy/probe/hook/active
writes. It does not identify which external process held a lock.

## Retry Eligibility

At most three total replace attempts, with exactly 50 ms after the first
retryable failure and 200 ms after the second. Retry requires all of:

- Windows platform;
- `OSError` with `type(error.winerror) is int` and value exactly `5`, `32`, or `33`;
- another attempt remains;
- final root remains absent lexically and canonically;
- the complete preparing candidate still revalidates as exact, contained,
  non-reparse state.

Error 5 is broader access denial, not proof of a sharing lock. State checks and
the fixed budget bound its retry. Non-Windows/non-allowlisted errors, hooks, and
general `PreparedTransactionConflict` failures are not retried.

## Validation Checkpoints

`_require_preparing_promotion_candidate` validates before the first replace,
after each retryable failure before sleeping, and after sleeping immediately
before another replace. It requires:

- plain contained `updates`, `transactions`, preparing root, and lexical parents;
- the complete prepared journal equal to the expected transition, including ID,
  initiator, versions, fresh flag, ownership digest, failure lineage, initiating
  process identity, and seed receipt;
- exact ownership bytes/digest and `probe/update-manifest.json`;
- exact staged Host/Extension tree inventory and digests;
- only expected workspace files/directories, with no extra or reparse descendants.

A changed candidate, appeared destination, or failed state read aborts without
another replace. A successful replace is followed by final-root workspace
validation before returning. First-attempt success has one preparing checkpoint;
one retry has three; exhausted three attempts have five. The final failure has
no remaining sleep/retry.

## Failure and Dependency Boundaries

The existing preparation wrapper returns fixed `PreparedTransactionConflict`;
raw OS text is not persisted or exposed. Exhaustion preserves verified preparing
evidence rather than publishing active/final authority.

Private seams `_replace_path = os.replace`, `_sleep = time.sleep`, and
`_is_windows = os.name == "nt"` keep deterministic fixtures separate from
production behavior. The public `UpdateEngine` constructor remains `install_root`
with keyword-only `mutex_factory` and `hooks`. Before/after operation hooks wrap
one logical promotion, not each retry; hook failure stays outside the retry loop.

See [transaction architecture](runtime-transaction-data-boundaries.md#5-journaled-update-transaction)
and [retry fixtures](../../host/test_update_engine_resume.py). These references
define behavior, not instructions to run filesystem experiments or full suites.
