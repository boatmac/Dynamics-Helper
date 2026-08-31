# Alignment Beta Release Progress

## Resume Point

- Worktree: `C:\MyWorkbench\Repository\Dynamics-Helper-alignment-rc`
- Branch: `release/alignment-2.0.75-beta.1`
- Base: `1ba54f310bba59ed3243efd45abe57d0c7a86d1f`
- Target version: `2.0.75-beta.1`
- Current phase: release-candidate commit preparation
- Last completed: authorized cache exception passed RED/GREEN, hydration-race review, Extension 343/343, and production build
- Next action: commit complete tracked RC source, then run exact-commit rebuild and verification
- Publication authorization: approved by the user on 2026-08-31, conditional on every test/build/artifact gate passing

## Scope Seal

- Include completed prompt-source alignment and its ten reviewed fix waves.
- Include the complete public `items.json` build prerequisite.
- Exclude all later Plan A-E product implementation and Plan D planning.
- Publish Extension and matching Native Host together; never publish Extension alone.
- Build Host with PyInstaller `6.22.2`.

## Gate Status

| Gate | Status | Evidence |
|---|---|---|
| Isolated RC worktree | PASS | branch and base above |
| Public-menu source boundary | PASS | commits `38a397d..0f56a87`; Node contract 5/5 |
| Toolchain | PASS | Python 3.13.15; SDK 1.0.5; PyInstaller 6.22.2; Node 24.11.0; npm 11.6.1 |
| Version and notes | PASS | six runtime/package carriers agree; lockfile root synchronized; notes exclude unfinished work |
| Prompt alignment tests | PASS | Host focused 146/146 after review fixes; Extension 210/210 |
| Complete Host tests | PASS | 210/210; failures 0 |
| Complete Extension tests | PASS | 343/343 across 19 files; failures 0 |
| Extension build | PASS | TypeScript; 2,218 modules; default-menu byte identity; version 2.0.75-beta.1 |
| Host frozen build/probe | PASS | SDK 1.0.5; PyInstaller 6.22.2; isolated SDK health; EXE SHA-256 `13cf520e2e0dd2c1859387ddd1ca7b6fa18139b87514f4d623bbc4fa5555cc5d` |
| ZIP validation | PENDING | pre-commit candidate passed 69 entries/54 files; removed before exact-commit rebuild |
| Exact-commit rebuild | PENDING | not run |
| Tag and GitHub prerelease | PENDING | not created; nothing pushed or published |

## Observations

- `npm ci` reported 13 existing dependency advisories. `npm audit --omit=dev`
  reported eight high-severity transitive advisories and no critical advisory.
  Automatic dependency upgrades are outside this beta and were not applied.
- Vitest `list --json` did not terminate within 180 seconds and produced no
  partial file or surviving process. Test progress therefore uses the committed
  340-test/19-file baseline and reconciles actual batch totals to that value.
- SDK 1.0.5 is pinned in tracked requirements. The model-list boundary also
  filters future unsupported reasoning efforts before they reach the UI.
- Review round 3 of 3 found one remaining Important issue: a fresh 24-hour
  `dh_model_list` cache created by an older Host can still contain an unsupported
  effort such as `max`. The new Host filter is bypassed while that cache remains
  fresh, so the UI can display a value the Host later ignores. Per the three-round
  limit, execution stopped and reported instead of starting a fourth fix/review.
- The user authorized one bounded exception. Cache normalization is now shared by
  cached and Host model lists, unsupported persisted efforts are cleared only
  after Host hydration against the latest preferences, missing models preserve
  their values, and StrictMode persists the repair once. RED reproduced both the
  stale-cache bug and the hydration race; cache tests passed 3/3, Options 154/154,
  full Extension 343/343, and final review reported no Critical or Important
  finding.

## Interruption Recovery

1. Read this file and run `git status --short --branch` in the worktree above.
2. Do not operate in the Plan D worktree.
3. Resume only the first `PENDING` gate after confirming all earlier PASS evidence.
4. If a source feature is partially applied, finish or abort that unit before any later gate.
5. Never create the tag unless every local gate through exact-commit rebuild is PASS.
