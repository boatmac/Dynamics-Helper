# Alignment-Only Beta Release Design

**Status:** Approved on 2026-08-31

## Goal

Publish one testable beta containing the completed prompt-source alignment without
shipping the later unfinished transactional-update and installer work.

## Source Boundary

- Base product commit: `1ba54f310bba59ed3243efd45abe57d0c7a86d1f`.
- Add the complete public default-menu asset, contract test, build preflight, and
  user/developer documentation from the reviewed `60ee0f2..bfedc9f` change set.
- Do not include Plan A, B, C, D, or E product commits.
- Release version: `2.0.75-beta.1`.

The public-menu change is required because the base manifest exposes
`items.json`, but the base commit does not track that file. The complete change
is included as one release-candidate unit; no test-only or asset-only state may
be tagged or published.

## Artifact Boundary

The release is a paired product, not an Extension-only update. It contains:

- the built Chrome Extension;
- the matching frozen Native Host;
- the existing installer files expected by this source boundary.

The Host is rebuilt with the separately approved PyInstaller `6.22.2`. Historical
PyInstaller `6.18.0` evidence is not reused as current evidence.

## Verification And Publication

1. Install dependencies only inside the isolated release-candidate worktree.
2. Run prompt-alignment tests, then complete Host and Extension suites in bounded
   batches with cumulative progress reports.
3. Run the public-menu contract and production Extension build.
4. Build and probe the Native Host, then inspect the complete ZIP version and
   required paths.
5. Allow no more than three review/fix rounds. A third blocking result stops and
   is reported.
6. Commit only a complete release candidate. Build and verification precede tag
   creation. Push only the release branch and exact tag, then create and verify a
   GitHub prerelease.

No tag or release is created from a partial implementation or failed gate.

## Out Of Scope

- MyCasesKit coordinator or persistence integration.
- Plan D transactional runtime, direct bootstrap, or quarantine.
- Installation into the operator's real AppData or registry.
- Stable release promotion.
