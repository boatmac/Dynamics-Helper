# Plan E Build Asset And Vitest Identity Correction Design

> **Partial supersession:** Task 9 evidence orchestration was replaced by
> `2026-08-24-plan-e-task-9-evidence-correction-design.md`. The public default asset
> correction remains valid; do not remove it or rebuild the retired executor.
> Current development entry: `docs/session-handoff-2026-07-15.md`.

**Status:** Accepted
**Date:** 2026-08-23
**Authorized during:** Plan E scripted-executor plan review

## Purpose

Correct three verified prerequisites before Plan E execution:

1. Restore the tracked public `extension/items.json` required by CRXJS and
   runtime default-menu loading.
2. Validate Vitest results with scoped selector multisets instead of an invalid
   global-title uniqueness assumption.
3. Restore the complete accepted Windows promotion retry test class and seven
   literal independent RED invocations to the Plan E plan.

This correction does not change extension behavior beyond restoring the public
default asset already accepted on canonical `master`. It does not restore any
private/local menu data, change Windows retry behavior, or relax Task 6/7
evidence boundaries.

## Authority

This design amends `2026-08-22-plan-e-scripted-evidence-executor-design.md` only
for the added build-asset paths, Vitest assertion identity, exact promotion-test
restoration, commit sequence, and path counts. The scripted executor architecture
and all other accepted specifications remain authoritative.

This design commit is one path with subject
`docs(extension): define Plan E public asset correction`. The next revised Plan
E plan is its direct one-path child with subject
`docs(update): integrate Plan E build prerequisites`.

## Public Asset Provenance

The public asset is copied only from canonical repository commit
`6e501b536cb2693d68bb7d2ece38544ae3ad5c1d`, where it was accepted as
`fix(extension): track public default menu`.

Exact provenance:

| Path | Git blob SHA-1 | File SHA-256 |
|---|---|---|
| `extension/items.json` | `2fa48bf2a60af716c36ed9ee9f80ed83af3e0530` | `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25` |
| `.gitattributes` | `f40b738f6e25d1e45d6400414b3bad8536138712` | `2be83d22f91add38d54a1eda87fa02e3654c9fec3375d5fc72792a7094db6bda` |

The asset is 692 bytes, 28 LF lines, no BOM, and contains exactly five public
nodes: User Guide, Releases, Report a Bug, the containing folder, and public
About markdown. Links are credential-free public HTTPS URLs under
`github.com/boatmac/Dynamics-Helper`.

Do not copy canonical `.gitignore` wholesale. Modify the Plan E branch's
existing `.gitignore` only by deleting its exact standalone `items.json` line;
all other branch-specific ignore lines remain byte-identical.

Create `.gitattributes` with exactly:

```text
extension/items.json text eol=lf
```

No installed, ignored, rescued, local, or user-specific menu file is an
authorized source.

All SHA-256 values above and below hash canonical Git blob bytes, not checkout
bytes. Gates verify both the locked Git blob SHA-1 and blob-byte SHA-256 via
`git cat-file blob`, so `core.autocrlf` cannot change provenance. The staged
blob IDs must exactly match before each asset commit.

## Asset TDD

Use the canonical public contract test from commit
`60ee0f2b7ca6784ca12dba8c2bbe66ce338fdef5`:

| Path | Git blob SHA-1 | File SHA-256 |
|---|---|---|
| `extension/test/defaultItems.test.mjs` | `a43893359255c5e1573fdee19569f8cd20dde73f` | `b2c4f1e291dbc1862f8ae3a9f1bbaffc7483345b09ccd8d45767f9f7eaa9ce39` |

The test runs independently with:

```text
node --test extension/test/defaultItems.test.mjs
```

TDD sequence:

1. Add only the exact test bytes while `extension/items.json` is still absent.
2. Run the test and require collection followed by failure because the source
   asset does not exist. A syntax/import failure is invalid RED.
3. Commit the one test path with subject
   `test(extension): define Plan E public default asset`.
4. Add exact `extension/items.json`; add exact `.gitattributes`; delete only the
   standalone `items.json` ignore line.
5. Run the five tests and require 5 pass, 0 fail.
6. Run the extension production build and require source/dist asset byte
   identity and the exact SHA-256 above.
7. Commit exactly `.gitattributes`, `.gitignore`, and `extension/items.json`
   with subject `fix(extension): restore public default asset`.

The existing Plan E `Options.collapseFolders.test.ts` remains untouched; do not
cherry-pick canonical's older version.

The scripted evidence CLI test suite locks the asset provenance, build copy,
release safety, and exact source/dist hash. The asset remains a normal product
path in the reviewed range, not one of the 58 final evidence artifacts.

## Vitest Assertion Identity

Vitest 3.2.4 JSON output has file path at `testResults[].name` and assertion
fields `ancestorTitles`, `title`, and `fullName`. Parameterized rows can share
all these logical selector fields; duplicate titles are valid.

Replace the global uniqueness rule with the multiset selector:

```text
(
  normalized repository-relative testResults[].name,
  exact assertionResults[].ancestorTitles,
  exact assertionResults[].title
)
```

Validation rules:

- normalize file paths to contained repository-relative POSIX paths;
- preserve selector multiplicity with a multiset/counter;
- require exact test-file inventories;
- require `sum(assertionResults) == numTotalTests` and exact status/counter
  reconciliation;
- require each named test by exact file, ancestor titles, and title, with an
  explicit expected multiplicity when parameter-row coverage matters;
- require every matching occurrence to have the expected status;
- require the focused selector multiset to equal the full-run multiset
  restricted to focused files;
- require `fullName` to equal the derived ancestor/title join, but never use it
  as unique identity;
- use `testResults.length` as file count, not nested suite counters.

Executor tests cover duplicate titles across files, duplicate parameter rows,
wrong multiplicity, malformed `fullName`, missing named selectors, and
focused/full multiset drift.

## Promotion Test Restoration

Restore the exact `PreparingPromotionRetryTests` class payload from committed
Plan E plan blob `476760dee46de0273d4b3beb2b8e5452e790d6df` at commit
`cba1030baf6508d08d6ce67ac40728ebdd47f199`:

- exact class payload SHA-256:
  `e64ecfcaa73a7dc62ea0c9216027ac81a907ecc16069fd3076839f1492940815`;
- exact payload size: 31,014 UTF-8 bytes, 759 lines;
- 13 helper methods and 8 test methods;
- exact import replacement and class-map edit from that committed plan.

The required new imports include `inspect`, `os`, `stat`, `time`,
`SimpleNamespace`, `mock`, module `update_engine`, `ActiveTransaction`, and
`read_active_transaction`.

The plan provides seven separate literal, stateless one-test RED commands for:

```text
test_windows_access_denied_retries_atomic_preparing_promotion
test_windows_sharing_errors_32_and_33_are_retryable
test_persistent_windows_promotion_lock_stops_after_three_attempts
test_non_windows_or_unlisted_promotion_errors_are_not_retried
test_preparing_promotion_revalidates_before_and_after_sleep
test_preparing_promotion_revalidation_rejects_every_authority_mismatch
test_preparing_promotion_hooks_wrap_the_logical_operation_once
```

Each command requires one collected test, `Ran 1 test`, one assertion failure,
exit 1, and no import/collection/setup/error/skip failure. The constructor
control runs separately and passes. Do not restore the obsolete embedded
PowerShell promotion executor.

## Revised Commit Sequence

The sequence after this design is:

1. Revised plan, one path.
2. Public asset RED, one path.
3. Public asset GREEN, exactly three paths.
4. Executor RED, exactly two paths.
5. Executor implementation, one path.
6. Promotion RED, one path.
7. Promotion implementation, one path.
8. Optional separately authorized review fixes on existing reviewed paths.
9. Final evidence commit, exactly 60 paths.

Each commit is the direct child of the prior commit until optional reviewed
fixes. Exact subjects are those defined above and in the scripted-executor/
Windows-retry designs.

## Path Arithmetic

The prior scripted design projected 65 reviewed paths. This correction adds
five unique reviewed paths:

```text
docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md
.gitattributes
extension/items.json
extension/test/defaultItems.test.mjs
.gitignore
```

Therefore:

- reviewed range: exactly 70 paths;
- final evidence commit: unchanged at exactly 60 paths;
- base-to-final union: exactly 130 paths;
- final artifact manifest: unchanged at exactly 58 paths.

All repeated plan/CLI inventories and tests use 70/130. `.gitignore` was already
tracked in the base but is newly changed in the Plan E range, so it is one of
the five unique additions.

## Acceptance Criteria

- Public asset provenance and bytes match the locked canonical blobs/hashes.
- Asset test proves RED before asset restoration and five GREEN tests afterward.
- Production extension build succeeds with byte-identical source/dist asset.
- No private, ignored, or user-specific menu data is imported.
- Vitest validation accepts legitimate duplicate selectors while preserving
  exact multiplicities and named-test requirements.
- Full promotion test class/import/class-map contract is restored exactly.
- Seven promotion behavior RED selectors run independently and fail assertions.
- Scripted executor remains the only evidence implementation.
- Reviewed/final range counts are exactly 70/130; 58/60 evidence counts remain.
