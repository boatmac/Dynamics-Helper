# Plan E Extension Data and Request Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bookmark, Analyze, SPA identity, per-request Root, update-error, and config-acknowledgment boundaries strict and non-destructive without changing the approved Prompt Scope Cleanup product contract.

**Architecture:** Small shared parsers turn untrusted Chrome storage, packaged JSON, Native Messaging, DOM identity, and update events into explicit typed values before consumers act. One shared own-data primitive underlies the single-property trust boundaries; a frozen shallow non-Analyze snapshot and a pure final-wire sender close mutation, request-ID augmentation, and Native serialization gaps without recursively migrating legacy payloads. A pure Plan E-owned Analyze request handler constructs one exact three-property inner action, atomically acquires an authorized transport lease for that action, then delegates the lease-bound send plus frozen persistence context to the bridge that owns start/completion. The baseline Service Worker supplies an allow-all lease around its current sender; later Plan D must supply a port-specific gated lease without reconnecting under an old authorization. FAB separates live page identity from editable context and forces post-run replacement after a busy identity switch. Plan E exclusively creates and freezes `nativeUpdateError.ts`; later Plan D consumes these contracts while extracting ports and update coordination.

**Tech Stack:** React 19, TypeScript 5.9 strict mode, Chrome Manifest V3 APIs, Vitest 3 with Testing Library/jsdom, Python 3.13 `unittest`, Copilot SDK 1.0.5

## Global Constraints

- Work only in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`. Execution order is frozen: `A -> B -> C -> E -> D`.
- Plan E precondition: reviewed committed Plans A-C are HEAD ancestors; Plan D has not started and none of `extension/src/background/nativePortClient.ts`, `hostGate.ts`, `updateProtocol.ts`, `updateCoordinator.ts`, or `serviceWorker.update.test.ts` exists. Stop on any mismatch; no alternate order is supported.
- Implement only authoritative spec sections 6-10, 11, and 13 Plan E plus the accepted `docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md`, `docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`, and `docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md`. The 2026-08-19 amendment narrowly supersedes only requirements that make unavailable Task 6/7 narrative report bytes the sole completion evidence; every other correction, chronology, TDD, mutation, scope, and fail-closed gate remains authoritative.
- The amendment does not retroactively waive any other historical report, chronology, mutation, commit-scope, or review gate.
- Exactly and only Task 6/7 report slots are replaced; every Task 1-5/8 historical report requirement remains unchanged.
- Use TDD for every production change. Capture each named RED failure before implementation, then matching GREEN and restored mutation proof. Task 6/7 are the sole historical-evidence exception: preserve their accepted report identities, require their exact paths absent, and never claim current-state evidence reconstructs historical RED, GREEN, mutation, reviewer, edit-order, or TDD chronology.
- Parsers must not use `String`, template interpolation, `JSON.stringify`, `toString`, or custom conversion hooks on rejected values. Catch throwing property access and never log rejected raw values.
- Preserve the exact current `MenuItem` storage schema: no ID, no migration, empty labels allowed, valid item types are `folder|link|markdown|back|unknown`, and safe unknown own data remains round-trippable.
- Preserve an explicitly stored empty `dh_items: []`; it is saved user state, not absence.
- Preserve legacy analysis records without `requestId`, finite `durationSec: 0`, the legacy singleton pending/seen keys, and exact case-number-only durable hydration identity.
- Preserve an old Host's missing/empty Root fallback when the new explicit-empty marker is absent. An explicit empty Root from a new Extension applies to one request only.
- `extension_warnings` is Extension-owned response metadata. Never send it, `_persist`, or any other Extension persistence metadata to the Host.
- Keep Options' existing preference, bookmark, Reset, and Team Catalog generation ownership. Never remove `dh_items` during Reset and never let a stale generation apply defaults.
- Plan E retains current baseline direct-port behavior only long enough to normalize update errors and Analyze forwarding safely. Plan D later removes direct-port/UI update ownership while preserving Plan E parser/ordering contracts.
- Automated tests must not touch real user Chrome storage, the registry, installed Extension files, `%LOCALAPPDATA%\DynamicsHelper`, update/publish paths, or authenticated model sessions. Host tests use a fresh temporary `LOCALAPPDATA`; update tests use injected temporary trees only.
- Do not change product versions, package dependencies, release assets, registry state, installed files, MyCases, or real update state. Do not push, tag, publish, or install.
- Authorized Task 9 product/test exception: the Windows retry spec permits only `host/update_engine.py` and `host/test_update_engine_resume.py` to change. The evidence-loss amendment additionally permits only the evidence artifacts and report listed below; it changes no Task 6/7 product/test behavior.
- The 2026-08-19 amendment is evidence-only; it changes no accepted Task 6/7 implementation, tests, commits, or historical report identity.
- The evidence-loss amendment does not change the accepted Windows promotion retry design or its complete RED/GREEN/mutation/AST/commit sequence; every Step 0 gate remains authoritative except the required planning chronology, later 61/121 evidence counts, and the mechanical retained-handle launch routing required by the amendment.
- Tasks 1-8 each end in one independently reviewable commit. Task 9 uses the one-path plan commit `docs(update): integrate Plan E evidence-loss audit`, its direct-child one-path RED commit `test(update): cover locked preparing promotion`, that commit's direct-child one-path implementation commit `fix(update): retry locked preparing promotion`, and one final exact 60-path evidence commit. Compare each complete staged set against its literal allowlist.
- Every standalone TypeScript command runs with tool working directory
  `extension/` as `npm exec tsc -- --noEmit --tsBuildInfoFile
  <exact-token-root-path> -p tsconfig.json`; the build-info path is registered
  before launch. Do not use root-level `npm --prefix extension exec ... -p
  tsconfig.json`, which resolves the project path incorrectly.
- Every filtered Vitest command uses `--reporter=verbose`, titles declared verbatim in the preceding test-writing step, and explicit expected exit handling. “No tests found,” zero matched tests, or unrelated import/configuration failure is never evidence.
- Missing-module import failure is acceptable exactly once as the isolated first RED for each of these six new production modules: `extension/src/utils/ownData.ts`, `extension/src/utils/bookmarkItems.ts`, `extension/src/background/analyzeRequestHandler.ts`, `extension/src/utils/pageIdentity.ts`, `extension/src/utils/analyzeRequest.ts`, and `extension/src/utils/nativeUpdateError.ts`. No other missing module/export is valid RED. After each first import RED, create the task's specified compile-only shell or implementation before any behavioral/multi-file RED; every subsequent RED must import successfully, execute the named test, and fail its assertion. `extension/src/background/nativeMessageWire.ts`, `extension/src/components/ResultPopover.tsx`, and `extension/src/content/updateErrorBridge.ts` are deliberately created as compile-only shells before their first test runs, so their imports may never be used as RED evidence.
- A new export added to an existing module is never valid module-link RED evidence. Before its first run, either add a compile-only production export shell or import the existing module as a namespace, access the candidate through a runtime string key, and fail a named existence/behavior assertion after collection. Task 4 uses and retains namespace access through all parser/ownership RED phases.
- Treat every Task 1-8 shell fence/tool call as a fresh PowerShell process. Task 9 Steps 0-11 are the sole exception: execute all regions in one long-lived foreground controller; after read-only planning preflight, acquire the fixed mutex and create the closed `step0` run lease before any Task 9 write, then atomically transition that same lease to the reviewed-head `evidence` phase after Step 0. Retain both through normal release. Never run a Task 9 writer in a job, background, or detached process.
- Unless a step explicitly says tool working directory `extension/`, run its PowerShell block from the repository root. Independent commands rely only on repository-relative paths and values initialized inside that block.
- TypeScript command audit rule: every executable standalone occurrence is exactly `& npm exec tsc -- --noEmit -p tsconfig.json` while `extension/` is the active location, immediately followed by `if ($LASTEXITCODE -ne 0) { throw ... }`; no other standalone `tsc` form is permitted.

## Plan E Execution Preflight

Before any Task 1-8 file edit, validate or restore the immutable declared integration base in the ignored evidence directory. This block is resumable, self-contained, and changes no process environment. It never captures current `HEAD` as a replacement base:

```powershell
$declaredBase='0dbb4852931b50153fb898b03129ae0092c46404'
& git cat-file -e "$declaredBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Declared Plan E base is not a commit' }
& git merge-base --is-ancestor $declaredBase HEAD
if ($LASTEXITCODE -ne 0) { throw 'Declared Plan E base is not a HEAD ancestor' }
$unchangedABC=@(
    'host/package_archive.py',
    'host/update_recovery.py'
)
foreach ($path in $unchangedABC) {
    & git cat-file -e "$declaredBase`:$path"
    if ($LASTEXITCODE -ne 0) {
        throw "Reviewed A-C prerequisite is absent at declared base: $path"
    }
    & git diff --quiet "$declaredBase..HEAD" -- $path
    if ($LASTEXITCODE -ne 0) {
        throw "Reviewed A-C prerequisite changed after declared base: $path"
    }
    & git diff --quiet HEAD -- $path
    if ($LASTEXITCODE -ne 0) {
        throw "Reviewed A-C prerequisite is dirty: $path"
    }
}
& git cat-file -e "$declaredBase`:host/update_engine.py"
if ($LASTEXITCODE -ne 0) {
    throw 'Reviewed Plan B update engine is absent at declared base'
}
& git diff --quiet HEAD -- 'host/update_engine.py'
if ($LASTEXITCODE -ne 0) { throw 'Plan B update engine is dirty' }
$promotionRetrySpec='docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md'
if (Test-Path -LiteralPath $promotionRetrySpec) {
    $acceptedPromotionSpec='249b1a3750b50db1336fb39661db9306355a1a18'
    & git cat-file -e "HEAD:$promotionRetrySpec"
    if ($LASTEXITCODE -ne 0) { throw 'Windows promotion retry authorization is not committed' }
    $promotionSpecHead=@(& git log -1 --format=%H HEAD -- $promotionRetrySpec)
    if (
        $LASTEXITCODE -ne 0 -or
        $promotionSpecHead.Count -ne 1 -or
        $promotionSpecHead[0].Trim() -cne $acceptedPromotionSpec
    ) { throw 'Windows promotion retry authorization is not the accepted commit' }
    & git diff --quiet $acceptedPromotionSpec HEAD -- $promotionRetrySpec
    if ($LASTEXITCODE -ne 0) { throw 'Windows promotion retry spec changed after acceptance' }
    $authorizedDelta=@(& git diff --name-only --no-renames "$declaredBase..HEAD" -- 'host/update_engine.py' 'host/test_update_engine_resume.py')
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect authorized promotion delta' }
    if (
        $authorizedDelta.Count -ne 0 -and
        ($authorizedDelta.Count -ne 2 -or
            $authorizedDelta -cnotcontains 'host/update_engine.py' -or
            $authorizedDelta -cnotcontains 'host/test_update_engine_resume.py')
    ) { throw 'Authorized promotion delta is not the exact two-path set' }
} else {
    & git diff --quiet "$declaredBase..HEAD" -- 'host/update_engine.py'
    if ($LASTEXITCODE -ne 0) {
        throw 'Reviewed Plan B update engine changed without authorization'
    }
}
$prerequisiteReports=[ordered]@{
    'Plan A'='.superpowers/sdd/package-integrity-plan-a-report.md'
    'Plan B'='.superpowers/sdd/hardening-b-journal-engine-report.md'
    'Plan C'='.superpowers/sdd/hardening-c-detached-recovery-report.md'
}
foreach ($entry in $prerequisiteReports.GetEnumerator()) {
    $path=$entry.Value
    & git cat-file -e "$declaredBase`:$path"
    if ($LASTEXITCODE -ne 0) {
        throw "$($entry.Key) evidence is missing at declared base: $path"
    }
    & git diff --quiet HEAD -- $path
    if ($LASTEXITCODE -ne 0) {
        throw "$($entry.Key) committed evidence is dirty: $path"
    }
    $reportHead=@(& git log -1 --format=%H $declaredBase -- $path)
    if ($LASTEXITCODE -ne 0 -or $reportHead.Count -ne 1) {
        throw "Could not resolve $($entry.Key) evidence commit"
    }
    $reportHead=$reportHead[0].Trim()
    if ($reportHead -notmatch '^[0-9a-f]{40}$') {
        throw "Invalid $($entry.Key) evidence commit"
    }
    & git merge-base --is-ancestor $reportHead HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "$($entry.Key) evidence commit is not a HEAD ancestor"
    }
    "$($entry.Key) evidence commit: $reportHead"
}
$planDSentinels=@(
    'extension/src/background/nativePortClient.ts',
    'extension/src/background/hostGate.ts',
    'extension/src/background/updateProtocol.ts',
    'extension/src/background/updateCoordinator.ts',
    'extension/src/background/serviceWorker.update.test.ts'
)
foreach ($path in $planDSentinels) {
    if (Test-Path -LiteralPath $path) {
        throw "Plan D has already started: $path"
    }
}
$planningDocs=@(
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md',
    'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
)
foreach ($path in $planningDocs) {
    & git cat-file -e "HEAD:$path"
    if ($LASTEXITCODE -ne 0) { throw "Required Plan E planning document is not committed: $path" }
    & git diff --quiet HEAD -- $path
    if ($LASTEXITCODE -ne 0) { throw "Required Plan E planning document is dirty: $path" }
}
$planEProductPaths=@(
    'extension/src/utils/ownData.ts',
    'extension/src/utils/ownData.test.ts',
    'extension/src/utils/bookmarkItems.ts',
    'extension/src/utils/bookmarkItems.test.ts',
    'extension/src/test/chromeMock.ts',
    'extension/src/components/MenuLogic.ts',
    'extension/src/components/Options.tsx',
    'extension/src/components/Options.collapseFolders.test.ts',
    'extension/src/components/Options.test.tsx',
    'extension/src/components/MenuLogic.teamCache.test.ts',
    'extension/src/utils/teamCatalog.ts',
    'extension/src/utils/teamCatalog.test.ts',
    'extension/src/background/teamManifestSync.ts',
    'extension/src/background/teamManifestSync.test.ts',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.bookmarkTelemetry.test.tsx',
    'extension/src/utils/translations.ts',
    'extension/src/utils/analysisStore.ts',
    'extension/src/utils/analysisStore.test.ts',
    'extension/src/hooks/useAnalysisHydration.ts',
    'extension/src/hooks/useAnalysisHydration.test.ts',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/background/resetExtensionState.test.ts',
    'extension/src/background/analyzeBridge.ts',
    'extension/src/background/analyzeBridge.test.ts',
    'extension/src/background/analyzeRequestHandler.ts',
    'extension/src/background/analyzeRequestHandler.test.ts',
    'extension/src/background/nativeMessageWire.ts',
    'extension/src/background/nativeMessageWire.test.ts',
    'extension/src/background/serviceWorker.ts',
    'extension/src/components/ResultPopover.tsx',
    'extension/src/components/ResultPopover.test.tsx',
    'extension/src/components/FAB.promptSourceErrors.test.tsx',
    'extension/src/utils/promptSourceErrors.ts',
    'extension/src/utils/promptSourceErrors.test.ts',
    'extension/src/utils/pageIdentity.ts',
    'extension/src/utils/pageIdentity.test.ts',
    'extension/src/components/FAB.pageIdentity.test.tsx',
    'extension/src/utils/analyzeRequest.ts',
    'extension/src/utils/analyzeRequest.test.ts',
    'extension/src/components/FAB.analyzeRequest.test.tsx',
    'extension/src/background/contextMenu.ts',
    'extension/src/background/contextMenu.test.ts',
    'extension/src/components/FAB.rootPathOverride.test.ts',
    'extension/src/components/FAB.userPrompt.test.tsx',
    'extension/src/utils/prefs.ts',
    'host/dh_native_host.py',
    'host/test_session_workspace.py',
    'extension/src/utils/nativeUpdateError.ts',
    'extension/src/utils/nativeUpdateError.test.ts',
    'extension/src/content/index.tsx',
    'extension/src/content/updateErrorBridge.ts',
    'extension/src/content/updateErrorBridge.test.ts',
    'extension/src/utils/configUpdateResult.ts',
    'extension/src/utils/configUpdateResult.test.ts'
)
$expectedPlanningCommits=@(
    'd606f4f9468ba8757bb1894368f2326c8183890d',
    '249b1a3750b50db1336fb39661db9306355a1a18',
    'd51ca4aabd4a40b91818191424993a8d3ab3cd27'
)
foreach ($commit in $expectedPlanningCommits) {
    & git merge-base --is-ancestor $commit HEAD
    if ($LASTEXITCODE -ne 0) { throw "Approved Plan E planning commit is not a HEAD ancestor: $commit" }
}
$acceptedAmendment='d51ca4aabd4a40b91818191424993a8d3ab3cd27'
$amendmentSubject=@(& git show -s --format=%s $acceptedAmendment)
$amendmentPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $acceptedAmendment)
if ($LASTEXITCODE -ne 0 -or $amendmentSubject.Count -ne 1 -or $amendmentSubject[0] -cne 'docs(evidence): define Plan E report-loss boundary' -or $amendmentPaths.Count -ne 1 -or $amendmentPaths[0] -cne 'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md') { throw 'Accepted evidence-loss amendment preflight mismatch' }
$committedDrift=@(& git diff --name-only --no-renames "$declaredBase..HEAD" -- $planEProductPaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect committed Plan E drift' }
$workingDrift=@(& git status --porcelain=v1 --untracked-files=all -- $planEProductPaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect working Plan E drift' }
if ($committedDrift.Count -ne 0 -or $workingDrift.Count -ne 0) {
    throw 'Plan E product/test drift exists before execution'
}
$basePath=Join-Path (Get-Location) '.superpowers/sdd/plan-e-base.txt'
$expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes(
    $declaredBase + "`n"
)
if (Test-Path -LiteralPath $basePath) {
    $beforeBaseBytes=[IO.File]::ReadAllBytes($basePath)
    if ([Convert]::ToHexString($beforeBaseBytes) -cne [Convert]::ToHexString($expectedBaseBytes)) {
        throw 'Existing Plan E base evidence is not the declared SHA plus LF'
    }
} else {
    New-Item -ItemType Directory -Path '.superpowers/sdd' -Force | Out-Null
    [IO.File]::WriteAllBytes($basePath, $expectedBaseBytes)
    $beforeBaseBytes=[IO.File]::ReadAllBytes($basePath)
}
& git check-ignore -q -- '.superpowers/sdd/plan-e-base.txt'
if ($LASTEXITCODE -ne 0) { throw 'Plan E base evidence is not ignored' }
$afterBaseBytes=[IO.File]::ReadAllBytes($basePath)
if ([Convert]::ToHexString($beforeBaseBytes) -cne [Convert]::ToHexString($afterBaseBytes)) {
    throw 'Plan E base evidence changed during validation'
}
```

The controller confirms human review/signoff for the printed prerequisite and planning commits; automation proves those commits and representative A-C implementation files are committed ancestors of current HEAD and unchanged after the declared base. Expected: all checks pass, every Plan D sentinel is absent, no Plan E product/test path differs from the declared base, and `.superpowers/sdd/plan-e-base.txt` contains exactly `0dbb4852931b50153fb898b03129ae0092c46404` plus LF and is ignored by Git. An existing correct file remains byte-for-byte unchanged; an absent file is restored only to that declared value.

---

## File Map and Locked Interfaces

### New files

- `extension/src/utils/ownData.ts`: shared descriptor-safe single own-data-property classifier.
- `extension/src/utils/ownData.test.ts`: absence/data/accessor/proxy/revocation/no-coercion contract.
- `extension/src/utils/bookmarkItems.ts`: exact `MenuItem` type, strict recursive bookmark parser, discriminated saved/default readers, and scoped storage wrappers.
- `extension/src/utils/bookmarkItems.test.ts`: parser, default-file, storage absence/failure, cycle, depth, accessor, prototype, and unknown-own-data matrix.
- `extension/src/utils/analysisStore.test.ts`: persisted-schema, latest-owner, completion ordering, cleanup retry, warning order, and Reset-owner tests.
- `extension/src/utils/pageIdentity.ts`: opaque case-first/title-fallback `PageIdentity` parser.
- `extension/src/utils/pageIdentity.test.ts`: precedence, empty, malformed, and no-coercion identity tests.
- `extension/src/utils/analyzeRequest.ts`: immutable request identity and one-invocation Root snapshot helpers.
- `extension/src/utils/analyzeRequest.test.ts`: page-match and Root missing/malformed/explicit-empty matrix.
- `extension/src/background/analyzeRequestHandler.ts`: pure exact-schema parse/atomic-transport-acquisition/persist-forward routing boundary used by the baseline Service Worker and later Plan D gate.
- `extension/src/background/analyzeRequestHandler.test.ts`: exact parse-before-acquire, denial, lease-bound start/send, disconnect, exact-envelope, and no-double-wrap tests without importing `serviceWorker.ts`.
- `extension/src/background/nativeMessageWire.ts`: pure final Native wire construction, request-ID registration, serialization shadow, and post cleanup.
- `extension/src/background/nativeMessageWire.test.ts`: safe request-ID augmentation, register-before-post, inherited-`toJSON`, and unregister-on-post-failure tests.
- `extension/src/components/FAB.pageIdentity.test.tsx`: busy SPA switch, stale UI suppression, and post-run full-scan component tests.
- `extension/src/components/FAB.analyzeRequest.test.tsx`: context-menu Root applies to exactly one request and normal requests re-read preferences.
- `extension/src/utils/nativeUpdateError.ts`: Plan E-owned source of truth for safe unsolicited update-error normalization.
- `extension/src/utils/nativeUpdateError.test.ts`: Plan E-owned candidate-precedence, fallback, accessor/proxy, revoked-proxy, log, forwarding, and no-coercion contract.
- `extension/src/content/updateErrorBridge.ts`: pure normalized tab-message to `dh-update-error` DOM-event bridge.
- `extension/src/content/updateErrorBridge.test.ts`: malformed/direct-injection and exact safe DOM detail tests.
- `.superpowers/sdd/plan-e-extension-hardening-report.md`: committed RED/GREEN/current-audit/final-gate evidence; force-add it only as part of Task 9's exact 60-path evidence set.
- `.superpowers/sdd/plan-e-base.txt`: ignored immutable declared SHA `0dbb4852931b50153fb898b03129ae0092c46404`; validated/restored before Task 1 and never staged or committed.
- `.superpowers/sdd/plan-e-only-review-package.txt`: Plan-E range/stat/log/path review package generated from literal base `0dbb4852931b50153fb898b03129ae0092c46404` to the final committed reviewed product head; ignored before final force-add and committed afterward.
- `.superpowers/sdd/plan-e-only-review.diff`: full-index/binary Plan-E-only review diff; ignored before final force-add and committed afterward.
- `.superpowers/sdd/plan-e-only-review-findings.md`: controller findings for only the Plan-E integration range; ignored before review and force-added in the final evidence commit.
- `.superpowers/sdd/original-whole-branch-interim-review-package.txt`: original-base range/stat/log/path package through the committed Plan E head; ignored before final force-add and committed afterward.
- `.superpowers/sdd/original-whole-branch-interim-review.diff`: full-index/binary original-base-to-Plan-E-head diff; ignored before final force-add and committed afterward.
- `.superpowers/sdd/original-whole-branch-interim-review-findings.md`: separate interim whole-branch findings; ignored before review, force-added in the final evidence commit, and never represented as final post-Plan-D branch review.
- `.superpowers/sdd/invoke-promotion-test.ps1`: ignored exact per-selector RED/GREEN/mutation executor extracted from the committed plan.
- `.superpowers/sdd/run-promotion-mutations.ps1`: ignored exact five-row promotion mutation runner extracted from the committed plan.
- `.superpowers/sdd/promotion-executor.sha256`, `.superpowers/sdd/promotion-mutation-runner.sha256`: ignored script integrity records.
- `.superpowers/sdd/promotion-red-source.sha256`, `.superpowers/sdd/promotion-green-source.sha256`, `.superpowers/sdd/promotion-mutation-source.sha256`: ignored phase source-blob chronology records.
- `.superpowers/sdd/promotion-red.sha256.json`, `.superpowers/sdd/promotion-green.sha256.json`, `.superpowers/sdd/promotion-mutation.sha256.json`, `.superpowers/sdd/promotion-transcripts.sha256.json`: ignored canonical transcript maps.
- `.superpowers/sdd/promotion-transcripts/red/<eight exact method names>.txt`, `.superpowers/sdd/promotion-transcripts/green/<eight exact method names>.txt`, and `.superpowers/sdd/promotion-transcripts/mutation-<classification|bound|initial|pre-sleep|post-sleep>/<mapped method>.{txt,restored-green.txt}`: the exact 26 ignored transcript leaves generated and enumerated in Task 9 Step 0.
- `.superpowers/sdd/promotion-observed.json`, `.superpowers/sdd/promotion-ledger.json`, `.superpowers/sdd/promotion-ast.sha256`: ignored canonical observed values, aggregation, and AST/source integrity evidence.
- `.superpowers/sdd/focused-extension-results.json`, `.superpowers/sdd/full-extension-results.json`, `.superpowers/sdd/host-test-results.json`: ignored canonical, reviewed-head-bound machine test evidence generated in Task 9; the focused aggregate also durably embeds exact current mutation output text and hashes.
- `.superpowers/sdd/reviewed-head-verification.json`: ignored canonical verification result binding the tracked tested-source inventory, TypeScript, build, static, diff, focused/full Extension, and every Host phase to one reviewed product head.
- `.superpowers/sdd/task-6-audit-evidence.json` and `.superpowers/sdd/task-7-audit-evidence.json`: canonical current-immutable-state-only audits that occupy the unavailable Task 6/7 report slots; force-added in the final evidence commit and never represented as historical TDD reconstruction.
- `.superpowers/sdd/final-artifacts.sha256.json`: canonical manifest over the exact 58 final evidence artifacts; force-added beside every manifest artifact and the final report.
- `.superpowers/sdd/task-1-report.md` through `.superpowers/sdd/task-5-report.md` and `.superpowers/sdd/task-8-report.md`: six ignored, hash-pinned, exact historical reports; force-added unchanged in the final evidence commit.
- `.superpowers/sdd/task-6-report.md` and `.superpowers/sdd/task-7-report.md`: accepted historical identities only. These exact paths remain absent because no complete bytes matching their locked SHA-256 values were recovered from the examined sources. Do not create, approximate, summarize, or stage them.

Every Task 9 evidence path above described as ignored is ignored only during
generation and force-added in the final evidence commit unless explicitly
diagnostic/temporary (`plan-e-base.txt`, recovery record, token roots/owners, or
the exact token-bearing lease/audit atomic-promotion temporaries).

### Modified files

- `extension/src/components/Options.tsx`: shared bookmark reads, strict import/team cache handling, non-destructive Reset, safe update-error display, and exact config acknowledgment behavior.
- `extension/src/components/Options.test.tsx`: bookmark mount/Reset/import/update/config component regressions.
- `extension/src/components/Options.collapseFolders.test.ts`: import `MenuItem` from the shared utility while retaining collapse semantics.
- `extension/src/components/MenuLogic.ts`: import/re-export shared `MenuItem`, consume discriminated reads, remove hard-coded defaults, validate team cache, and expose a safe load issue.
- `extension/src/components/MenuLogic.teamCache.test.ts`: failed/invalid/absent/empty personal data and invalid team-cache tests.
- `extension/src/utils/teamCatalog.ts`: parse downloaded/cached team bookmark arrays before stamping `source: 'team'` or committing them.
- `extension/src/utils/teamCatalog.test.ts`: malformed team payload and cache-preservation tests.
- `extension/src/background/teamManifestSync.ts`: consume typed `MenuItem[]` sync results without casts; preserve existing generation/identity behavior.
- `extension/src/background/teamManifestSync.test.ts`: malformed team payload propagation and no-commit regression when shared types change.
- `extension/src/utils/analysisStore.ts`: strict persisted parsers, latest owner key, start/completion transaction, bounded cleanup retry, and Reset cleanup.
- `extension/src/background/analyzeBridge.ts`: mandatory persistence context, exact current Analyze payload/three-key action parser, persistence-owned Host forwarding, strict inner success parser, normalized malformed response, and warning-preserving Host outcomes.
- `extension/src/background/analyzeBridge.test.ts`: parser, success schema, ownership, local failure, no-serialization, and warning tests.
- `extension/src/background/serviceWorker.ts`: thin current-baseline Analyze-handler wiring, frozen non-Analyze snapshot forwarding through the final-wire sender, and safe direct-port update-error routing.
- `extension/src/background/contextMenu.ts`: preserve missing versus explicitly empty captured Root in the message payload.
- `extension/src/background/contextMenu.test.ts`: context-menu stored Root presence/malformed/explicit-empty forwarding tests.
- `extension/src/hooks/useAnalysisHydration.ts`: consume only parsed records and preserve `durationSec: 0` in hydrated UI.
- `extension/src/hooks/useAnalysisHydration.test.ts`: malformed last/pending/seen/owner and legacy compatibility tests.
- `extension/src/components/FAB.tsx`: strict Analyze consumption, durability UI, separate page identity, identity-only busy scans, post-run full scan, and immutable Root invocation.
- `extension/src/components/FAB.spinner.test.tsx`: strict malformed success, warning, duration, and concurrency regressions.
- `extension/src/components/ResultPopover.tsx`: extracted presentational popover so Analyze localization/warning rendering remains testable without FAB request state; Task 5 moves the existing JSX here without visual redesign.
- `extension/src/components/ResultPopover.test.tsx`: immediate/rehydrated Analyze boundary-code localization, warning separation, duration zero, and bookmark-note fallback tests.
- `extension/src/components/FAB.promptSourceErrors.test.tsx`: retain prompt-error localization against the normalized Analyze envelope.
- `extension/src/utils/promptSourceErrors.ts`: add fixed Analyze-boundary code localization while preserving existing prompt-source mappings.
- `extension/src/utils/promptSourceErrors.test.ts`: cover boundary codes plus existing prompt-source and unknown fallback behavior.
- `extension/src/components/FAB.userPrompt.test.tsx`: update preference mocks after removal of persistent Root override.
- `extension/src/components/FAB.bookmarkTelemetry.test.tsx`: update shared `MenuItem`/preference mocks without changing telemetry assertions.
- `extension/src/content/index.tsx`: current-baseline normalized update-error content bridge.
- `extension/src/utils/configUpdateResult.ts`: exact property-presence matrix for `success` and `config_saved`.
- `extension/src/utils/configUpdateResult.test.ts`: complete acknowledgment matrix and throwing-property tests.
- `extension/src/utils/prefs.ts`: remove `mergeRootPathOverride`; `usePrefs` remains the only persistent preference source.
- `extension/src/utils/translations.ts`: localized bookmark read/repair, Analyze durability/malformed, update fallback, and config contradiction copy.
- `extension/src/test/chromeMock.ts`: callback-scoped failed `get`, repeated storage failures, Options/content UI message emission, and listener reset support.
- `host/dh_native_host.py`: recognize the explicit-empty Root marker while preserving old payload fallback.
- `host/test_session_workspace.py`: old Host-compatible missing/empty fallback and new explicit-empty one-request tests.
- `host/update_engine.py`: Task 9 authorized bounded Windows-only atomic preparing promotion retry; public constructor and all other update semantics remain frozen.
- `host/test_update_engine_resume.py`: exact retry/classification/checkpoint/topology/hook/constructor regression matrix for the authorized exception.

### Deleted file

- `extension/src/components/FAB.rootPathOverride.test.ts`: it asserts the persistent override lifetime that Plan E removes.

### Public interfaces

```ts
export type OwnDataProperty =
    | { kind: 'absent' }
    | { kind: 'value'; value: unknown }
    | { kind: 'invalid' }

export function ownDataProperty(
    value: unknown,
    key: PropertyKey,
): OwnDataProperty

export interface MenuItem {
    type: 'folder' | 'link' | 'markdown' | 'back' | 'unknown'
    label: string
    url?: string
    content?: string
    children?: MenuItem[]
    target?: string
    icon?: string
    collapsed?: boolean
    tags?: string[]
    source?: 'team' | 'personal'
}

export type StoredItemsResult =
    | { kind: 'saved'; items: MenuItem[] }
    | { kind: 'absent' }
    | { kind: 'invalid'; code: 'bookmark_storage_invalid' }
    | { kind: 'failed'; code: 'bookmark_storage_read_failed' }

export type DefaultItemsResult =
    | { kind: 'loaded'; items: MenuItem[] }
    | { kind: 'failed'; code: 'bookmark_defaults_unreadable' }

export type BookmarkLoadResult =
    | { kind: 'loaded'; source: 'saved' | 'defaults'; items: MenuItem[] }
    | { kind: 'invalid'; code: 'bookmark_storage_invalid' }
    | {
          kind: 'failed'
          code: 'bookmark_storage_read_failed' | 'bookmark_defaults_unreadable'
      }

export type BookmarkLoadIssue =
    | 'bookmark_storage_invalid'
    | 'bookmark_storage_read_failed'
    | 'bookmark_defaults_unreadable'
    | null

export function parseBookmarkItems(value: unknown): MenuItem[] | null
export function parseBookmarkDocument(value: unknown): MenuItem[] | null
export function parseOwnBookmarkItems(
    value: unknown,
    key: string,
): MenuItem[] | null
export function collapseBookmarkFolders(
    items: MenuItem[],
    isCurrent?: () => boolean,
): MenuItem[] | null
export function readStoredItems(): Promise<StoredItemsResult>
export function readDefaultItems(fetcher?: typeof globalThis.fetch): Promise<DefaultItemsResult>
export function loadBookmarkItems(fetcher?: typeof globalThis.fetch): Promise<BookmarkLoadResult>
export function writeStoredItems(
    items: MenuItem[],
    isCurrent?: () => boolean,
): Promise<'committed' | 'stale'>
```

```ts
export const LATEST_ANALYSIS_OWNER_KEY = 'dh_latest_analysis_owner'

export interface LatestAnalysisOwner {
    requestId: string
    caseNumber: string
    startTime: number
}

export type AnalysisPersistenceWarning =
    | 'analysis_result_not_persisted'
    | 'analysis_pending_cleanup_failed'

export const ANALYSIS_PERSISTENCE_WARNING_ORDER: readonly AnalysisPersistenceWarning[] = [
    'analysis_result_not_persisted',
    'analysis_pending_cleanup_failed',
]

export interface AnalyzePersistContext {
    caseNumber: string
    requestId: string
    successTitle: string
    errorTitle: string
}

export type AnalyzeCompletion =
    | { status: 'success'; markdown: string; savedTo?: string }
    | { status: 'error'; error: string; errorCode?: string }

export interface AnalyzePersistenceDeps {
    now?: () => number
    delay?: (milliseconds: number) => Promise<void>
    logCleanupFailure?: (attempt: number) => void
}

export interface AnalysisSnapshot {
    last: LastAnalysis | null
    pending: PendingAnalysis | null
    seen: LastAnalysisIdentity | null
}

export function parseLastAnalysis(value: unknown): LastAnalysis | null
export function parsePendingAnalysis(value: unknown): PendingAnalysis | null
export function parseLatestAnalysisOwner(value: unknown): LatestAnalysisOwner | null
export function parseLastAnalysisIdentity(value: unknown): LastAnalysisIdentity | null
export function parseAnalyzePersistContextValue(value: unknown): AnalyzePersistContext | null
export function recordAnalyzeStart(
    ctx: AnalyzePersistContext,
    now?: () => number,
): Promise<void>
export function completeAnalyzePersistence(
    ctx: AnalyzePersistContext,
    completion: AnalyzeCompletion,
    deps?: AnalyzePersistenceDeps,
): Promise<AnalysisPersistenceWarning[]>
```

```ts
export type PageIdentity = `case:${string}` | `title:${string}`
export function parsePageIdentity(value: unknown): PageIdentity | null
export interface PageIdentitySnapshot {
    identity: PageIdentity | null
    caseNumber: string
}
export function parsePageIdentitySnapshot(
    value: unknown,
): PageIdentitySnapshot | null
export function parseScrapedDataSnapshot(
    value: unknown,
): import('./pageReader').ScrapedData | null

export interface AnalyzeInvocation {
    readonly rootPathOverride: string
}

export interface AnalyzeRequestSnapshot {
    readonly requestId: string
    readonly pageIdentity: PageIdentity | null
    readonly caseNumber: string
    readonly rootPath: string
    readonly rootPathOverrideProvided: boolean
}

export interface ContextMenuAnalyzePayload {
    selectionText?: string
    rootPath?: string
}

export function buildContextMenuAnalyzePayload(
    selectionText: unknown,
    storedPreferences: unknown,
): ContextMenuAnalyzePayload

export function readAnalyzeInvocation(
    value: unknown,
): AnalyzeInvocation | undefined

export interface ContextMenuClickDeps {
    readPreferences: () => Promise<unknown>
    executeInTab: (tabId: number) => Promise<void>
    sendToTab: (
        tabId: number,
        message: { type: 'TRIGGER_ANALYZE'; payload: ContextMenuAnalyzePayload },
    ) => Promise<void>
}
export function handleContextMenuAnalyzeClick(
    info: { selectionText?: unknown },
    tabId: number | undefined,
    deps: ContextMenuClickDeps,
): Promise<'sent' | 'ignored' | 'failed'>

export function snapshotAnalyzeRequest(
    requestId: unknown,
    pageData: unknown,
    preferenceRoot: unknown,
    invocation?: unknown,
): AnalyzeRequestSnapshot

export function requestMatchesPage(
    request: AnalyzeRequestSnapshot,
    current: PageIdentity | null,
): boolean
```

```ts
// analyzeBridge.ts
export type AnalyzeForwardResponse =
    | {
          status: 'success'
          data: { markdown: string; saved_to?: string }
          extension_warnings?: AnalysisPersistenceWarning[]
      }
    | {
          status: 'error'
          error: string
          error_code?: string
          errorKind?: string
          httpStatus?: number
          extension_warnings?: AnalysisPersistenceWarning[]
      }

export interface AnalyzeNativeAction extends Record<string, unknown> {
    action: 'analyze_error'
    requestId: string
    payload: AnalyzeNativePayload
}

export interface AnalyzeNativePayload {
    text: string
    context: string
    timestamp: string
    rootPath: string
    product?: string
    caseNumber?: string
    rootPathOverrideProvided?: true
}

export interface AnalyzeForwardDeps {
    send: (forwarded: AnalyzeNativeAction) => Promise<unknown>
    persistence?: AnalyzePersistenceDeps
    recordStart?: (
        ctx: AnalyzePersistContext,
        now?: () => number,
    ) => Promise<void>
    completePersistence?: typeof completeAnalyzePersistence
}

export function isAnalyzePayload(payload: unknown): boolean
export function parseAnalyzePersistContext(
    payload: unknown,
): AnalyzePersistContext | null
export function parseAnalyzeForwardRequest(
    inner: unknown,
):
    | {
          ok: true
          forwarded: AnalyzeNativeAction
          context: AnalyzePersistContext
      }
    | { ok: false; response: AnalyzeForwardResponse }
export function handleAnalyzeForward(
    forwarded: AnalyzeNativeAction,
    context: AnalyzePersistContext,
    deps: AnalyzeForwardDeps,
): Promise<AnalyzeForwardResponse>

// analyzeRequestHandler.ts
export interface AuthorizedAnalyzeTransport {
    send(forwarded: AnalyzeNativeAction): Promise<unknown>
}

export interface AnalyzeRequestHandlerDeps {
    acquireAuthorizedTransport(
        forwarded: Readonly<AnalyzeNativeAction>,
    ): Promise<
        | { allowed: false; response: AnalyzeForwardResponse }
        | { allowed: true; transport: AuthorizedAnalyzeTransport }
    >
}

export async function handleAnalyzeRequest(
    inner: unknown,
    deps: AnalyzeRequestHandlerDeps,
): Promise<AnalyzeForwardResponse>

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

export function guardNonAnalyzeNativeMessage(
    inner: unknown,
): NonAnalyzeNativeMessageDecision

// nativeMessageWire.ts
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

`parseAnalyzeForwardRequest` uses the inline discriminated return above; do not add a second `ParsedAnalyzeForwardRequest` alias. A successful parse returns fresh frozen plain `forwarded`, `forwarded.payload`, and `context` objects. `forwarded` has exactly three own enumerable data keys (`action`, `requestId`, `payload`) and is already the Host inner action, never an outer Chrome runtime message. Before freezing, `forwarded.payload` receives one own non-enumerable data property `toJSON: undefined`; `Object.keys(payload)` remains the exact Analyze schema while `Reflect.ownKeys(payload)` contains that one additional inert safety key.

`guardNonAnalyzeNativeMessage` is deliberately shallow. Inside one `try`, it captures `Object.getOwnPropertyDescriptors(inner)` exactly once. It rejects non-objects/arrays; any own `_persist`, `extension_warnings`, or `toJSON`; symbols; enumerable accessors; a missing/non-enumerable/non-data/non-string `action`; exact `action === 'analyze_error'`; and a present request ID unless it is an enumerable own data non-empty primitive string. It ignores inherited and ordinary non-enumerable properties, defines every enumerable string data field on a fresh `Object.prototype` object with `Object.defineProperty`, adds own non-enumerable data `toJSON: undefined`, freezes the snapshot, and returns it. Nested values remain by identity for legacy compatibility. A stateful source that changes from ordinary action during routing to `analyze_error` during this snapshot is denied rather than bypassing the Analyze parser.

`postNativeMessageWire` accepts only an Analyze parser result or successful guard snapshot. It captures descriptors once, requires enumerable string data keys plus only an inert non-enumerable own `toJSON: undefined`, and constructs a fresh final wire object without spread, `Object.assign`, bracket assignment, coercion, or caller hooks. It preserves an existing non-empty primitive request ID or calls `createRequestId()` once and rejects an invalid generated value with fixed `Invalid Native message request ID` before registration/post. It defines the request ID and inert `toJSON` shadow, freezes the wire object, calls `register` before `postMessage`, and on synchronous post failure calls `unregister` exactly once before rethrowing the original failure. The Service Worker owns no second pending deletion. Plan D reuses this helper or an adapter proven equivalent on the exact leased port.

```ts
export interface NativeUpdateErrorEvent {
    type: 'NATIVE_UPDATE_ERROR'
    payload: { error: string }
}

export interface NativeUpdateErrorDeliveryDeps {
    sendRuntime: (event: NativeUpdateErrorEvent) => Promise<unknown>
    queryActiveTabs: () => Promise<Array<{ id?: number }>>
    sendTab: (tabId: number, event: NativeUpdateErrorEvent) => Promise<unknown>
}

export function normalizeNativeUpdateError(value: unknown): NativeUpdateErrorEvent
export const UPDATE_ERROR_DOM_EVENT: 'dh-update-error' = 'dh-update-error'
export interface UpdateErrorDomDetail { error: string }
export function forwardNativeUpdateErrorToWindow(
    message: unknown,
    target?: EventTarget,
): boolean
export function handleNativeUpdateError(
    raw: unknown,
    deps: NativeUpdateErrorDeliveryDeps,
): Promise<void>
```

### Plan D Handoff Contract

Plan D starts only after reviewed Plan E. It must import and preserve:

- `normalizeNativeUpdateError` and `NativeUpdateErrorEvent` from `extension/src/utils/nativeUpdateError.ts` plus all `nativeUpdateError.test.ts` cases;
- `handleAnalyzeRequest`, `AnalyzeRequestHandlerDeps`, and `AuthorizedAnalyzeTransport` from `extension/src/background/analyzeRequestHandler.ts` plus every `analyzeRequestHandler.test.ts` case;
- `parseAnalyzePersistContext`, `parseAnalyzeForwardRequest`, `handleAnalyzeForward`, `AnalyzeNativePayload`, `AnalyzeNativeAction`, `AnalyzeForwardResponse`, `AnalyzeForwardDeps`, and their bridge tests;
- `guardNonAnalyzeNativeMessage` and `NonAnalyzeNativeMessageDecision`; Plan D invokes the same guard before every non-Analyze lease acquisition/send and never duplicates reserved-key inspection;
- `postNativeMessageWire`, `NativeMessageWireDeps`, and every `nativeMessageWire.test.ts` case; Plan D uses it on the captured leased port or supplies an adapter proven to preserve the same final-wire, register-before-post, inert-`toJSON`, and unregister-on-post-failure contract;
- baseline ordering is parse -> acquire allow-all transport -> record start -> leased send; Plan D supplies a port-specific capability/integrity acquisition, yielding parse -> acquire+gate one port lease -> record start -> send on that same lease;
- Plan D routes every Analyze inner payload through `handleAnalyzeRequest(inner, { acquireAuthorizedTransport })`; it must not acquire/gate before the helper, call `handleAnalyzeForward` directly, duplicate `parseAnalyzeForwardRequest`, or open/acquire a Native port for invalid metadata;
- acquisition receives only the frozen sanitized `Readonly<AnalyzeNativeAction>`. `{allowed:false,response}` returns that typed response without storage/start/send. `{allowed:true,transport}` delegates exactly once to `handleAnalyzeForward(forwarded, context, {send: action => transport.send(action)})`, whose bridge owns start, Host outcome normalization, completion persistence, and warnings;
- `AnalyzeNativeAction` has exactly three own enumerable data keys: `action`, `requestId`, and `payload`. Top-level `_persist`, `type`, `extension_warnings`, arbitrary keys, own `__proto__`, and symbols are ignored by from-scratch construction. Its payload is the exact `AnalyzeNativePayload` schema: unknown keys, symbols, accessors, own `__proto__`, and nested runtime wrappers reject the whole request;
- the Analyze payload retains the parser-owned frozen object by identity through acquisition and leased send, including its non-enumerable inert `toJSON` shadow; the final posted top-level wire object is a new frozen object from `postNativeMessageWire`;
- non-Analyze acquisition receives only `guarded.forwarded`, never the source object. Invalid guard decisions open no port. Request-ID-less legacy actions receive one ID only during final-wire construction; no spread, `Object.assign`, alternate request augmentation, reconnect, or second pending-map cleanup is allowed;
- The outer Chrome runtime envelope is `{ type: 'NATIVE_MSG'; payload: Record<string, unknown> }`; `AnalyzeNativeAction` is the one inner Host envelope. Plan D preserves that boundary exactly.
- Plan E's runtime/tab/DOM UI defenses until Plan D atomically replaces them with its typed coordinator route.
- after Plan D reaches its final committed head, rerun the complete original-base review with exact range `0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>` and exact diff form `git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>"`; Plan E's interim original-base review cannot satisfy or waive that final-D-head gate.

**Stale downstream document gate:** the current `docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md` predates this exact payload and atomic transport-lease contract and is stale. It must be revised, reviewed, and committed after Plan E review but before any Plan D implementation step. Do not execute or adapt Plan E around the current Plan D text. This Plan E revision does not edit Plan D.

Plan D may later create `nativePortClient`, `hostGate`, `updateProtocol`, `updateCoordinator`, and `serviceWorker.update.test.ts`, but it must not redefine Plan E helper semantics or reorder parse/acquire+gate/start/leased-send. Its coordinator composes gate and port capture inside `acquireAuthorizedTransport`; the handler remains the only Analyze routing entry. Plan D tests rerun Plan E's request-handler, Analyze bridge, Native wire, content bridge, Options, and FAB regressions through the new adapter. No test imports side-effectful `serviceWorker.ts` merely to exercise Analyze routing. The current Plan D document also contains stale original-object and direct-post identity assumptions; its required pre-implementation revision must replace those with the frozen snapshot and final-wire contracts above.

Plan D's provider is frozen to one port lease: after handler parsing, acquire one main client/port, call `gate.ensureProtected(thatPort, 'analyze_error')`, and return `{allowed:true,transport}` whose `send` captures only that exact gated port identity. A false gate result maps by exact code to one of these typed decisions:

```ts
{
    allowed: false,
    response: {
        status: 'error',
        error_code: 'host_protocol_incompatible',
        error: 'Dynamics Helper Host is incompatible. Retry the update or run the manual installer.',
    },
},
{
    allowed: false,
    response: {
        status: 'error',
        error_code: 'installation_integrity_failed',
        error: 'Dynamics Helper installation is incomplete. Retry the update or run the manual installer.',
    },
},
{
    allowed: false,
    response: {
        status: 'error',
        error_code: 'host_unavailable',
        error: 'Dynamics Helper Host is unavailable. Run the manual installer if retry does not recover it.',
    },
}
```

Main-suppressed coordinator state returns its existing typed fixed denial through the same provider without opening a port. If the leased port disconnects before/during send, `transport.send` rejects this request; it must not reconnect, reacquire, or send on a different port under the prior authorization. A later request may acquire and gate a new lease independently. Raw gate/integrity/transport values never enter `response`. This provider is composed inside `handleAnalyzeRequest`; it is not a second parser or direct bridge call.

### Update-Error Delivery Contract

Plan E uses one normalized broadcast route:

```ts
type NativeUpdateErrorMessage = NativeUpdateErrorEvent
const UPDATE_ERROR_DOM_EVENT: 'dh-update-error' = 'dh-update-error'
type UpdateErrorDomDetail = { error: string }
```

The Worker calls `chrome.runtime.sendMessage(event)` for Options and `chrome.tabs.sendMessage(tab.id, event)` for each active/current-window tab. `content/index.tsx` accepts only exact `type === 'NATIVE_UPDATE_ERROR'`, reads `payload.error` through an own data descriptor, applies `safeErrorText([candidate], 'Update check failed.')`, and dispatches `new CustomEvent<UpdateErrorDomDetail>(UPDATE_ERROR_DOM_EVENT, { detail: { error } })`. FAB's event handler reads `detail.error` through an own data descriptor, applies `safeErrorText([candidate], t('updateCheckFailed'))`, and shows the existing error bubble. Options' runtime handler performs the same descriptor-safe defense. No raw Native value is sent to runtime, tabs, DOM, logs, storage, or telemetry.


## Task 1: Strict Shared Bookmark Boundary

**Files:**
- Create: `extension/src/utils/ownData.ts`
- Create: `extension/src/utils/ownData.test.ts`
- Create: `extension/src/utils/bookmarkItems.ts`
- Create: `extension/src/utils/bookmarkItems.test.ts`
- Modify: `extension/src/test/chromeMock.ts`
- Modify: `extension/src/components/MenuLogic.ts` only to replace the local `MenuItem` declaration with a shared import/re-export; consumer loading changes remain in Task 2.
- Modify: `extension/src/components/Options.tsx` only to import/re-export `collapseBookmarkFolders`; loading/Reset consumers change in Tasks 2-3.
- Modify: `extension/src/components/Options.collapseFolders.test.ts`

**Interfaces:**
- Consumes: callback-style `chrome.storage.local.get/set`, `chrome.runtime.lastError`, `chrome.runtime.getURL('items.json')`, and `fetch`.
- Produces: shared `OwnDataProperty`/`ownDataProperty`, plus the exact `MenuItem`, `StoredItemsResult`, `DefaultItemsResult`, `BookmarkLoadResult`, and eight bookmark functions locked above.

- [ ] **Step 1: Add the failing shared own-data test**

Create `ownData.test.ts` first. Use the locked public interface and these exact named cases:

| Exact title | Input | Assertion |
|---|---|---|
| `reads only an own data property` | ordinary own data, inherited value, and absent key | own returns `{kind:'value',value}`; inherited/absent return `{kind:'absent'}` |
| `rejects accessors without invoking them` | enumerable/non-enumerable getters | `{kind:'invalid'}` and getter spy remains zero |
| `contains throwing and revoked property sources` | descriptor-throwing Proxy and revoked Proxy | `{kind:'invalid'}` without throw/log/coercion |
| `rejects arrays and scalars without conversion` | array/null/string/number/function/symbol plus throwing conversion hooks | `{kind:'invalid'}` and conversion spies remain zero |
| `accepts PropertyKey symbols without reading values` | own symbol data/accessor | data returns value; accessor returns invalid without invocation |

Before creating `ownData.ts`, run:

```powershell
if (Test-Path -LiteralPath 'extension/src/utils/ownData.ts') {
    throw 'Shared own-data module unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/utils/ownData.test.ts --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Shared own-data missing-module RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Shared own-data missing-module RED did not fail with Vitest exit 1' }
```

Expected: the isolated file fails only because `./ownData` is missing. Create this compile-only shell immediately:

```ts
export type OwnDataProperty =
    | { kind: 'absent' }
    | { kind: 'value'; value: unknown }
    | { kind: 'invalid' }

export function ownDataProperty(
    _value: unknown,
    _key: PropertyKey,
): OwnDataProperty {
    return { kind: 'invalid' }
}
```

Rerun the same command. Expected: imports succeed; `reads only an own data property` and the own-symbol data assertion fail because the shell always returns `invalid`. This is the behavioral RED.

- [ ] **Step 2: Implement and verify the shared own-data boundary**

Replace the shell body with this exact implementation:

```ts
export function ownDataProperty(
    value: unknown,
    key: PropertyKey,
): OwnDataProperty {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { kind: 'invalid' }
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (!descriptor) return { kind: 'absent' }
        return Object.hasOwn(descriptor, 'value')
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}
```

Run the same `ownData.test.ts --reporter=verbose` command and require exit 0. Expected: all five named cases PASS with no console output. Tasks 4, 5, 7, and 8 import this helper; no equivalent `analysisField`, `ownField`, or second `ownDataProperty` implementation is permitted.

- [ ] **Step 3: Add the failing parser and read-result tests**

Create `bookmarkItems.test.ts` with this fixture matrix. Each row is one named `it` or `it.each` case; assertions are exact.

| Case | Input/setup | Exact assertion |
|---|---|---|
| current schema | all five item types, empty label, every optional field | parsed deep-equals input; no `id` appears |
| safe unknown own data | `{ future: { flag: true, list: [1, 'x', null] } }` on an item whose prototype has `inherited: 'drop'` | parsed `future` deep-equals; parsed item has `Object.prototype`; `inherited` is absent |
| `preserves own __proto__ as inert data` | define enumerable own data `__proto__: { polluted: true }` on an item and nested extra object | parsed objects have own enumerable `__proto__` data; `Object.getPrototypeOf(...) === Object.prototype`; neither output prototype nor `Object.prototype` gains `polluted` |
| unsafe unknown own data | unknown value is function, symbol, bigint, non-finite number, accessor, proxy failure, or cycle | returns `null`; no conversion/accessor hook runs |
| cross-field cycle | `future.owner` points back to the item or an unknown object points into `children` and back | returns `null` |
| `rejects unknown-data depth 65` | unknown object/array graph reaches depth 64 versus 65 | 64 parses; 65 returns `null` without recursion overflow |
| accessor | own enumerable getter for `label` whose body throws | returns `null`; getter spy has zero calls |
| wrong known field | table of array item, numeric label, string collapsed, mixed tags, invalid source, invalid type | every row returns `null`; no coercion spy runs |
| cycle | child points to parent and unknown extra points to parent | both return `null` |
| depth 64 | top-level item plus 63 nested `children` edges (64 total item levels) | non-null |
| `rejects 65 nested levels` | top-level item plus 64 nested edges (65 total levels), including a non-folder-with-children chain | `null` |
| throwing array `length` get | proxy around a valid bookmark array throws from `get(_, 'length')` while `ownKeys`/descriptor traps delegate | parser succeeds from guarded own descriptors; no property-get result, coercion, or secret is observed; reflective access remains bounded/non-repeating |
| throwing proxy `ownKeys` | array/item proxy throws from `ownKeys` | returns `null`; exception contained; no conversion/prototype mutation |
| throwing proxy descriptor | array/item proxy throws from `getOwnPropertyDescriptor` | returns `null`; exception contained; no conversion/prototype mutation |
| revoked proxy containment | revoked proxies supplied as the top-level array, item, `children`, `tags`, unknown extra object, and wrapped document | every parse returns `null` without throwing; no log/conversion/prototype mutation |
| guarded own bookmark property | ordinary own data array parses; absent, inherited, accessor, throwing proxy, and revoked outer object return `null` | `parseOwnBookmarkItems` never invokes the getter, throws, or reads by bracket/dot access |
| document shapes | raw array and own-data `{ items: array }` | both parse to the same items |
| malformed document | object without `items`, HTML text, scalar, getter-backed `items` | returns `null`; getter spy has zero calls |
| stored empty | seed `dh_items: []` | `{ kind: 'saved', items: [] }` |
| true absence | seed no `dh_items` own property | `{ kind: 'absent' }` |
| inherited key | storage result inherits `dh_items` from its prototype | `{ kind: 'absent' }`; inherited value is ignored |
| invalid present | seed `dh_items: { items: [] }` | `{ kind: 'invalid', code: 'bookmark_storage_invalid' }` |
| throwing/revoked storage result | callback receives a proxy whose `getOwnPropertyDescriptor` throws, then a revoked proxy | `{ kind: 'invalid', code: 'bookmark_storage_invalid' }`; exception contained; no defaults read |
| scoped read failure | `deferNextStorageGet('dh_items').reject(new Error('secret'))` | `{ kind: 'failed', code: 'bookmark_storage_read_failed' }`; callback finishes; secret absent from logs |
| valid defaults | HTTP 200 raw array, wrapped array, and either shape with `[]` | `{ kind: 'loaded', items }`; empty remains loaded |
| default failures | non-OK, HTML, invalid JSON, invalid schema, rejected fetch | fixed `{ kind: 'failed', code: 'bookmark_defaults_unreadable' }` and no raw body/error log |
| shared load orchestration | saved/absent/invalid/read-failed/default-failed | saved/defaults return `loaded` with source; invalid returns `invalid`; read/default failures return `failed`; only internal absence calls defaults |
| generation-owned write | `isCurrent` false, true, and throwing | false returns `'stale'` with no set; true writes once/returns `'committed'`; throw rejects fixed ownership error with no set |
| generation-owned collapse | ownership turns false during a depth-64 tree | returns `null`; no partial collapsed tree is applied/written |

Use this concrete no-coercion probe in the suite:

```ts
it('rejects accessors and cyclic data without invoking conversion hooks', () => {
    const convert = vi.fn(() => 'SECRET')
    const item: Record<string, unknown> = {
        type: 'folder',
        children: [],
        toString: convert,
    }
    Object.defineProperty(item, 'label', {
        enumerable: true,
        get: () => { throw new Error('SECRET') },
    })
    ;(item.children as unknown[]).push(item)

    expect(parseBookmarkItems([item])).toBeNull()
    expect(convert).not.toHaveBeenCalled()
})
```

- [ ] **Step 4: Run the bookmark boundary tests to prove RED**

Run from the worktree root:

```powershell
if (Test-Path -LiteralPath 'extension/src/utils/bookmarkItems.ts') {
    throw 'Bookmark boundary module unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/utils/bookmarkItems.test.ts --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'Bookmark boundary RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Bookmark boundary RED did not fail with Vitest exit 1' }
```

Expected: this isolated first RED fails only because `./bookmarkItems` does not exist. Immediately add a compile-only `bookmarkItems.ts` shell by copying every locked Task 1 public type/function signature; parser/collapse functions return `null`, async readers return their fixed failed discriminants, and `writeStoredItems` rejects fixed `Bookmark storage mutation failed` without touching Chrome. Rerun the same command and require named depth/accessor/storage-failure/default-schema assertions to fail. Only the first missing import is evidence; the second run proves behavior rather than import wiring.

- [ ] **Step 5: Implement the strict snapshot parser and discriminated readers**

Implement these exact rules in `bookmarkItems.ts`:

```ts
const ITEM_TYPES = new Set(['folder', 'link', 'markdown', 'back', 'unknown'])
const STRING_FIELDS = ['url', 'content', 'target', 'icon'] as const
const MAX_FOLDER_DEPTH = 64
const INVALID = Symbol('invalid-bookmark-data')

type DescribedOwnObject =
    | { kind: 'object'; descriptors: PropertyDescriptorMap }
    | { kind: 'array'; descriptors: PropertyDescriptorMap; length: number }

function descriptorFromMap(
    descriptors: PropertyDescriptorMap,
    key: PropertyKey,
): PropertyDescriptor | null {
    try {
        const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
        if (!holder || !descriptorHasData(holder)) return null
        const descriptor = holder.value
        return typeof descriptor === 'object' && descriptor !== null
            ? descriptor as PropertyDescriptor
            : null
    } catch {
        return null
    }
}

function descriptorHasData(descriptor: PropertyDescriptor): boolean {
    try {
        return Object.hasOwn(descriptor, 'value')
    } catch {
        return false
    }
}

function ownDescriptorKeys(
    descriptors: PropertyDescriptorMap,
): readonly PropertyKey[] | null {
    try {
        return Reflect.ownKeys(descriptors)
    } catch {
        return null
    }
}

function safeIsArray(value: unknown): boolean | null {
    try {
        return Array.isArray(value)
    } catch {
        return null
    }
}

function describeOwnObject(value: unknown): DescribedOwnObject | null {
    try {
        if (typeof value !== 'object' || value === null) return null
        const isArray = safeIsArray(value)
        if (isArray === null) return null
        const descriptors = Object.getOwnPropertyDescriptors(value)
        if (!isArray) return { kind: 'object', descriptors }
        const lengthDescriptor = descriptorFromMap(descriptors, 'length')
        if (
            !lengthDescriptor
            || !descriptorHasData(lengthDescriptor)
            || typeof lengthDescriptor.value !== 'number'
            || !Number.isSafeInteger(lengthDescriptor.value)
            || lengthDescriptor.value < 0
        ) return null
        return {
            kind: 'array',
            descriptors,
            length: lengthDescriptor.value,
        }
    } catch {
        return null
    }
}

function defineOwnData(
    target: object,
    key: PropertyKey,
    value: unknown,
): boolean {
    try {
        Object.defineProperty(target, key, {
            value,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        return true
    } catch {
        return false
    }
}

function snapshotUnknown(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): unknown | typeof INVALID {
    if (depth > MAX_FOLDER_DEPTH) return INVALID
    if (
        value === null
        || typeof value === 'string'
        || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
    ) return value
    if (typeof value !== 'object' || ancestors.has(value)) return INVALID
    const described = describeOwnObject(value)
    if (!described) return INVALID
    const { descriptors } = described
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value)
    if (described.kind === 'array') {
        const output: unknown[] = []
        for (let index = 0; index < described.length; index += 1) {
            const descriptor = descriptorFromMap(descriptors, index)
            if (!descriptor || !descriptorHasData(descriptor)) return INVALID
            const child = snapshotUnknown(
                descriptor.value,
                depth + 1,
                nextAncestors,
            )
            if (child === INVALID) return INVALID
            if (!defineOwnData(output, index, child)) return INVALID
        }
        return output
    }
    const output: Record<string, unknown> = {}
    const keys = ownDescriptorKeys(descriptors)
    if (!keys) return INVALID
    for (const key of keys) {
        if (typeof key !== 'string') continue
        const descriptor = descriptorFromMap(descriptors, key)
        if (!descriptor) return INVALID
        if (!descriptor.enumerable) continue
        if (!descriptorHasData(descriptor)) return INVALID
        const child = snapshotUnknown(descriptor.value, depth + 1, nextAncestors)
        if (child === INVALID) return INVALID
        if (!defineOwnData(output, key, child)) return INVALID
    }
    return output
}

function containsReference(
    value: unknown,
    target: object,
    seen: Set<object> = new Set(),
    depth = 0,
): boolean {
    if (value === target) return true
    if (depth > MAX_FOLDER_DEPTH) return true
    if (typeof value !== 'object' || value === null || seen.has(value)) return false
    seen.add(value)
    const described = describeOwnObject(value)
    if (!described) return true
    const keys = ownDescriptorKeys(described.descriptors)
    if (!keys) return true
    return keys.some(key => {
        const descriptor = descriptorFromMap(described.descriptors, key)
        return !descriptor || (
            descriptor.enumerable
            && (
                !descriptorHasData(descriptor)
                || containsReference(descriptor.value, target, seen, depth + 1)
            )
        )
    })
}

function dataValue(
    descriptors: PropertyDescriptorMap,
    key: string,
): { present: boolean; valid: boolean; value?: unknown } {
    const descriptor = descriptorFromMap(descriptors, key)
    if (!descriptor) return { present: false, valid: true }
    return descriptorHasData(descriptor)
        ? { present: true, valid: true, value: descriptor.value }
        : { present: true, valid: false }
}

function parseItemsArray(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): MenuItem[] | null {
    const described = describeOwnObject(value)
    if (
        !described
        || described.kind !== 'array'
        || depth > MAX_FOLDER_DEPTH
        || ancestors.has(value as object)
    ) {
        return null
    }
    const { descriptors } = described
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value as object)
    const output: MenuItem[] = []
    for (let index = 0; index < described.length; index += 1) {
        const descriptor = descriptorFromMap(descriptors, index)
        if (!descriptor || !descriptorHasData(descriptor)) return null
        const item = parseItem(descriptor.value, depth, nextAncestors)
        if (!item) return null
        if (!defineOwnData(output, index, item)) return null
    }
    return output
}

function parseItem(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): MenuItem | null {
    if (
        typeof value !== 'object'
        || value === null
        || depth > MAX_FOLDER_DEPTH
    ) return null
    const described = describeOwnObject(value)
    if (
        !described
        || described.kind !== 'object'
        || ancestors.has(value)
    ) return null
    const { descriptors } = described
    const type = dataValue(descriptors, 'type')
    const label = dataValue(descriptors, 'label')
    if (
        !type.present || !type.valid || typeof type.value !== 'string'
        || !ITEM_TYPES.has(type.value)
        || !label.present || !label.valid || typeof label.value !== 'string'
    ) return null
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value)
    const output: Record<string, unknown> = {
        type: type.value,
        label: label.value,
    }
    for (const field of STRING_FIELDS) {
        const candidate = dataValue(descriptors, field)
        if (!candidate.valid) return null
        if (candidate.present) {
            if (typeof candidate.value !== 'string') return null
            if (!defineOwnData(output, field, candidate.value)) return null
        }
    }
    const collapsed = dataValue(descriptors, 'collapsed')
    if (!collapsed.valid) return null
    if (collapsed.present) {
        if (typeof collapsed.value !== 'boolean') return null
        if (!defineOwnData(output, 'collapsed', collapsed.value)) return null
    }
    const tags = dataValue(descriptors, 'tags')
    if (!tags.valid) return null
    if (tags.present) {
        const parsedTags = snapshotUnknown(tags.value, depth + 1, nextAncestors)
        if (
            parsedTags === INVALID
            || safeIsArray(parsedTags) !== true
        ) return null
        const parsedTagValues: string[] = []
        const describedTags = describeOwnObject(parsedTags)
        if (!describedTags || describedTags.kind !== 'array') return null
        for (let index = 0; index < describedTags.length; index += 1) {
            const descriptor = descriptorFromMap(describedTags.descriptors, index)
            if (
                !descriptor
                || !descriptorHasData(descriptor)
                || typeof descriptor.value !== 'string'
            ) return null
            parsedTagValues.push(descriptor.value)
        }
        if (!defineOwnData(output, 'tags', parsedTagValues)) return null
    }
    const source = dataValue(descriptors, 'source')
    if (!source.valid) return null
    if (source.present) {
        if (source.value !== 'team' && source.value !== 'personal') return null
        if (!defineOwnData(output, 'source', source.value)) return null
    }
    const children = dataValue(descriptors, 'children')
    if (!children.valid) return null
    if (children.present) {
        const parsedChildren = parseItemsArray(
            children.value,
            depth + 1,
            nextAncestors,
        )
        if (!parsedChildren) return null
        if (!defineOwnData(output, 'children', parsedChildren)) return null
    }
    const known = new Set([
        'type', 'label', ...STRING_FIELDS, 'collapsed', 'tags', 'source', 'children',
    ])
    const keys = ownDescriptorKeys(descriptors)
    if (!keys) return null
    for (const key of keys) {
        if (typeof key !== 'string') continue
        const descriptor = descriptorFromMap(descriptors, key)
        if (!descriptor) return null
        if (!descriptor.enumerable || known.has(key)) continue
        if (!descriptorHasData(descriptor)) return null
        if (containsReference(descriptor.value, value)) return null
        const extra = snapshotUnknown(descriptor.value, depth + 1, nextAncestors)
        if (extra === INVALID) return null
        if (!defineOwnData(output, key, extra)) return null
    }
    return output as unknown as MenuItem
}

export function parseBookmarkItems(value: unknown): MenuItem[] | null {
    return parseItemsArray(value, 1, new Set())
}

export function parseBookmarkDocument(value: unknown): MenuItem[] | null {
    const described = describeOwnObject(value)
    if (!described) return null
    if (described.kind === 'array') return parseBookmarkItems(value)
    const descriptor = descriptorFromMap(described.descriptors, 'items')
    return descriptor && descriptorHasData(descriptor)
        ? parseBookmarkItems(descriptor.value)
        : null
}

export function parseOwnBookmarkItems(
    value: unknown,
    key: string,
): MenuItem[] | null {
    try {
        if (
            typeof value !== 'object'
            || value === null
            || Array.isArray(value)
        ) return null
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        return descriptor && Object.hasOwn(descriptor, 'value')
            ? parseBookmarkItems(descriptor.value)
            : null
    } catch {
        return null
    }
}

export function collapseBookmarkFolders(
    items: MenuItem[],
    isCurrent: () => boolean = () => true,
): MenuItem[] | null {
    const parsed = parseBookmarkItems(items)
    if (!parsed) return null
    const output = parsed
    const stack = [...output]
    while (stack.length > 0) {
        if (!isCurrent()) return null
        const item = stack.pop()!
        if (item.type === 'folder') {
            item.collapsed = item.collapsed ?? true
            item.children = item.children ?? []
        }
        if (item.children) stack.push(...item.children)
    }
    return output
}
```

`parseOwnBookmarkItems` intentionally returns `null` for both absence and invalidity because it is a consumer defense seam, not the authoritative saved/default discriminant. `readStoredItems` remains responsible for distinguishing absent, invalid, and failed personal storage.

Every returned item and unknown object is a fresh ordinary object with exactly `Object.prototype`; arrays are fresh arrays. Every copied key, including own `__proto__`, is created through `defineOwnData` as an own enumerable/writable/configurable data property, so no input key can invoke the legacy `__proto__` setter or mutate any prototype. `snapshotUnknown` and the mutually recursive item helpers are bounded to 64 levels before rejection. All array shape/length/index access comes from guarded descriptor maps; no untrusted `length`/element/property getter runs. `Object.getOwnPropertyDescriptors` catches `ownKeys` and `getOwnPropertyDescriptor` proxy failures at the boundary. Unknown own data and known children share the ancestor/depth policy, top-level items are depth 1, and level 65 rejects.

Implement storage/fetch completion exactly as follows:

```ts
export function readStoredItems(): Promise<StoredItemsResult> {
    return new Promise(resolve => {
        try {
            chrome.storage.local.get('dh_items', value => {
                try {
                    if (chrome.runtime.lastError) {
                        resolve({ kind: 'failed', code: 'bookmark_storage_read_failed' })
                        return
                    }
                    if (
                        typeof value !== 'object'
                        || value === null
                        || safeIsArray(value) !== false
                    ) {
                        resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                        return
                    }
                    const descriptor = Object.getOwnPropertyDescriptor(
                        value,
                        'dh_items',
                    )
                    if (!descriptor) {
                        resolve({ kind: 'absent' })
                        return
                    }
                    if (!descriptorHasData(descriptor)) {
                        resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                        return
                    }
                    const items = parseBookmarkItems(descriptor.value)
                    resolve(items
                        ? { kind: 'saved', items }
                        : { kind: 'invalid', code: 'bookmark_storage_invalid' })
                } catch {
                    resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                }
            })
        } catch {
            resolve({ kind: 'failed', code: 'bookmark_storage_read_failed' })
        }
    })
}

export async function readDefaultItems(
    fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<DefaultItemsResult> {
    try {
        const response = await fetcher(chrome.runtime.getURL('items.json'))
        let ok: unknown
        let readText: unknown
        try {
            ok = response.ok
            readText = response.text
        } catch {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        if (ok !== true || typeof readText !== 'function') {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        const text = await readText.call(response)
        if (typeof text !== 'string') {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        if (text.trimStart().startsWith('<')) {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        const items = parseBookmarkDocument(JSON.parse(text))
        return items
            ? { kind: 'loaded', items }
            : { kind: 'failed', code: 'bookmark_defaults_unreadable' }
    } catch {
        return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
    }
}

export async function loadBookmarkItems(
    fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<BookmarkLoadResult> {
    const stored = await readStoredItems()
    if (stored.kind === 'saved') {
        return { kind: 'loaded', source: 'saved', items: stored.items }
    }
    if (stored.kind === 'invalid') return stored
    if (stored.kind === 'failed') return stored
    const defaults = await readDefaultItems(fetcher)
    return defaults.kind === 'loaded'
        ? { kind: 'loaded', source: 'defaults', items: defaults.items }
        : defaults
}

export function writeStoredItems(
    items: MenuItem[],
    isCurrent: () => boolean = () => true,
): Promise<'committed' | 'stale'> {
    return new Promise((resolve, reject) => {
        let current = false
        try {
            current = isCurrent()
        } catch {
            reject(new Error('Bookmark storage ownership check failed'))
            return
        }
        if (!current) {
            resolve('stale')
            return
        }
        try {
            chrome.storage.local.set({ dh_items: items }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Bookmark storage mutation failed'))
                    return
                }
                resolve('committed')
            })
        } catch {
            reject(new Error('Bookmark storage mutation failed'))
        }
    })
}
```

Extend `chromeMock.ts` so a rejected deferred storage get invokes its callback once while `chrome.runtime.lastError` is set, then clears it in `finally`, matching the existing set/remove behavior. Reset all deferred queues and listeners in `resetChromeMock`.

Move the exact `MenuItem` interface to the utility. In `MenuLogic.ts`, use:

```ts
import type { MenuItem } from '../utils/bookmarkItems'
export type { MenuItem } from '../utils/bookmarkItems'
```

Update `Options.collapseFolders.test.ts` to import `MenuItem` from `../utils/bookmarkItems` while continuing to import the compatibility name from Options.
Move `collapseFolders` from Options to iterative `collapseBookmarkFolders` in `bookmarkItems.ts`; it uses an explicit stack rather than recursion, clones only parsed plain items, preserves explicit `collapsed:false`, defaults folder `collapsed` to true, and returns `null` without a partial result when the optional ownership callback is false. Add an Options compatibility wrapper `export const collapseFolders = (items: MenuItem[]) => collapseBookmarkFolders(items) ?? []` during Task 1 so existing tests/callers stay green, then migrate Options/MenuLogic consumers in Tasks 2-3. This gives mount and Reset one stack-safe collapse implementation and avoids a utility importing the Options component.

- [ ] **Step 6: Run GREEN and type checking**

```powershell
& npm run test:run --prefix extension -- src/utils/ownData.test.ts src/utils/bookmarkItems.test.ts src/components/Options.collapseFolders.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Bookmark boundary GREEN failed' }
```

Then run this independent checked block:

```powershell
$ErrorActionPreference='Stop'
Push-Location -LiteralPath 'extension'
try {
    & npm exec tsc -- --noEmit -p tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' }
} finally {
    Pop-Location
}
```

Expected command syntax is literal and uniform: tool working directory `extension/`, executable `npm`, arguments `exec tsc -- --noEmit -p tsconfig.json`; no `--prefix` is used for standalone TypeScript.

Expected: both commands exit 0; Vitest reports all three files passed and TypeScript prints no diagnostics.

- [ ] **Step 7: Prove shared and bookmark parser guards are active**

Temporarily move `Array.isArray(value)` outside `ownDataProperty`'s `try` block. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/ownData.test.ts -t 'contains throwing and revoked property sources' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Own-data containment mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Own-data containment mutation did not fail with Vitest exit 1' }
```

Expected mutation output: the named test FAILS because `Array.isArray(revokedProxy)` escapes. Restore the complete containment block and rerun Task 1 GREEN; expected PASS.

Temporarily change the shared graph-depth comparison from `> MAX_FOLDER_DEPTH` to `> MAX_FOLDER_DEPTH + 1`. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/bookmarkItems.test.ts -t '(rejects 65 nested levels|rejects unknown-data depth 65)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Depth mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Depth mutation did not fail with Vitest exit 1' }
```

Expected mutation output: both depth-65 guards FAIL because the results are accepted instead of `null`. Restore the comparison and rerun the Task 1 GREEN command; expected PASS.

Temporarily replace `defineOwnData(output, key, child)` with bracket assignment. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/bookmarkItems.test.ts -t 'preserves own __proto__ as inert data' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw '__proto__ mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw '__proto__ mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the output prototype changes or own `__proto__` is absent. Restore `Object.defineProperty` and rerun Task 1 GREEN; expected PASS.

- [ ] **Step 8: Commit the shared boundary**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/utils/ownData.ts',
    'extension/src/utils/ownData.test.ts',
    'extension/src/utils/bookmarkItems.ts',
    'extension/src/utils/bookmarkItems.test.ts',
    'extension/src/test/chromeMock.ts',
    'extension/src/components/MenuLogic.ts',
    'extension/src/components/Options.tsx',
    'extension/src/components/Options.collapseFolders.test.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 1 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 1 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 1 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 1 staged diff check failed' }
& git commit -m "fix(bookmarks): add strict shared data boundary"
if ($LASTEXITCODE -ne 0) { throw 'Task 1 commit failed' }
```

Expected: one commit containing only the eight listed files. Run `git status --short` and continue even if unrelated pre-existing files remain; do not stage them.

## Task 2: Discriminated Bookmark Consumers and External Data Validation

**Files:**
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/MenuLogic.ts`
- Modify: `extension/src/components/MenuLogic.teamCache.test.ts`
- Modify: `extension/src/utils/teamCatalog.ts`
- Modify: `extension/src/utils/teamCatalog.test.ts`
- Modify: `extension/src/background/teamManifestSync.ts`
- Modify: `extension/src/background/teamManifestSync.test.ts`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.bookmarkTelemetry.test.tsx`
- Modify: `extension/src/utils/translations.ts`

**Interfaces:**
- Consumes: Task 1 `loadBookmarkItems`, `writeStoredItems`, `parseBookmarkItems`, `parseBookmarkDocument`, and `parseOwnBookmarkItems` (`loadBookmarkItems` itself owns the saved/absent/default discrimination through `readStoredItems`/`readDefaultItems`).
- Produces: shared `BookmarkLoadIssue` from `useMenuLogic`, strict team/import data, and localized safe repair UI.

- [ ] **Step 1: Add failing Options/MenuLogic mount tests**

Add the following exact component cases:

| Test file | Setup | Assertions |
|---|---|---|
| `Options.test.tsx` | `preserves bookmarks when storage read fails`: seed personal bookmarks, reject `dh_items` get | existing UI/storage snapshot remains; no `dh_items` set/remove; localized read-failed warning |
| `Options.test.tsx` | present malformed `dh_items` plus valid defaults fetch | no defaults fetch; no set/remove; distinct repair warning |
| `Options.test.tsx` | absent key plus valid defaults | collapsed defaults render and one `dh_items` set occurs |
| `Options.test.tsx` | absent plus fetch/HTML/JSON/schema failure table | no `dh_items` set/remove; defaults-repair warning |
| `Options.test.tsx` | absent defaults fetch resolves after a bookmark edit | old defaults are ignored and never written; edited generation remains |
| `Options.test.tsx` | saved `[]` | empty menu remains; fetch is not called; `dh_items` remains `[]` |
| `MenuLogic.teamCache.test.ts` | same failed/invalid/absent/empty matrix | hook returns unchanged safe items and exact issue; hard-coded `Favorites/About` never appears |
| `MenuLogic.teamCache.test.ts` | current identity with malformed/accessor `dh_team_items` plus a separate revoked outer-result row | invalid team data is ignored and never merged/rendered; getters are not called and revoked proxies do not escape; other callback fields are ordinary own data for item-focused rows |
| `Options.test.tsx` | current-team callback has ordinary identity/manifest fields plus malformed/accessor-backed `dh_team_items` | existing team UI remains unchanged; getter is not called and no render error or raw log occurs |

Use `chromeMockSpies.storageSet.mock.calls` and `storageRemove.mock.calls` to prove destructive operations did not occur; do not infer safety only from rendered text.

- [ ] **Step 2: Add failing team-download and import tests**

In `teamCatalog.test.ts`, add a 200 response table whose body is `{ items: [{ type: 'link', label: 7 }] }`, a cycle supplied through a mocked `response.json`, and a depth-65 tree. Before these tests, replace `CACHED_ITEMS` with a valid current-schema fixture such as `{ type: 'link', label: 'Cached', source: 'team' }`; malformed-cache rows use separate constants. For each malformed network body, assert:

```ts
expect(result).toMatchObject({
    ok: false,
    failure: { kind: 'parse', message: 'Bookmark schema validation failed' },
})
expect(getStorageSnapshot().dh_team_items).toEqual(CACHED_ITEMS)
```

Add this `syncTeamBookmarks` cache matrix. Seed exact matching enabled/URL/team preferences for every row:

| Fetch path | Stored `dh_team_items` | Expected result/storage |
|---|---|---|
| manifest 304, bookmarks 304 | valid parsed array | `unchanged` returns the parsed plain items and updates only `dh_team_synced` |
| manifest 304, bookmarks 304 | own `dh_team_items: []` | `unchanged` returns `[]` and updates only `dh_team_synced` |
| manifest 304, bookmarks 304 | key absent | `failed` with `{kind:'parse',message:'Cached bookmark schema validation failed'}`; no timestamp/item write |
| `rejects malformed cached bookmarks on 304`: manifest 304, bookmarks 304 | malformed/accessor/cyclic/depth-65/revoked cache | same fixed `failed`; raw cache remains untouched; no item/timestamp response |
| manifest or bookmark fetch failure | malformed cache | original network/auth failure remains primary, but response `items` is `[]`, never raw malformed data |
| changed 200 bookmarks | valid fetched items | parser runs again inside `syncTeamBookmarks` before the generation-owned set and returned `items` are the parsed plain snapshot |
| changed 200 bookmarks | force `fetchTeamBookmarks` seam to return malformed typed-cast items | fixed parse failure; no `dh_team_items`/ETag/timestamp write |

In `teamManifestSync.test.ts`, pass a malformed `SyncResult.items` through `toSelectedTeamSyncResponse` and assert the adapter returns fixed `{status:'error',errorKind:'parse',data:{syncStatus:'failed',...}}` with no `items`. This is defense at the Worker response seam, not a second storage parser.

In `Options.test.tsx`, import a wrapped valid file and malformed schema file through a mocked `FileReader`. Assert the valid snapshot is parsed and stored, while malformed import leaves UI/storage unchanged and shows `parseJsonFailed`. Include a valid unknown own property and assert export-visible state preserves it.

- [ ] **Step 3: Run the consumer suite to prove RED**

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx src/components/MenuLogic.teamCache.test.ts src/utils/teamCatalog.test.ts src/background/teamManifestSync.test.ts --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'Bookmark consumer RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Bookmark consumer RED did not fail with Vitest exit 1' }
```

Expected: FAIL at the read-failure/invalid distinction, hard-coded fallback removal, malformed team network/cache/304 paths, Worker response seam, and malformed import assertions. Existing empty-`dh_items` regression should remain GREEN.

- [ ] **Step 4: Replace both duplicate loaders with the shared discriminated loader**

Delete both local `loadItems` implementations and the hard-coded `Favorites`/`About` fallback. Both consumers call the shared `loadBookmarkItems`; neither reimplements storage-versus-default branching:

```ts
type LoadedMenuSnapshot = {
    items: MenuItem[] | null
    source: 'saved' | 'defaults' | null
    issue: BookmarkLoadIssue
}

async function readMenuSnapshot(): Promise<LoadedMenuSnapshot> {
    const loaded = await loadBookmarkItems()
    if (loaded.kind !== 'loaded') {
        return { items: null, source: null, issue: loaded.code }
    }
    return { items: loaded.items, source: loaded.source, issue: null }
}
```

This is the only consumer narrowing: `BookmarkLoadResult` is exactly `loaded | invalid | failed`; true storage absence is internal to `loadBookmarkItems` and becomes either loaded defaults or `bookmark_defaults_unreadable`. No caller checks `absent`, and no caller reads `items/source` before `kind === 'loaded'`.

Options captures `itemsLoadGeneration = bookmarkGenerationRef.current` before `loadBookmarkItems`, calls `collapseBookmarkFolders(items, () => bookmarkGenerationRef.current === itemsLoadGeneration)`, and applies/writes only a non-null result. It carries that exact generation into its queued normalization/default write (Task 3 makes the queue signature explicit). MenuLogic generation-checks both personal and team reads. For saved data, apply the parsed/collapsed snapshot without a normalization write so MenuLogic does not compete with Options ownership; for defaults, collapse with the same helper and ownership callback, call `writeStoredItems(items, () => generation === loadGenerationRef.current && !cancelled)` so a stale load cannot begin a set, then apply navigation state only on `'committed'` and a still-current generation. A failed default persistence sets `bookmarkLoadIssue` to `bookmark_storage_read_failed` as the existing safe retry copy and never invents fallback menu items.

Change `useMenuLogic`'s return value to include:

```ts
bookmarkLoadIssue: BookmarkLoadIssue
```

FAB renders that issue inside the opened menu with `role="alert"`, using only these translation keys:

```text
bookmarkStorageReadFailed
bookmarkStorageInvalid
bookmarkDefaultsUnreadable
```

Options adds `bookmarkLoadIssue` beside the existing persistence boolean; `applyItemsSnapshot` is called only for a loaded result, so a failed/invalid read leaves the current in-memory UI untouched. MenuLogic retains its previous accepted menu/navigation snapshot on reload failure and sets only the issue. Both use the same translation keys. Add these exact English/Chinese values:

| Key | English | Chinese |
|---|---|---|
| `bookmarkStorageReadFailed` | `Bookmarks could not be read. Your saved data was not changed; retry.` | `无法读取书签。已保存的数据未被更改；请重试。` |
| `bookmarkStorageInvalid` | `Saved bookmarks are invalid. Import a valid backup or Reset to repair them.` | `已保存的书签无效。请导入有效备份或重置以修复。` |
| `bookmarkDefaultsUnreadable` | `Default bookmarks could not be loaded. Repair or reinstall the extension, then retry.` | `无法加载默认书签。请修复或重新安装扩展，然后重试。` |

- [ ] **Step 5: Validate team cache, download, and import through the shared parser**

In `teamCatalog.ts`, replace `any[]` item results with `MenuItem[]`, parse the raw/wrapped JSON before `stampTeamSource`, and return the fixed parse failure on `null`:

```ts
const parsed = parseBookmarkDocument(data)
if (!parsed) {
    const failure: FetchFailure = {
        kind: 'parse',
        message: 'Bookmark schema validation failed',
    }
    warnFetchFailure('bookmarks', failure)
    return { ok: false, failure }
}
const items = stampTeamSource(parsed)
```

Make `stampTeamSource(items: MenuItem[]): MenuItem[]` recurse only through parsed `children` and preserve every parsed unknown own data property. Because input is already the fresh plain parser output, object spread cannot invoke source accessors; omit absent children rather than creating a present `children: undefined` that the defense-in-depth reparse would reject:

```ts
function stampTeamSource(items: MenuItem[]): MenuItem[] {
    return items.map(item => ({
        ...item,
        source: 'team' as const,
        ...(item.children === undefined
            ? {}
            : { children: stampTeamSource(item.children) }),
    }))
}
```

Add this exact cache boundary beside `syncTeamBookmarks`:

```ts
type CachedTeamItemsResult =
    | { kind: 'loaded'; items: MenuItem[] }
    | { kind: 'absent' }
    | { kind: 'invalid' }

function parseCachedTeamItems(
    cache: unknown,
    teamId: string,
): CachedTeamItemsResult {
    try {
        if (
            typeof cache !== 'object'
            || cache === null
            || Array.isArray(cache)
        ) return { kind: 'invalid' }
        const team = Object.getOwnPropertyDescriptor(cache, 'dh_team')
        if (!team || !Object.hasOwn(team, 'value') || team.value !== teamId) {
            return { kind: 'absent' }
        }
        const itemsDescriptor = Object.getOwnPropertyDescriptor(
            cache,
            'dh_team_items',
        )
        if (!itemsDescriptor) return { kind: 'absent' }
        if (!Object.hasOwn(itemsDescriptor, 'value')) return { kind: 'invalid' }
        const items = parseBookmarkItems(itemsDescriptor.value)
        return items ? { kind: 'loaded', items } : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}

    const cachedItems = parseCachedTeamItems(cache, teamId)
    const safeCachedItems = cachedItems.kind === 'loaded' ? cachedItems.items : []
```

Compute this immediately after the initial cache read and before any fetch. Add revoked outer-cache coverage: `parseCachedTeamItems` returns `invalid` without throwing or reading any cache member. `cachedItemsForTeam()` is deleted; every later cached return closes over this parsed discriminant only.

Every `syncTeamBookmarks` return path that currently uses `cachedItemsForTeam()` uses `safeCachedItems`. Manifest/network failure and selected-team-not-found paths retain their existing `failed`/`skipped` status but return only `safeCachedItems`; malformed cache therefore becomes `[]` and is never exposed. On bookmark 304, cache validity is required to claim unchanged, so absent/invalid returns:

```ts
return {
    status: 'failed',
    identity,
    items: [],
    failure: {
        kind: 'parse',
        message: 'Cached bookmark schema validation failed',
    },
    failureStage: 'bookmarks',
}
```

Do this before the 304 timestamp write. For changed results, call Task 1 `parseOwnBookmarkItems(bookmarksResult, 'items')` at this defense seam and persist/return only that parsed value. A missing/accessor/revoked items field or null parse returns the same fixed parse failure before the generation-owned `set`. For network/manifest failure and skipped selected-team paths, return only `safeCachedItems`, which was parsed inside `syncTeamBookmarks` before the fetch. Thus every path that can return or persist team items is parser-backed, including 304, without direct `bookmarksResult.items` access at the hostile cast-test seam.

In MenuLogic and Options team-cache reads, call `parseOwnBookmarkItems(data, 'dh_team_items')` before any item access; only a non-null plain snapshot may render after the existing identity-current check. Never evaluate `data.dh_team_items`, spread the callback result, or pass a raw storage member to the parser. This task hardens the `dh_team_items` boundary only: preserve the established identity/manifest parsing from the prerequisite code and do not broaden Plan E into a Team Manifest schema redesign. In the focused malicious-item tests, keep those other fields ordinary and valid. In `handleImport`, call `parseBookmarkDocument(JSON.parse(text))`; a `null` result follows the fixed localized parse-error branch and never calls `mutatePersonalItems`.

Update `teamManifestSync.ts` result/item annotations to `MenuItem[]`. Before `toSelectedTeamSyncResponse` includes committed/unchanged items, use Task 1 `parseOwnBookmarkItems` at the seam; the typed-cast malformed/accessor/revoked items test must not escape through direct property access:

```ts
const canExposeItems = result.status === 'committed'
    || result.status === 'unchanged'
const parsedItems = canExposeItems
    ? parseOwnBookmarkItems(result, 'items')
    : null
if (canExposeItems && !parsedItems) {
    return {
        status: 'error',
        error: 'Bookmark schema validation failed',
        errorKind: 'parse',
        data: {
            syncStatus: 'failed',
            identity: result.identity,
            ...(requestGeneration === undefined ? {} : { requestGeneration }),
        },
    }
}
```

The normal data builder uses `items: parsedItems!` only for committed/unchanged. It never persists storage, so this is a response-seam check rather than a competing cache parser.

- [ ] **Step 6: Run GREEN**

```powershell
& npm run test:run --prefix extension -- src/utils/bookmarkItems.test.ts src/components/Options.test.tsx src/components/MenuLogic.teamCache.test.ts src/utils/teamCatalog.test.ts src/background/teamManifestSync.test.ts src/components/FAB.bookmarkTelemetry.test.tsx --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Bookmark consumer GREEN failed' }
```

Then run independently:

```powershell
Push-Location -LiteralPath 'extension'
try { & npm exec tsc -- --noEmit -p tsconfig.json; if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' } } finally { Pop-Location }
```

Expected: all six Vitest files pass; TypeScript exits 0 with no diagnostics. The stored-empty tests prove no defaults fetch or resurrection.

- [ ] **Step 7: Prove the discriminant prevents fallback writes**

Temporarily route `{ kind: 'failed' }` through the absent branch in Options. Run:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t 'preserves bookmarks when storage read fails' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Storage-failure mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Storage-failure mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because defaults are fetched or a `dh_items` set is observed. Restore the switch and rerun Task 2 GREEN; expected PASS.

Temporarily restore `cache.dh_team_items` directly in the bookmark-304 return. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/teamCatalog.test.ts -t 'rejects malformed cached bookmarks on 304' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Team-cache mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Team-cache mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because malformed cached data is returned and/or the sync timestamp advances. Restore `parseCachedTeamItems` and rerun Task 2 GREEN; expected PASS.

- [ ] **Step 8: Commit consumer hardening**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/components/Options.tsx',
    'extension/src/components/Options.test.tsx',
    'extension/src/components/MenuLogic.ts',
    'extension/src/components/MenuLogic.teamCache.test.ts',
    'extension/src/utils/teamCatalog.ts',
    'extension/src/utils/teamCatalog.test.ts',
    'extension/src/background/teamManifestSync.ts',
    'extension/src/background/teamManifestSync.test.ts',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.bookmarkTelemetry.test.tsx',
    'extension/src/utils/translations.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 2 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 2 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 2 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 2 staged diff check failed' }
& git commit -m "fix(bookmarks): make loading non-destructive"
if ($LASTEXITCODE -ne 0) { throw 'Task 2 commit failed' }
```

Expected: one commit containing only the listed consumer, sync, test, and translation files; unrelated worktree files remain untouched.

## Task 3: Validate Defaults Before One Generation-Owned Reset Write

**Files:**
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`

**Interfaces:**
- Consumes: Task 1 `readDefaultItems`, existing `ResetTransaction`, `bookmarkGenerationRef`, and bookmark mutation queue.
- Produces: `queueBookmarkStorage(items, ownerGeneration): Promise<'committed' | 'stale'>`; Reset performs exactly one `set({dh_items})` and no remove.

- [ ] **Step 1: Add the failing non-destructive Reset matrix**

Add these exact tests next to the existing Reset transaction suite:

| Scenario | Assertions after Host and SW commit |
|---|---|
| defaults fetch rejects | old personal bookmarks remain in UI/storage; zero `dh_items` remove/set; phase exposes Retry cleanup |
| defaults return HTML/invalid JSON/invalid schema | same assertions for every row |
| final `dh_items` set rejects | old personal bookmarks remain in UI/storage; zero remove; one failed set; Retry remains visible |
| retry after fetch failure | second valid fetch leads to exactly one successful set and completion |
| retry after set failure | second set succeeds, no remove occurred across either attempt, completion appears |
| newer bookmark edit after a failed Reset write | Retry disappears immediately; `resetTransactionRef` is cleared; invoking the captured old retry closure does nothing; edited snapshot remains |
| newer bookmark edit while defaults fetch is deferred | edit clears old local-cleanup ownership; resolved defaults perform no set/apply and do not recreate Retry |
| newer bookmark edit queues while Reset write waits behind an older mutation | Reset intent returns `stale` before its set; old transaction remains cleared; only the newer edit is durably written |
| newer bookmark edit while Reset is `sw-pending` after Host commit | SW Retry remains visible and keeps the original token; the edit does not clear or replace the SW retry action |
| successful SW retry after that newer bookmark edit | SW cleanup commits once; local Team cleanup runs when still identity-safe; old bookmark defaults are skipped; newer bookmarks remain byte-for-byte; transaction completes with `resetCleanupComplete`, not `resetComplete`, and no warning remains |
| a newer Reset replaces the old transaction | old callback sees `not-owner` and cannot clear/retry the newer token |
| team collapse remove callback sets `lastError` | Reset stays `local-cleanup-pending`; Retry retained; no team-state clear, bookmark set/apply, or completion |
| team collapse remove throws synchronously or wrapper Promise rejects | same retained transaction and no later cleanup/bookmark phase |
| valid reset defaults | defaults are recursively collapsed, applied only after set succeeds, exactly one set and zero removes |
| valid default file is `[]` | Reset commits one `set({dh_items: []})`, renders the authoritative empty menu, and never restores hard-coded items |

Filter storage spy calls by `Object.hasOwn(call[0], 'dh_items')`; unrelated Reset storage must not affect counts.
Use these exact titles for Step 2: `validates bookmark defaults before Reset`, `keeps bookmarks when Reset defaults fail`, `uses one generation-owned Reset write`, `newer bookmark edit supersedes Reset local cleanup`, `keeps SW Retry after a newer bookmark edit`, `completes SW Retry while preserving newer bookmarks`, `keeps Reset retryable when team collapse removal reports lastError`, and `keeps Reset retryable when team collapse removal rejects`. Use exact titles `keeps personal bookmarks when the Reset write fails`, `newer bookmark edit supersedes Reset local cleanup`, `keeps SW Retry after a newer bookmark edit`, and `completes SW Retry while preserving newer bookmarks` for Step 6 mutations.

- [ ] **Step 2: Run Reset targets to prove RED**

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t '(validates bookmark defaults before Reset|keeps bookmarks when Reset defaults fail|uses one generation-owned Reset write|newer bookmark edit supersedes Reset local cleanup|keeps SW Retry after a newer bookmark edit|completes SW Retry while preserving newer bookmarks|keeps Reset retryable when team collapse removal reports lastError|keeps Reset retryable when team collapse removal rejects)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Reset RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Reset RED did not fail with Vitest exit 1' }
```

Expected: FAIL because current `runResetLocalCleanup` removes `dh_items` before loading defaults and performs remove-plus-set.

For the two team-collapse rows, expected RED is specifically that failure rejects/escapes or Reset advances without retained local-cleanup Retry; verify no unrelated test/setup failure.

- [ ] **Step 3: Make bookmark writes generation-owned**

Replace the write/remove operation union with write-only captured intent:

```ts
type BookmarkWriteIntent = Readonly<{
    id: number
    ownerGeneration: number
    items: MenuItem[]
}>

const latestBookmarkStorageIntentRef = useRef<BookmarkWriteIntent | null>(null)

const queueBookmarkStorage = (
    items: MenuItem[],
    ownerGeneration = bookmarkGenerationRef.current,
): Promise<'committed' | 'stale'> => {
    const intent: BookmarkWriteIntent = Object.freeze({
        id: ++bookmarkStorageIntentRef.current,
        ownerGeneration,
        items: structuredClone(items),
    })
    latestBookmarkStorageIntentRef.current = intent
    const run = async (): Promise<'committed' | 'stale'> => {
        if (bookmarkGenerationRef.current !== intent.ownerGeneration) return 'stale'
        return writeStoredItems(
            intent.items,
            () => bookmarkGenerationRef.current === intent.ownerGeneration
                && latestBookmarkStorageIntentRef.current !== null
                && latestBookmarkStorageIntentRef.current.id === intent.id,
        )
    }
    const queued = bookmarkStorageQueueRef.current.then(run, run)
    bookmarkStorageQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued
}
```

Keep the current latest-intent persistence-warning ownership around this result: a stale intent is not a storage error; a rejected current intent retains the exact full snapshot for retry; a newer intent is never replaced by an older failure.

Define supersession at the bookmark mutation entry point. A newer personal bookmark edit owns the newer generation and permanently abandons only an older transaction already in `local-cleanup-pending`; it does not cancel `host-pending`/`sw-pending`, and it never touches a newer Reset token:

```ts
type ResetBookmarkScope = 'current' | 'superseded' | 'not-owner'

function resetBookmarkScope(
    transaction: ResetTransaction,
): ResetBookmarkScope {
    const current = resetTransactionRef.current
    if (!current || current.token !== transaction.token) {
        return 'not-owner'
    }
    return bookmarkGenerationRef.current === transaction.bookmarkGeneration
        ? 'current'
        : 'superseded'
}

function supersedeResetLocalCleanup(transaction: ResetTransaction): void {
    const current = resetTransactionRef.current
    if (
        !current
        || current.token !== transaction.token
        || current.phase !== 'local-cleanup-pending'
        || bookmarkGenerationRef.current === current.bookmarkGeneration
    ) return
    resetTransactionRef.current = null
    setResetIncomplete(false)
}

function onBookmarkGenerationAdvanced(): void {
    const current = resetTransactionRef.current
    if (current && current.phase === 'local-cleanup-pending') {
        supersedeResetLocalCleanup(current)
    }
}

function resetBookmarkScopeIsCurrent(
    transaction: ResetTransaction,
): boolean {
    const scope = resetBookmarkScope(transaction)
    if (scope === 'superseded') supersedeResetLocalCleanup(transaction)
    return scope === 'current'
}
```

Immediately after `mutatePersonalItems` increments `bookmarkGenerationRef.current`, call `onBookmarkGenerationAdvanced()`. Bookmark supersession is local-cleanup-specific. Freeze `retainResetRetry` as:

```ts
function retainResetRetry(
    transaction: ResetTransaction,
    retryAction: Exclude<ResetRetryAction, null>,
): void {
    const current = resetTransactionRef.current
    if (!current || current.token !== transaction.token) return

    if (retryAction === 'local-cleanup') {
        const scope = resetBookmarkScope(transaction)
        if (scope === 'not-owner') return
        if (scope === 'superseded') {
            supersedeResetLocalCleanup(transaction)
            return
        }
    }

    updateResetTransaction(transaction.token, {
        phase: retryAction === 'sw' ? 'sw-pending' : 'local-cleanup-pending',
        retryAction,
    })
    setResetIncomplete(true)
}
```

Thus a newer bookmark generation never clears `host-pending` or `sw-pending`, and a failed SW cleanup after Host commit cannot disappear. Only a transaction already owned by `local-cleanup-pending` is abandoned by a newer personal bookmark edit. This prevents stale local callbacks from resurrecting retry ownership without hiding a still-required SW retry.

When SW later commits, detect bookmark supersession before attempting bookmark defaults. Add an explicit completion mode:

```ts
function completeResetCleanup(
    transaction: ResetTransaction,
    completion: 'full-reset' | 'newer-bookmarks-preserved' = 'full-reset',
): void {
    if (resetTransactionRef.current?.token !== transaction.token) return
    updateResetTransaction(transaction.token, {
        phase: 'complete',
        retryAction: null,
    })
    setResetIncomplete(false)
    showSuccess(
        t(completion === 'newer-bookmarks-preserved'
            ? 'resetCleanupComplete'
            : (resetDefaultsAreCurrent() ? 'resetComplete' : 'resetCleanupComplete')),
        2000,
    )
}
```

After an SW success transitions the same token to `local-cleanup-pending`, capture whether `bookmarkGenerationRef.current !== pending.bookmarkGeneration`. Run only still-safe Team collapse cleanup. If bookmarks were superseded, do not call `readDefaultItems`, `queueBookmarkStorage`, or `applyItemsSnapshot`; call `completeResetCleanup(localPending, 'newer-bookmarks-preserved')`. A successful SW retry therefore finishes truthfully while preserving the user's newer bookmark intent. A failed SW retry still calls `retainResetRetry(pending, 'sw')` regardless of bookmark generation.

- [ ] **Step 4: Reorder Reset local cleanup around validated defaults**

In `runResetLocalCleanup`, perform this order and no other `dh_items` mutation:

```ts
const defaultsResult = await readDefaultItems()
if (defaultsResult.kind === 'failed') {
    if (resetBookmarkScopeIsCurrent(pending)) {
        retainResetRetry(pending, 'local-cleanup')
    }
    return
}
if (!resetBookmarkScopeIsCurrent(pending)) {
    return
}
const defaults = collapseBookmarkFolders(
    defaultsResult.items,
    () => resetBookmarkScopeIsCurrent(pending),
)
if (!defaults) {
    if (resetBookmarkScopeIsCurrent(pending)) {
        retainResetRetry(pending, 'local-cleanup')
    }
    return
}

if (resetTeamScopeIsCurrent(pending)) {
    try {
        await new Promise<void>((resolve, reject) => {
            try {
                chrome.storage.local.remove('dh_team_collapsed_labels', () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Reset team collapse cleanup failed'))
                        return
                    }
                    resolve()
                })
            } catch {
                reject(new Error('Reset team collapse cleanup failed'))
            }
        })
        setTeamItems([])
        setTeamSynced('')
        setTeamCollapsedLabels(new Set())
    } catch {
        if (resetBookmarkScopeIsCurrent(pending)) {
            retainResetRetry(pending, 'local-cleanup')
        }
        return
    }
}
const writeResult = await queueBookmarkStorage(
    defaults,
    pending.bookmarkGeneration,
)
if (writeResult !== 'committed') {
    resetBookmarkScopeIsCurrent(pending)
    return
}
if (!resetBookmarkScopeIsCurrent(pending)) return
applyItemsSnapshot(defaults)
completeResetCleanup(pending)
```

`queueBookmarkStorage` returns only `committed|stale`; storage failure rejects. Wrap fetch/write rejection with `if (resetBookmarkScopeIsCurrent(pending)) retainResetRetry(...)`; a superseded/not-owner callback returns silently. Do not apply defaults to React state before the set succeeds. A stale owner exits without reviving old Retry UI; a write already in flight may finish, but the newer queued edit writes afterward and remains authoritative, while no old UI/default apply occurs. Delete every Reset call to `chrome.storage.local.remove('dh_items')` and every `{ kind: 'remove' }` intent. A Retry repeats only a still-owned local-cleanup phase under the original token/generation; it never resends Host defaults or SW Reset after those phases committed.

Add exact tests `keeps Reset retryable when team collapse removal reports lastError` and `keeps Reset retryable when team collapse removal rejects`. The first uses callback-scoped `chrome.runtime.lastError`; the second mocks the Promise/wrapper path to reject (and separately exercises a synchronous `remove` throw via `it.each`). In every row defaults parse successfully, failure occurs before bookmark write, `resetTransaction.phase` remains `local-cleanup-pending`, `retainResetRetry(transaction,'local-cleanup')` owns visible Retry, personal/team UI and `dh_items` remain unchanged, and bookmark set/apply/`completeResetCleanup` do not run. Retry with successful removal then performs one bookmark set and completes.

Add exact tests `keeps SW Retry after a newer bookmark edit` and `completes SW Retry while preserving newer bookmarks`. The first fails the SW callback, edits bookmarks, and asserts the original token plus `retryAction:'sw'` remain visible. The second retries successfully and asserts one SW message for the retry, zero default reads/bookmark Reset writes, the edited `dh_items` snapshot unchanged, Team cleanup only when identity-safe, `resetCleanupComplete` shown, and the warning cleared. Mutating `retainResetRetry` to apply bookmark scope to `sw` must fail the first test; mutating the SW-success supersession branch to call `runResetLocalCleanup` must fail the second.

- [ ] **Step 5: Run GREEN and all Reset regressions**

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx src/background/resetExtensionState.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Reset GREEN failed' }
```

Expected: both files pass. Spy assertions report no Reset-owned `dh_items` remove and one successful set for the valid path.

Run the two exact team-collapse failure GREEN cases:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t '(keeps Reset retryable when team collapse removal reports lastError|keeps Reset retryable when team collapse removal rejects)' --reporter=verbose
if ($LASTEXITCODE -ne 0) { throw 'Team collapse retry GREEN failed' }
```

- [ ] **Step 6: Prove write-before-apply is active**

Temporarily move `applyItemsSnapshot(defaults)` before the awaited set. Run:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t 'keeps personal bookmarks when the Reset write fails' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Write-before-apply mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Write-before-apply mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because default labels appear after the rejected set. Restore the order and rerun Task 3 GREEN; expected PASS.

Temporarily remove the `onBookmarkGenerationAdvanced()` call from `mutatePersonalItems`. Run:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t 'newer bookmark edit supersedes Reset local cleanup' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Reset supersession mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Reset supersession mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because Retry remains visible or the captured old callback recreates it. Restore supersession and rerun Task 3 GREEN; expected PASS.

Temporarily apply bookmark-generation supersession to `retainResetRetry(..., 'sw')`. Run:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t 'keeps SW Retry after a newer bookmark edit' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'SW-retry ownership mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'SW-retry ownership mutation did not fail with Vitest exit 1' }
```

Then restore SW ownership and temporarily route successful SW retry through ordinary bookmark defaults cleanup even after generation changed. Run:

```powershell
& npm run test:run --prefix extension -- src/components/Options.test.tsx -t 'completes SW Retry while preserving newer bookmarks' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'SW-retry bookmark-preservation mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'SW-retry bookmark-preservation mutation did not fail with Vitest exit 1' }
```

Expected: each mutation fails its named test. Restore both and rerun Task 3 GREEN.

- [ ] **Step 7: Commit non-destructive Reset**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/components/Options.tsx',
    'extension/src/components/Options.test.tsx'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 3 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 3 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 3 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 3 staged diff check failed' }
& git commit -m "fix(reset): validate bookmarks before replacement"
if ($LASTEXITCODE -ne 0) { throw 'Task 3 commit failed' }
```

Expected: one independently reviewable Reset commit containing only Options implementation and tests; unrelated worktree files remain untouched.

## Task 4: Strict Durable Analyze Schemas and Latest-Started Ownership

**Files:**
- Create: `extension/src/utils/analysisStore.test.ts`
- Modify: `extension/src/utils/analysisStore.ts`
- Modify: `extension/src/hooks/useAnalysisHydration.ts`
- Modify: `extension/src/hooks/useAnalysisHydration.test.ts`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/background/resetExtensionState.test.ts`

**Interfaces:**
- Consumes: existing request-scoped pending/seen keys and Chrome local storage.
- Produces: `LATEST_ANALYSIS_OWNER_KEY`, `LatestAnalysisOwner`, four strict persisted-record parsers, `parseAnalyzePersistContextValue`, `recordAnalyzeStart`, and `completeAnalyzePersistence` exactly as locked in the file map.

- [ ] **Step 1: Add and run one namespace-based parser-surface RED**

Create `analysisStore.test.ts` with a namespace import so absent new exports cannot fail module linking:

```ts
import { expect, it } from 'vitest'
import * as analysisStoreModule from './analysisStore'

const analysisStoreExports = analysisStoreModule as unknown as Record<
    string,
    unknown
>

it('exports and applies the strict persisted analysis parser surface', () => {
    expect(analysisStoreExports.LATEST_ANALYSIS_OWNER_KEY).toBe(
        'dh_latest_analysis_owner',
    )
    for (const name of [
        'parseLastAnalysis',
        'parsePendingAnalysis',
        'parseLatestAnalysisOwner',
        'parseLastAnalysisIdentity',
        'parseAnalyzePersistContextValue',
    ]) {
        expect(analysisStoreExports[name], `${name} export`).toBeTypeOf(
            'function',
        )
    }
    const parseLastAnalysis = analysisStoreExports.parseLastAnalysis
    if (typeof parseLastAnalysis !== 'function') return
    expect(parseLastAnalysis({
        caseNumber: '1234567890123456',
        status: 'success',
        title: 'Result',
        content: 'Body',
        timestamp: 0,
        seen: false,
        durationSec: 0,
    })).toMatchObject({ timestamp: 0, durationSec: 0 })
})
```

Run only this exact test:

```powershell
& npm run test:run --prefix extension -- src/utils/analysisStore.test.ts -t 'exports and applies the strict persisted analysis parser surface' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analysis parser-surface RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analysis parser-surface RED did not fail with Vitest exit 1' }
```

Expected: Vitest collects the file, prints the exact test title, and fails its assertion because the first new export is absent. A module-link, missing-export collection error, zero matched tests, or unrelated setup failure is invalid RED.

Add compile-only parser surface exports to existing `analysisStore.ts`: exact `LATEST_ANALYSIS_OWNER_KEY`, `LatestAnalysisOwner`, and the five locked parser signatures; each parser temporarily returns `null`. Rerun the same filtered command. Expected: the exact test still fails, now on the valid-record behavior assertion rather than export existence or collection. Retain the namespace import for the entire Task 4 test file.

- [ ] **Step 2: Add failing persisted-schema, reader, and hydration tests**

Add this table for each exported parser. Use objects with ordinary own data for valid rows and `Object.defineProperty` getters, proxies that throw from `getOwnPropertyDescriptor`, and revoked proxies for malicious rows. Access every new runtime export through `analysisStoreExports`; do not add a named import for any Task 4 symbol before implementation.

| Parser | Valid rows | Invalid rows |
|---|---|---|
| `parseLastAnalysis` | modern success/error; legacy no `requestId`; `durationSec: 0`; optional `savedTo`/`errorCode` strings | array/null; wrong status; non-string required fields; non-boolean `seen`; non-finite timestamp/duration; wrong optional fields; accessor/throwing proxy/revoked proxy |
| `parsePendingAnalysis` | string case/request and finite start, including empty case | wrong/missing fields; infinity/NaN; array/accessor/throwing proxy/revoked proxy |
| `parseLatestAnalysisOwner` | exact three-field owner | wrong/missing fields; non-finite start; accessor/throwing proxy/revoked proxy |
| `parseLastAnalysisIdentity` | modern `{caseNumber, requestId}` and legacy `{caseNumber, timestamp}` | neither request nor finite timestamp; wrong types; array/accessor/throwing proxy/revoked proxy |
| `parseAnalyzePersistContextValue` | string case/request and non-empty string titles | empty request/title, wrong fields; array/accessor/throwing proxy/revoked proxy |

Use one assertion helper so an unavailable or malformed runtime export fails inside the named test rather than during collection:

```ts
function requireAnalysisFunction(name: string): (value: unknown) => unknown {
    const candidate = analysisStoreExports[name]
    expect(candidate, `${name} export`).toBeTypeOf('function')
    return candidate as (value: unknown) => unknown
}
```

Assert every valid parser returns a new plain object containing only known fields, every invalid row returns `null`, and no getter/conversion spy runs. Unknown persisted-analysis fields are ignored rather than copied. Include this compatibility assertion through the helper:

```ts
expect(requireAnalysisFunction('parseLastAnalysis')({
    caseNumber: '1234567890123456',
    status: 'success',
    title: 'Result',
    content: 'Body',
    timestamp: 0,
    seen: false,
    durationSec: 0,
})).toMatchObject({ timestamp: 0, durationSec: 0 })
```

In `useAnalysisHydration.test.ts`, seed malformed values independently under:

```text
dh_last_analysis
dh_pending_analysis
dh_pending_analysis:<request>
dh_seen_analysis
dh_seen_analysis:<identity>
dh_latest_analysis_owner
```

For each, assert the hook treats the record as absent, renders no raw value, performs no arithmetic on it, and never removes unrelated keys such as `keep_me`. Add a whole-storage callback row whose result is revoked before delivery; the read rejects with fixed `Analysis storage read failed`, no `Object.entries`/key access escapes, and no key is removed. Preserve and rerun existing tests for stored legacy pending, no-request last/seen identity, `last.seen`, and encoded request IDs. Add one hydrated valid result with `durationSec: 0` and assert the popover exposes `durationSec: 0` rather than dropping it.
Choose the spec-permitted non-destructive policy for this wave: malformed records are ignored and left in place until exact-key Reset; readers do not queue cleanup. Assert the malformed key itself and `keep_me` both remain after hydration.
Add two valid same-case pending records with identical finite `startTime` in reversed insertion orders and assert the same lexicographically larger `requestId` wins both times.

Before production edits, add this exact FAB RED case in `FAB.spinner.test.tsx`:

```ts
it('renders hydrated durationSec zero as 0.0s', async () => {
    state.hydratedPopover = {
        isOpen: true,
        status: 'success',
        title: 'Analyze',
        content: 'Body',
        durationSec: 0,
        identity: { caseNumber: CASE_A, requestId: 'req-zero' },
    }
    render(<FAB />)
    expect(await screen.findByText('0.0s')).toBeInTheDocument()
})
```

The test title is locked for any targeted mutation command. It fails before FAB copies hydrated duration into local popover state.

- [ ] **Step 3: Run the assertion-based schema RED**

```powershell
& npm run test:run --prefix extension -- src/utils/analysisStore.test.ts src/hooks/useAnalysisHydration.test.ts src/components/FAB.spinner.test.tsx --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analysis schema RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analysis schema RED did not fail with Vitest exit 1' }
```

Expected sequence: all three files collect; verbose output names `exports and applies the strict persisted analysis parser surface`, the parser matrix cases, malformed hydration cases, and `renders hydrated durationSec zero as 0.0s`; those tests fail assertions because parser shells return `null`, current readers cast malformed records, and duration zero is dropped. Missing export/module-link, collection failure, or zero matched tests is invalid evidence.

- [ ] **Step 4: Implement descriptor-safe persisted parsers and apply them before use**

In `analysisStore.ts`, import Task 1 `ownDataProperty` and use it for every single-property source read; all five parser bodies are direct compositions of the validators below. Do not define `analysisField` or another equivalent classifier:

```ts
function requiredString(value: unknown, key: string): string | null {
    const field = ownDataProperty(value, key)
    return field.kind === 'value' && typeof field.value === 'string'
        ? field.value
        : null
}

function optionalString(
    value: unknown,
    key: string,
): { valid: boolean; value?: string } {
    const field = ownDataProperty(value, key)
    if (field.kind === 'absent') return { valid: true }
    return field.kind === 'value' && typeof field.value === 'string'
        ? { valid: true, value: field.value }
        : { valid: false }
}

function requiredFinite(value: unknown, key: string): number | null {
    const field = ownDataProperty(value, key)
    return field.kind === 'value'
        && typeof field.value === 'number'
        && Number.isFinite(field.value)
        ? field.value
        : null
}

export function parsePendingAnalysis(value: unknown): PendingAnalysis | null {
    const caseNumber = requiredString(value, 'caseNumber')
    const requestId = requiredString(value, 'requestId')
    const startTime = requiredFinite(value, 'startTime')
    return caseNumber !== null && requestId !== null && startTime !== null
        ? { caseNumber, requestId, startTime }
        : null
}

export function parseLatestAnalysisOwner(
    value: unknown,
): LatestAnalysisOwner | null {
    const parsed = parsePendingAnalysis(value)
    return parsed ? { ...parsed } : null
}

export function parseAnalyzePersistContextValue(
    value: unknown,
): AnalyzePersistContext | null {
    const caseNumber = requiredString(value, 'caseNumber')
    const requestId = requiredString(value, 'requestId')
    const successTitle = requiredString(value, 'successTitle')
    const errorTitle = requiredString(value, 'errorTitle')
    return caseNumber !== null
        && requestId !== null && requestId.length > 0
        && successTitle !== null && successTitle.length > 0
        && errorTitle !== null && errorTitle.length > 0
        ? { caseNumber, requestId, successTitle, errorTitle }
        : null
}
```

`parseLastAnalysis` uses the same helpers for required strings/finite timestamp, exact own boolean `seen`, exact `success|error` status, optional strings, and absent-or-finite `durationSec`; it constructs only the locked keys. `parseLastAnalysisIdentity` requires case plus a string request ID, or when request ID is absent, a finite legacy timestamp. Construct plain known-field snapshots only after every required/optional field validates. Exact rules are:

| Output | Required own data | Optional own data |
|---|---|---|
| `LastAnalysis` | string `caseNumber/title/content`; finite `timestamp`; boolean `seen`; exact `success|error` status | string `requestId/savedTo/errorCode`; finite `durationSec` including zero |
| `PendingAnalysis` | string `caseNumber/requestId`; finite `startTime` | none |
| `LatestAnalysisOwner` | string `caseNumber/requestId`; finite `startTime` | none |
| `LastAnalysisIdentity` | string `caseNumber`; string `requestId` or finite legacy `timestamp` | finite timestamp may remain with modern request ID |

Use these parsers in `getAnalysisSnapshot`, `getLastAnalysis`, `getSeenAnalysis`, pending candidate selection, `getLastAnalysisIdentity`, `matchesLastAnalysisIdentity`, `markSeen`, and all arithmetic/key-generation paths. The callback wrapper for a whole-storage read must first contain `Object.getOwnPropertyDescriptors(stored)` and iterate only the resulting guarded descriptor map; do not run `Object.entries`, `Object.keys`, bracket reads, or prefix tests directly on the callback value. A revoked/throwing whole-storage object rejects with fixed `Analysis storage read failed`, while malformed values under ordinary descriptors are ignored as specified. Every writer (`setLastAnalysis`, `setPendingAnalysis`, `markSeen`, `recordAnalyzeStart`, and completion assembly) constructs a plain value then requires the corresponding parser to accept it before any `set`; direct invalid values reject with fixed text. Invalid stored records behave as absent; this task does not eagerly delete them, so no malformed exact key can cause a broad cleanup. Select the newest pending only from parsed candidates; when finite `startTime` ties, compare `requestId` with ordinary lexicographic `<`/`>` and choose the larger ID so enumeration order cannot change the snapshot. In `useAnalysisHydration`, add `durationSec?: number` to `HydratedPopover` and copy it with an explicit `!== undefined` check so zero survives. In FAB's hydrated-popover mirror, assign `durationSec.toFixed(1) + 's'` only when duration is defined; zero therefore renders `0.0s` rather than disappearing.

The exact FAB change is:

```ts
setResultPopover({
    isOpen: true,
    title: hydration.popover.title,
    content: hydration.popover.content,
    errorCode: hydration.popover.errorCode,
    path: hydration.popover.savedTo,
    duration: hydration.popover.durationSec === undefined
        ? undefined
        : hydration.popover.durationSec.toFixed(1) + 's',
    identity: hydration.popover.identity,
})
```

Do not use a truthy duration check; `0` is valid and visible.

For the whole-storage path, implement one descriptor-map helper in `analysisStore.ts` rather than repeating unsafe enumeration:

```ts
function analysisStorageEntries(
    value: unknown,
): Array<readonly [string, unknown]> | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const entries: Array<readonly [string, unknown]> = []
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== 'string') continue
            const descriptor = descriptors[key]
            if (!descriptor) return null
            entries.push([
                key,
                Object.hasOwn(descriptor, 'value')
                    ? descriptor.value
                    : undefined,
            ] as const)
        }
        return entries
    } catch {
        return null
    }
}
```

Every `get(null)` reader calls this helper and rejects fixed `Analysis storage read failed` on `null`; exact-key reads use `ownDataProperty` on the callback object. An accessor-backed stored key is represented as `undefined` without invoking it, so its parser treats that record as malformed/absent and leaves it in place rather than turning one bad record into a whole-read failure. Pending/seen/reset enumeration operates only on the returned string/value pairs. This contains revoked callback values before prefix matching, identity generation, or arithmetic.

Replace Promise-style analysis storage calls with small callback wrappers that inspect `chrome.runtime.lastError` inside the callback and reject with fixed stage text for get/set/remove. All analysis readers/writers/cleanup use those wrappers, so local failures are consistently catchable by Task 5 and raw Chrome error messages never become UI/log data.

- [ ] **Step 5: Add failing latest-started and cleanup-retry tests**

In `analysisStore.test.ts`, continue using only `analysisStoreExports` for Task 4 runtime symbols. Resolve new ownership functions inside each named test with `requireAnalysisFunction`; do not add named imports. For the completion tests, use this local test-only callable shape so TypeScript does not require an export that is intentionally absent during RED:

```ts
type CompletePersistenceForTest = (
    ctx: {
        caseNumber: string
        requestId: string
        successTitle: string
        errorTitle: string
    },
    completion:
        | { status: 'success'; markdown: string; savedTo?: string }
        | { status: 'error'; error: string; errorCode?: string },
    deps?: {
        now?: () => number
        delay?: (milliseconds: number) => Promise<void>
        logCleanupFailure?: (attempt: number) => void
    },
) => Promise<string[]>

function requireCompletePersistence(): CompletePersistenceForTest {
    return requireAnalysisFunction(
        'completeAnalyzePersistence',
    ) as CompletePersistenceForTest
}
```

Use deferred completion promises and exact storage snapshots for these schedules:

| Schedule | Final `dh_last_analysis` | Pending keys | Owner |
|---|---|---|---|
| A starts, B starts, B completes, A completes | B | neither A nor B | B remains |
| A starts, B starts, A completes first | absent until B; then B | A cleared while B remains pending | B remains |
| A starts/completes | A | A cleared | A remains |
| module reload between starts/completions | latest-started request only | each completion clears only its own key | latest owner remains |
| A completion reads malformed/latest owner | unchanged | A cleared only | owner left untouched |

Assert `recordAnalyzeStart(A)` makes one `storage.set` containing both `pendingAnalysisKey(A)` and `dh_latest_analysis_owner`. Reject that set and assert the promise rejects with no partial success claim. Inspect both values and assert they are not the caller's `ctx`, are plain objects, and exactly equal their parser outputs.
Add `setLastAnalysis`, `setPendingAnalysis`, `markSeen`, and completion-writer tests that pass objects cast from malformed direct values; each writer must first round-trip through its corresponding parser and reject with fixed `Invalid analysis persistence value` text before storage mutation. This proves all writers use the same schema helpers as readers rather than relying on TypeScript casts. Reject a deferred analysis `storage.get` and assert the operation fails with fixed `Analysis storage read failed` text, performs no arithmetic/removal, and never logs/coerces the mock error.
Before implementation, add `it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])` plus a throwing injected `now`; each must reject with `Invalid analysis persistence value` before `storage.set`. Add a callback `lastError` test expecting one attempted combined set, fixed `Analysis storage write failed`, and no second set. Task 5 later asserts the bridge makes no Host send after this rejection.

Add result-write failure and cleanup retry tests with injected dependencies:

```ts
const delays: number[] = []
const attempts: number[] = []
const warnings = await requireCompletePersistence()(CTX, {
    status: 'success',
    markdown: '# Result',
}, {
    delay: async milliseconds => { delays.push(milliseconds) },
    logCleanupFailure: attempt => { attempts.push(attempt) },
})
```

Use the existing FIFO `deferNextStorageGet/Set/Remove` queues in `chromeMock.ts`; Task 1's rejected-get callback fix makes get failures symmetric with the already-repeatable set/remove queues. Tests enqueue exactly three matching failures to prove all attempts and call counts.

Use `deferNextStorageSet('dh_last_analysis').reject(...)` to expect exactly `['analysis_result_not_persisted']` while pending cleanup still succeeds. Reject three matching removes to expect delays `[50, 200]`, attempts `[1, 2, 3]`, and exactly `['analysis_pending_cleanup_failed']`. Reject the cleanup `get` three times as a separate row with the same schedule/warning. Reject result plus cleanup operations to expect this fixed order:

```ts
[
    'analysis_result_not_persisted',
    'analysis_pending_cleanup_failed',
]
```

Assert no fourth attempt or timer remains after resolution and logs contain only fixed stage text/attempt numbers, not rejection objects.
Between cleanup attempts, replace A's key with malformed/different-request data and assert the next reread leaves it untouched, stops retrying that key, and does not report cleanup failure for A.
Use these exact titles for the Step 6 RED filter: `latest-started request owns the singleton result`, `cleanup retry uses three attempts and fixed delays`, `warning order follows the allowlist`, and `writes pending and owner in one storage set`. Name the ownership mutation target exactly `A cannot replace the singleton while B is pending`.

- [ ] **Step 6: Run ownership tests to prove RED**

```powershell
& npm run test:run --prefix extension -- src/utils/analysisStore.test.ts -t '(latest-started request owns the singleton result|cleanup retry uses three attempts and fixed delays|warning order follows the allowlist|writes pending and owner in one storage set)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analysis ownership RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analysis ownership RED did not fail with Vitest exit 1' }
```

Expected: FAIL because completion currently writes last by completion order, start has no owner/finite-clock guard/callback-aware combined writer, and cleanup has no bounded retry/warning result.
All four filtered titles must appear in verbose output and fail assertions. A missing-export module-link error, collection failure, or zero matched tests is invalid RED.

- [ ] **Step 7: Implement the serialized owner/completion transaction**

Use this exact storage ownership; after constructing `start`, `parseLatestAnalysisOwner(start)` and `parsePendingAnalysis(start)` must both succeed before the shared set, otherwise throw the fixed writer error. The shown object may be reused only after both parser calls return plain accepted values:

```ts
export const LATEST_ANALYSIS_OWNER_KEY = 'dh_latest_analysis_owner'

export async function recordAnalyzeStart(
    ctx: AnalyzePersistContext,
    now: () => number = Date.now,
): Promise<void> {
    const parsed = parseAnalyzePersistContextValue(ctx)
    if (!parsed) throw new Error('Invalid analysis persistence value')
    await queueAnalysisMutation(async () => {
        let startTime: number
        try {
            startTime = now()
        } catch {
            throw new Error('Invalid analysis persistence value')
        }
        if (!Number.isFinite(startTime)) {
            throw new Error('Invalid analysis persistence value')
        }
        const pending = parsePendingAnalysis({
            caseNumber: parsed.caseNumber,
            requestId: parsed.requestId,
            startTime,
        })
        const owner = parseLatestAnalysisOwner({
            caseNumber: parsed.caseNumber,
            requestId: parsed.requestId,
            startTime,
        })
        if (!pending || !owner) {
            throw new Error('Invalid analysis persistence value')
        }
        await setAnalysisStorage({
            [pendingAnalysisKey(parsed.requestId)]: pending,
            [LATEST_ANALYSIS_OWNER_KEY]: owner,
        })
    })
}
```

`now()` and both parsers are inside the queued mutation, immediately before `setAnalysisStorage`, so start timestamp/owner ordering follows serialized start acceptance rather than time spent waiting behind an earlier mutation. No Host call occurs until the queued set resolves.

`setAnalysisStorage(values)` is the Task 4 callback wrapper:

```ts
function setAnalysisStorage(values: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(values, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Analysis storage write failed'))
                    return
                }
                resolve()
            })
        } catch {
            reject(new Error('Analysis storage write failed'))
        }
    })
}
```

The single `setAnalysisStorage` call contains both parser-returned pending and owner objects, preserving one atomic Chrome set and making the prewritten finite-clock/callback-error tests pass.

`completeAnalyzePersistence` queues one serialized mutation. Its `now` defaults to `Date.now` and its `delay` defaults to `milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))`; call `now()` once when constructing the last result. `logCleanupFailure` defaults to `attempt => console.warn('[DH] Analysis pending cleanup failed', { attempt })`, which logs only fixed text plus the allowlisted integer. No delay or callback runs after the returned promise resolves. Inside it:

Before entering the queue, run `parseAnalyzePersistContextValue(ctx)`, freeze the plain result, and reject invalid direct callers with the fixed writer error. This prevents the caller mutating case/request/title values while the mutation waits behind another request.

1. Read and parse `dh_latest_analysis_owner`. A malformed owner is treated as no match: do not write the singleton, still clean only this request, and leave the malformed owner untouched for diagnosis/Reset.
2. Ownership matches only when both owner `requestId` and `caseNumber` equal the context. On a match, construct a typed `LastAnalysis` from the normalized completion and attempt one `dh_last_analysis` set. On rejection, append `analysis_result_not_persisted` and continue.
3. If it does not match, do not touch `dh_last_analysis` and do not emit a result-persistence warning. A newer owner's malformed record is no permission for the older completion to regain ownership.
4. In `finally`, remove `pendingAnalysisKey(ctx.requestId)` when the key exists and its parsed value matches both request and case, and remove a legacy singleton only when its parsed request/case also match. Retry that exact cleanup at most three total attempts, delaying 50 ms after attempt 1 and 200 ms after attempt 2.
5. After attempt 3 fails, append `analysis_pending_cleanup_failed`. Never remove another request's pending key and never remove the latest owner on completion.
6. Filter `ANALYSIS_PERSISTENCE_WARNING_ORDER` by observed failures and return that array, regardless of exception order.

Delete `recordAnalyzeSuccess`, `recordAnalyzeError`, and `setLastAnalysisInMutation` after migrating all callers/tests to `completeAnalyzePersistence`; they combine result persistence, broad age arithmetic, and cleanup in a way that can mask outcomes. Keep public `clearPendingIfMatches` for existing isolated/request-recovery callers, but reimplement it through the same parsed exact-key cleanup primitive. Keep stale-pending garbage collection read-only-safe by parsing each candidate before age arithmetic and removing only the exact parsed stale key in a separate successful mutation.

Each cleanup attempt rereads the exact request key and legacy singleton. If the request key is absent, that part is already clean; if present but malformed or carrying a different parsed request/case, leave it untouched and treat this request's scoped cleanup as complete. Only a Chrome get/remove rejection counts as a failed attempt. This prevents retries from deleting data that was replaced between attempts.

- [ ] **Step 8: Write and run the Reset-owner RED before implementation**

Before changing Reset production behavior, extend the existing Reset test to seed the owner plus `keep_me`, then assert owner/last/pending/seen keys are removed while `keep_me` remains. Name it exactly `clears the latest analysis owner during scoped Reset`. Run:

```powershell
& npm run test:run --prefix extension -- src/background/resetExtensionState.test.ts -t 'clears the latest analysis owner during scoped Reset' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analysis owner Reset RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analysis owner Reset RED did not fail with Vitest exit 1' }
```

Expected: the named test collects and FAILS because the current Reset allowlist leaves `LATEST_ANALYSIS_OWNER_KEY` behind. Then add `LATEST_ANALYSIS_OWNER_KEY` to the exact allowlist in `resetAnalysisState`. `resetExtensionState.test.ts` continues to prove Team identity is rechecked before `clearAnalysisState`; no Reset ordering changes are made here.

- [ ] **Step 9: Run GREEN and restore compatibility suite**

```powershell
& npm run test:run --prefix extension -- src/utils/analysisStore.test.ts src/hooks/useAnalysisHydration.test.ts src/components/FAB.spinner.test.tsx src/background/resetExtensionState.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Analysis persistence GREEN failed' }
```

Then run independently:

```powershell
Push-Location -LiteralPath 'extension'
try { & npm exec tsc -- --noEmit -p tsconfig.json; if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' } } finally { Pop-Location }
```

Expected: all four test files pass; TypeScript exits 0. Legacy no-request last records, singleton pending/seen, and hydrated `durationSec: 0 -> 0.0s` assertions remain GREEN.

- [ ] **Step 10: Prove duration-zero and latest-owner guards are active**

Temporarily replace the hydrated duration's explicit `=== undefined` check with a truthy check. Run:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.spinner.test.tsx -t 'renders hydrated durationSec zero as 0.0s' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Duration-zero mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Duration-zero mutation did not fail with Vitest exit 1' }
```

Expected mutation output: the named test runs and Vitest exits nonzero because `0.0s` disappears. Restore the explicit undefined check and rerun Task 4 GREEN; expected PASS.

Temporarily replace the completion owner check with `true`. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/analysisStore.test.ts -t 'A cannot replace the singleton while B is pending' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Latest-owner mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Latest-owner mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because `dh_last_analysis.requestId` is A instead of absent/B-owned. Restore the check and rerun Task 4 GREEN; expected PASS.

- [ ] **Step 11: Commit durable ownership**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/utils/analysisStore.ts',
    'extension/src/utils/analysisStore.test.ts',
    'extension/src/hooks/useAnalysisHydration.ts',
    'extension/src/hooks/useAnalysisHydration.test.ts',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/background/resetExtensionState.test.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 4 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 4 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 4 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 4 staged diff check failed' }
& git commit -m "fix(analysis): enforce latest-started persistence ownership"
if ($LASTEXITCODE -ne 0) { throw 'Task 4 commit failed' }
```

Expected: one commit containing the strict storage boundary, ownership transaction, retry behavior, hydration changes, and their tests; unrelated worktree files remain untouched.

## Task 5: Pure Analyze Routing, Strict Bridge, and Non-Masking Persistence Warnings

**Files:**
- Modify: `extension/src/background/analyzeBridge.ts`
- Modify: `extension/src/background/analyzeBridge.test.ts`
- Create: `extension/src/background/analyzeRequestHandler.ts`
- Create: `extension/src/background/analyzeRequestHandler.test.ts`
- Create: `extension/src/background/nativeMessageWire.ts`
- Create: `extension/src/background/nativeMessageWire.test.ts`
- Modify: `extension/src/background/serviceWorker.ts`
- Create: `extension/src/components/ResultPopover.tsx`
- Create: `extension/src/components/ResultPopover.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/components/FAB.promptSourceErrors.test.tsx`
- Modify: `extension/src/utils/promptSourceErrors.ts`
- Modify: `extension/src/utils/promptSourceErrors.test.ts`
- Modify: `extension/src/utils/translations.ts`

**Interfaces:**
- Consumes: Task 1 `ownDataProperty`; Task 4 `recordAnalyzeStart`, `completeAnalyzePersistence`, `AnalyzeCompletion`, and `AnalysisPersistenceWarning`.
- Produces: the exact `AnalyzeForwardResponse`, `AnalyzeNativePayload`, `AnalyzeNativeAction`, `AnalyzeForwardDeps`, `AuthorizedAnalyzeTransport`, `AnalyzeRequestHandlerDeps`, `parseAnalyzeForwardRequest`, `handleAnalyzeForward`, `handleAnalyzeRequest`, `NonAnalyzeNativeMessageDecision`, `guardNonAnalyzeNativeMessage`, `NativeMessageWireDeps`, and `postNativeMessageWire` declarations locked in Public Interfaces. Do not introduce a `ParsedAnalyzeForwardRequest` alias or a separate authorization-decision type. These additional UI/parser interfaces are:

```ts
export interface ParsedAnalyzeSuccess {
    markdown: string
    savedTo?: string
}

export function isAnalyzePayload(payload: unknown): boolean
export function parseAnalyzeSuccess(value: unknown): ParsedAnalyzeSuccess | null
export function normalizeAnalyzeHostOutcome(value: unknown): AnalyzeForwardResponse
export function parseAnalyzeForwardResult(value: unknown): AnalyzeForwardResponse
export function localizeAnalyzeError(
    errorCode: unknown,
    fallback: string,
    t: (key: string) => string,
): string

export interface ResultPopoverProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    content: string
    errorCode?: string
    filePath?: string
    duration?: string
    isAnalyze?: boolean
    durabilityWarning?: string
}
```

`parseAnalyzeForwardRequest` is the only raw Analyze request parser. `handleAnalyzeRequest` owns parse/atomic transport acquisition/delegation and has no Chrome, Native port, telemetry, context-menu, or Service Worker imports. `handleAnalyzeForward` accepts only the parser-produced inner action plus context, revalidates the context through `parseAnalyzePersistContextValue`, then owns start, leased send, outcome normalization, completion persistence, and warnings. Plan E's baseline provider returns an allow-all transport wrapping current `sendNativeMessage`; Plan D replaces only that provider with one port-specific gated lease.

Migrate every direct bridge unit call to a complete typed fixture; raw inner parsing belongs only to parser/handler tests:

```ts
const HOST_PAYLOAD: AnalyzeNativePayload = {
    text: 'full context',
    context: 'Case form',
    timestamp: '7/21/2026, 10:00:00 AM',
    rootPath: '',
    product: 'Dynamics 365',
    caseNumber: '1234567890123456',
}

const FORWARDED: AnalyzeNativeAction = {
    action: 'analyze_error',
    requestId: CTX.requestId,
    payload: HOST_PAYLOAD,
}

await handleAnalyzeForward(FORWARDED, CTX, { send })
```

The raw valid fixture used by parser/handler tests is:

```ts
function validAnalyzePayload(): Record<string, unknown> {
    return {
        action: 'analyze_error',
        requestId: 'request-1',
        payload: { ...HOST_PAYLOAD },
        _persist: {
            caseNumber: '1234567890123456',
            successTitle: 'Analyze result',
            errorTitle: 'Analyze failed',
        },
    }
}
```

Do not pass `_persist` to `handleAnalyzeForward` or construct `AnalyzeNativeAction` with a cast. Its direct tests vary `context`, Host outcomes, and injected persistence dependencies, while `parseAnalyzeForwardRequest` tests own all raw metadata/sanitization cases.

- [ ] **Step 1: Add failing parser and pure routing-boundary tests**

In `analyzeBridge.test.ts`, add direct `parseAnalyzeForwardRequest` coverage using an inner payload containing top-level `requestId` and `_persist`. Add this exact rejection table:

| Malformation | Expected |
|---|---|
| missing/empty/non-string top-level `requestId` | fixed invalid-context result; Host not called; no storage write |
| `_persist` missing/null/array/function | same |
| `_persist.caseNumber` non-string | same; empty string remains valid |
| empty/non-string `successTitle` or `errorTitle` | same |
| only `_persist.requestId` present | same; it is never a fallback source |
| missing/non-string payload `text`, `context`, `timestamp`, or `rootPath` | same; all four are required because current FAB always emits strings; explicit empty `rootPath` remains valid |
| optional payload `product`/`caseNumber` | absent or string succeeds; present undefined/null/other type is malformed |
| optional payload `rootPathOverrideProvided` | absent or exact `true` succeeds; present false/null/string/number/object/array is malformed |
| getter for any metadata or recognized payload field | same; getter spy has zero calls; raw value not logged |
| proxy whose descriptor trap throws | same fixed result; exception is contained; no conversion hook, secret, or raw value is observed; access remains bounded and does not repeat after classification |
| top-level attacker `type`, `extension_warnings`, arbitrary key, own data `__proto__`, and symbol | successful parse strips every attacker key; exact output keys are `action,requestId,payload`; no pollution |
| outer runtime wrapper passed as `inner`: `{type:'NATIVE_MSG',payload:VALID_INNER}` | fixed invalid result; provider/storage/send untouched |
| nested runtime wrapper in action payload `{type:'NATIVE_MSG',payload:VALID_PAYLOAD}` | fixed invalid result; wrapper is never forwarded |
| payload unknown own string key, `type`, `extension_warnings`, own `__proto__`, or symbol | fixed invalid result for every row; no pollution or conversion |
| payload array/revoked proxy/proxy descriptor or ownKeys trap | fixed `{ok:false,response:...}` invalid result; no property-get trap result, coercion, secret, or prototype mutation is observed |
| request proxy throws on `ownKeys` | fixed invalid-context result; no start/Host/coercion/prototype mutation |
| request proxy throws on `getOwnPropertyDescriptor` | same fixed invalid-context result and no side effect |

Every rejected parse is exactly:

```ts
{
    ok: false,
    response: {
        status: 'error',
        error_code: 'invalid_analyze_persistence_context',
        error: 'Analyze persistence context is invalid.',
    },
}
```

For valid input, assert `ok === true`, then narrow before reading `forwarded/context`. The exact fresh frozen `forwarded` object is:

```ts
expect(parsed.forwarded).toEqual({
    action: 'analyze_error',
    requestId: 'request-1',
    payload: HOST_PAYLOAD,
})
expect(Object.isFrozen(parsed.forwarded)).toBe(true)
expect(Object.isFrozen(parsed.forwarded.payload)).toBe(true)
expect(Object.isFrozen(parsed.context)).toBe(true)
expect(Reflect.ownKeys(parsed.forwarded)).toEqual([
    'action', 'requestId', 'payload',
])
expect(Object.keys(parsed.forwarded.payload)).toEqual([
    'text', 'context', 'timestamp', 'rootPath', 'product', 'caseNumber',
])
expect(Reflect.ownKeys(parsed.forwarded.payload)).toEqual([
    'text', 'context', 'timestamp', 'rootPath', 'product', 'caseNumber',
    'toJSON',
])
expect(Object.getOwnPropertyDescriptor(
    parsed.forwarded.payload,
    'toJSON',
)).toEqual(expect.objectContaining({ value: undefined, enumerable: false }))
```

Assert `Object.getPrototypeOf(parsed.forwarded)` and `Object.getPrototypeOf(parsed.forwarded.payload)` are exactly `Object.prototype`. Assert `requestId: ' top-level '` is preserved exactly while empty `''` is rejected. Assert `_persist`, top-level `type`, `extension_warnings`, attacker `__proto__`, arbitrary string key, and symbol remain present on the caller's original object but are absent from `forwarded`, proving construction is fresh and exact rather than mutation/copying. Payload attacker rows reject instead of dropping unknown fields.

Before creating `analyzeRequestHandler.ts`, create `analyzeRequestHandler.test.ts`. It imports `handleAnalyzeRequest` from the absent handler module plus only established Task 4 storage symbols/chromeMock support; define request, Host-response, and denial fixtures locally with literal inference. Do not import not-yet-added types from `analyzeBridge.ts` in this isolated missing-module RED. Use these exact test titles and assertions:

| Exact title | Setup | Assertions |
|---|---|---|
| `returns invalid Analyze metadata before transport acquisition, storage, or send` | malformed `_persist`; provider/transport spies | fixed invalid response; provider and transport not called; `chromeMockSpies.storageSet` untouched |
| `returns a denied transport acquisition before persistence or send` | valid inner; provider returns typed denial | order is `acquire` only; exact denial response returned; no storage set/transport send |
| `records Analyze start before sending on the acquired transport` | valid inner; provider returns transport; storage-set wrapper records pending+owner; transport records send | exact order `acquire,start,leased-send`; leased send called once with exact action below |
| `binds acquisition and send to one transport lease` | provider captures frozen action and returns transport A; transport B is a decoy | provider called once; A sends once; B never sends; same action object reaches provider and A |
| `fails a disconnected lease without reacquiring or reconnecting` | transport A send rejects fixed disconnect; provider would return B on a second call | fixed normalized Host error; provider once, A once, B zero; no retry/reconnect under old gate |
| `never double wraps or copies attacker outer fields` | valid inner with top-level `type`, nested-wrapper extra, `extension_warnings`, own `__proto__`, arbitrary key, symbol | provider and leased send receive exactly three-key action and exact payload; caller unchanged |
| `rejects nested wrappers and unknown Analyze payload keys` | table of nested wrapper, `type`, `extension_warnings`, own `__proto__`, symbol, arbitrary payload key | fixed invalid response; provider/storage/send untouched |
| `rejects reserved metadata on non-Analyze Native messages` | ordinary `ping`; own `_persist`/`extension_warnings` data, undefined, non-enumerable, accessor; own `toJSON`; symbols; malformed/missing/boxed action; malformed request ID; revoked/throwing/stateful Proxy rows | ordinary ping returns a fresh plain frozen shallow snapshot; reserved/malformed rows return fixed `invalid_native_message_metadata`; no Native send, getter, coercion, raw log, storage, or telemetry |
| `captures a frozen non-Analyze snapshot before source mutation` | valid source with nested object; mutate source and add `_persist` after guard | forwarded top level is unchanged/frozen/not source identity; nested object identity is preserved; reserved metadata is absent |
| `denies an action that changes to Analyze during snapshot` | stateful Proxy reports `ping` during `isAnalyzePayload` and `analyze_error` during guard descriptor capture | fixed denial; no acquire/storage/send |
| `drops inherited fields from the non-Analyze snapshot` | valid source inherits `inherited:'drop'` and owns action/payload | own enumerable fields survive; `inherited` is absent; output prototype is `Object.prototype` |
| `captures one stateful Proxy descriptor snapshot` | Proxy descriptor traps would return different values on a second source capture | one `getOwnPropertyDescriptors` pass; frozen output keeps first captured values; no later source trap changes it |

The denial fixture and assertion are exact:

```ts
const DENIED = {
    status: 'error',
    error_code: 'host_protocol_incompatible',
    error: 'Dynamics Helper Host is incompatible. Retry the update or run the manual installer.',
} as const
const acquireAuthorizedTransport = vi.fn(async () => ({
    allowed: false as const,
    response: DENIED,
}))
const transportSend = vi.fn()
const result = await handleAnalyzeRequest(validAnalyzePayload(), {
    acquireAuthorizedTransport,
})
expect(result).toEqual(DENIED)
expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
expect(transportSend).not.toHaveBeenCalled()
```

For the real start-before-send assertion, wrap the established storage mock and identify the one combined pending/owner write:

```ts
const order: string[] = []
const originalSet = chromeMockSpies.storageSet.getMockImplementation()!
chromeMockSpies.storageSet.mockImplementation((items, callback) => {
    if (
        Object.hasOwn(items, pendingAnalysisKey('request-1'))
        && Object.hasOwn(items, LATEST_ANALYSIS_OWNER_KEY)
    ) order.push('start')
    return originalSet(items, callback)
})
const transport = {
    send: vi.fn(async () => {
        order.push('leased-send')
        return HOST_SUCCESS
    }),
}
const acquireAuthorizedTransport = vi.fn(async () => {
    order.push('acquire')
    return { allowed: true as const, transport }
})
await handleAnalyzeRequest(validAnalyzePayload(), {
    acquireAuthorizedTransport,
})
expect(order.slice(0, 3)).toEqual(['acquire', 'start', 'leased-send'])
```

The exact send assertion is:

```ts
expect(transport.send).toHaveBeenCalledTimes(1)
expect(transport.send).toHaveBeenCalledWith({
    action: 'analyze_error',
    requestId: 'request-1',
    payload: HOST_PAYLOAD,
})
expect(Reflect.ownKeys(transport.send.mock.calls[0][0])).toEqual([
    'action', 'requestId', 'payload',
])
```

The lease-disconnect test is exact:

```ts
const transportB = {
    send: vi.fn(async () => HOST_SUCCESS),
}
const transportA = {
    send: vi.fn(async () => {
        throw new Error('Native Host disconnected unexpectedly')
    }),
}
const acquireAuthorizedTransport = vi.fn()
    .mockResolvedValueOnce({ allowed: true, transport: transportA })
    .mockResolvedValueOnce({ allowed: true, transport: transportB })

await expect(handleAnalyzeRequest(validAnalyzePayload(), {
    acquireAuthorizedTransport,
})).resolves.toMatchObject({
    status: 'error',
    error: 'Native Host disconnected unexpectedly',
})
expect(acquireAuthorizedTransport).toHaveBeenCalledTimes(1)
expect(transportA.send).toHaveBeenCalledTimes(1)
expect(transportB.send).not.toHaveBeenCalled()
```

For the non-Analyze guard, assert the exact snapshot behavior:

```ts
const ping = { action: 'ping', requestId: 'ping-1' }
const guardedPing = guardNonAnalyzeNativeMessage(ping)
expect(guardedPing.ok).toBe(true)
if (!guardedPing.ok) throw new Error('Expected ordinary ping snapshot')
expect(guardedPing.forwarded).toEqual(ping)
expect(guardedPing.forwarded).not.toBe(ping)
expect(Object.getPrototypeOf(guardedPing.forwarded)).toBe(Object.prototype)
expect(Object.isFrozen(guardedPing.forwarded)).toBe(true)
expect(Object.getOwnPropertyDescriptor(
    guardedPing.forwarded,
    'toJSON',
)).toEqual(expect.objectContaining({ value: undefined, enumerable: false }))

for (const key of ['_persist', 'extension_warnings'] as const) {
    const value = { action: 'ping', requestId: 'ping-1' }
    Object.defineProperty(value, key, {
        value: undefined,
        enumerable: true,
    })
    expect(guardNonAnalyzeNativeMessage(value)).toEqual({
        ok: false,
        response: {
            status: 'error',
            error: 'Invalid Extension Native message metadata.',
            error_code: 'invalid_native_message_metadata',
        },
    })
}
```

Add non-enumerable reserved fields, own `toJSON`, symbols, accessors, revoked/throwing Proxies, malformed action/request ID, stateful action-flip, source-mutation, and inherited `Object.prototype.toJSON` rows around the same fixed result. Accessor and inherited hooks remain zero because the guard inspects descriptors and adds its inert own shadow. Non-object/array inputs always return the fixed denial. Assert ordinary non-enumerable fields are ignored and nested ordinary values retain identity.

In `binds acquisition and send to one transport lease`, capture the provider argument and assert `transportA.send.mock.calls[0][0]` is the same object by identity, not merely deep-equal.

The handler tests import only the pure handler/bridge plus established storage test support. The injected provider and returned transport are the exact gate/send seams.

Run the new routing test alone before creating its module:

```powershell
if (Test-Path -LiteralPath 'extension/src/background/analyzeRequestHandler.ts') {
    throw 'Analyze request handler unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analyze request-handler RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze request-handler RED did not fail with Vitest exit 1' }
```

Expected: the named file fails only because `./analyzeRequestHandler` is missing. After implementation, inferred fixtures are checked against `handleAnalyzeRequest`'s locked dependency/response types at the call boundary. A no-test/configuration/other missing-export failure is invalid RED.

Immediately add compile-only `AnalyzeForwardResponse`, `AnalyzeNativePayload`, and `AnalyzeNativeAction` declarations to `analyzeBridge.ts`. Also export runtime shells for every new Task 5 symbol already imported by tests: `isAnalyzePayload` returns false; `parseAnalyzePersistContext`/`parseAnalyzeSuccess` return null; `parseAnalyzeForwardRequest` returns the fixed invalid discriminant; and `normalizeAnalyzeHostOutcome`/`parseAnalyzeForwardResult` return the fixed malformed response. Existing `handleAnalyzeForward` remains callable until Step 6 replaces its implementation/signature. Then create `analyzeRequestHandler.ts` as a compile-only shell importing only those bridge types and exporting the locked `AuthorizedAnalyzeTransport`, `AnalyzeRequestHandlerDeps`, `NonAnalyzeNativeMessageDecision`, `guardNonAnalyzeNativeMessage`, and `handleAnalyzeRequest` signatures. The temporary bodies return fixed denials and do not call the provider:

```ts
export async function handleAnalyzeRequest(
    _inner: unknown,
    _deps: AnalyzeRequestHandlerDeps,
): Promise<AnalyzeForwardResponse> {
    return {
        status: 'error',
        error_code: 'invalid_analyze_persistence_context',
        error: 'Analyze persistence context is invalid.',
    }
}

export function guardNonAnalyzeNativeMessage(
    _inner: unknown,
): NonAnalyzeNativeMessageDecision {
    return {
        ok: false,
        response: {
            status: 'error',
            error: 'Invalid Extension Native message metadata.',
            error_code: 'invalid_native_message_metadata',
        },
    }
}
```

Rerun `analyzeRequestHandler.test.ts`; imports must now succeed and the valid/denied/lease assertions must fail. The later Step 6 replaces this shell after all behavioral RED evidence is captured.

Still before production implementation, write `nativeMessageWire.test.ts` with these exact titles:

| Exact title | Assertions |
|---|---|
| `adds one safe request ID without discarding the guarded snapshot` | request-ID-less `get_config` calls ID factory once; final post has the same enumerable action fields plus generated ID; nested payload identity survives; final object is new/plain/frozen |
| `preserves the parser-owned Analyze request ID and payload` | ID factory is not called; posted request ID is unchanged; posted payload is the exact parser-owned payload object with inert non-enumerable `toJSON` |
| `registers before posting the final Native wire object` | exact order is `register,post`; both use the same primitive ID |
| `shadows inherited toJSON on the final wire object` | polluted `Object.prototype.toJSON` spy remains zero during `JSON.stringify(posted)`; serialized data contains action/requestId and no `toJSON` key |
| `shadows inherited toJSON on the serialized Analyze payload` | parser-owned Analyze payload under polluted `Object.prototype.toJSON` is posted then serialized | inherited hook remains zero; serialized nested payload has only exact schema data |
| `rejects an invalid generated Native request ID before registration` | empty/non-string generated value throws fixed `Invalid Native message request ID`; no register/post/unregister |
| `does not post when Native registration throws` | `register` throws a sentinel | exact sentinel propagates; zero post/unregister |
| `unregisters once when posting throws` | order is `register,post,unregister`; original post error is rethrown; no retry or second cleanup |
| `preserves the posting failure when unregister also throws` | post and unregister throw distinct sentinels | original post sentinel propagates; unregister called once; no retry/log/coercion |

Create `nativeMessageWire.ts` as a compile-only shell before its first test run:

```ts
export interface NativeMessageWireDeps {
    createRequestId(): string
    register(requestId: string): void
    unregister(requestId: string): void
    postMessage(message: Readonly<Record<string, unknown>>): void
}

export function postNativeMessageWire(
    _forwarded: Readonly<Record<string, unknown>>,
    _deps: NativeMessageWireDeps,
): string {
    return ''
}
```

Run the assertion RED:

```powershell
& npm run test:run --prefix extension -- src/background/nativeMessageWire.test.ts -t '(adds one safe request ID without discarding the guarded snapshot|preserves the parser-owned Analyze request ID and payload|registers before posting the final Native wire object|shadows inherited toJSON on the final wire object|shadows inherited toJSON on the serialized Analyze payload|rejects an invalid generated Native request ID before registration|does not post when Native registration throws|unregisters once when posting throws|preserves the posting failure when unregister also throws)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Native wire behavioral RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Native wire behavioral RED did not fail with Vitest exit 1' }
```

Expected: all nine titles collect and fail assertions against the shell. Missing-module/export, zero matches, or setup failure is invalid evidence.

Reject the pending/owner set through both synchronous/injected failure and callback `lastError` in bridge/handler coverage; each returns this exact pre-send response with no Host send:

```ts
{
    status: 'error',
    error_code: 'analysis_persistence_start_failed',
    error: 'Analyze persistence could not be started.',
}
```

- [ ] **Step 2: Add failing strict Host-success parser tests**

Add a table around the current double Host wrapper. One valid inner success fixture is:

```ts
{
    status: 'success',
    data: {
        status: 'success',
        data: { markdown: '# Report', saved_to: 'report.md', ignored: 'drop' },
    },
}
```

Expect the normalized Extension result to contain only:

```ts
{ status: 'success', data: { markdown: '# Report', saved_to: 'report.md' } }
```

Feed that value and each malformed one-layer variant directly to `parseAnalyzeForwardResult`; valid success/error plus allowlisted warnings survive as a fresh plain object, while unknown/duplicate/out-of-order warning codes, malformed fields, accessors, and proxies become the same fixed malformed error without coercion.

Omitted `saved_to` is valid. Arrays/null, missing or non-string `markdown`, present non-string `saved_to`, accessor/proxy fields, and inner `status: 'success'` with malformed `data` all become exactly:

```ts
{
    status: 'error',
    error_code: 'malformed_native_response',
    error: 'The Native Host returned a malformed Analyze response.',
}
```

Use a secret-bearing object whose `toJSON` and `toString` throw. Assert the secret is absent from the returned result, storage, DOM, telemetry, and all console spies, and both hooks have zero calls.

- [ ] **Step 3: Add failing persistence-warning outcome tests**

For normalized Host success, Host error, and `deps.send` rejection, independently fail the result set, all three cleanup attempts, both, and an injected unexpected `completeAnalyzePersistence` throw. The unexpected throw must preserve the normalized outcome and attach both warnings in fixed order. Assert:

```ts
expect(result).toEqual({
    status: 'success',
    data: { markdown: '# Report', saved_to: 'report.md' },
    extension_warnings: [
        'analysis_result_not_persisted',
        'analysis_pending_cleanup_failed',
    ],
})
```

The corresponding Host error keeps its exact `status`, safe `error`, and normalized `error_code`; warnings are the only addition. An empty warning array is omitted. Assert `deps.send` payload never contains `extension_warnings` and that result-persistence rejection never causes a generic Service Worker error. Name the successful result-write-failure case exactly `Host success survives result write failure` before its Step 9 mutation command.

Before any production edit, add these FAB/ResultPopover RED cases now:

| Test | Runtime response | Expected RED assertion |
|---|---|---|
| malformed success | `{status:'success',data:{markdown:{secret,toString,toJSON}}}` | fixed localized malformed error; secret absent from DOM/telemetry/logs; hooks not called |
| missing markdown | `{status:'success',data:{saved_to:'x'}}` | same fixed error; no object serialization |
| valid empty markdown | `{status:'success',data:{markdown:''}}` | normal no-content state; no JSON fallback |
| success plus result warning | valid success plus `analysis_result_not_persisted` | success title/body plus separate durability alert |
| Host error plus cleanup warning | valid error plus `analysis_pending_cleanup_failed` | Host error title/body unchanged plus separate cleanup alert |
| warning order malformed | duplicate/reversed/unknown warning array | fixed malformed response; no raw warning rendered |

Add these to `FAB.spinner.test.tsx` and `ResultPopover.test.tsx`, then include both files in Step 4 RED. They must fail against the existing production code before Steps 5-7 modify bridge/FAB/popover code.

Before Step 4, create a compile-only `ResultPopover.tsx` shell exporting the locked `ResultPopoverProps` and a component that returns `null`. Retain FAB's existing local popover until Step 7. `ResultPopover.test.tsx` must import successfully and fail its rendering assertions; missing-module failure is not acceptable for this file.

- [ ] **Step 4: Run bridge/UI tests to prove RED**

```powershell
& npm run test:run --prefix extension -- src/background/analyzeBridge.test.ts src/background/analyzeRequestHandler.test.ts src/components/FAB.spinner.test.tsx src/components/ResultPopover.test.tsx --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'Analyze bridge RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze bridge RED did not fail with Vitest exit 1' }
```

Expected: all four files import successfully and fail named assertions because parser/bridge/handler shells do not implement exact parsing/acquisition, malformed success is accepted/serialized by FAB, warning UI is absent, and persistence rejection masks the Host result. No import/missing-export failure is acceptable in this behavioral RED.

- [ ] **Step 5: Implement descriptor-safe context and success parsing**

Use Task 1 `ownDataProperty` for every single-property read; do not evaluate optional chaining on untrusted direct-test objects. Include revoked proxies at the top level and at every accepted nested object in the Step 1/2 malicious tables; each returns the fixed malformed result without throwing or invoking conversion/logging. `parseAnalyzePersistContext` reads only the top-level request and `_persist`, then calls Task 4 `parseAnalyzePersistContextValue` on a newly constructed `{caseNumber, requestId, successTitle, errorTitle}` after each source field has been read through `ownDataProperty`; never spread `_persist` or access its members directly. It accepts only a non-empty top-level `requestId`, a non-array `_persist` data object, string `caseNumber`, and non-empty string titles. It ignores `_persist.requestId` even when valid.

Implement the parser with Task 1 `ownDataProperty` plus this local descriptor-map reader. The local helper is permitted because it consumes a map already captured from the top-level source and does not duplicate the source-object classifier:

```ts
function descriptorField(
    descriptors: object,
    key: string,
): OwnDataProperty {
    try {
        const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
        if (!holder) return { kind: 'absent' }
        if (!Object.hasOwn(holder, 'value')) return { kind: 'invalid' }
        const descriptor = holder.value as PropertyDescriptor
        return Object.hasOwn(descriptor, 'value')
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}

function parseAnalyzePersistContextFromDescriptors(
    descriptors: object,
): AnalyzePersistContext | null {
    const requestId = descriptorField(descriptors, 'requestId')
    const persist = descriptorField(descriptors, '_persist')
    if (
        requestId.kind !== 'value'
        || typeof requestId.value !== 'string'
        || requestId.value.length === 0
        || persist.kind !== 'value'
    ) return null
    const caseNumber = ownDataProperty(persist.value, 'caseNumber')
    const successTitle = ownDataProperty(persist.value, 'successTitle')
    const errorTitle = ownDataProperty(persist.value, 'errorTitle')
    return parseAnalyzePersistContextValue({
        caseNumber: caseNumber.kind === 'value'
            ? caseNumber.value
            : undefined,
        requestId: requestId.value,
        successTitle: successTitle.kind === 'value'
            ? successTitle.value
            : undefined,
        errorTitle: errorTitle.kind === 'value'
            ? errorTitle.value
            : undefined,
    })
}

export function parseAnalyzePersistContext(
    value: unknown,
): AnalyzePersistContext | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        return parseAnalyzePersistContextFromDescriptors(
            Object.getOwnPropertyDescriptors(value),
        )
    } catch {
        return null
    }
}
```

`parseAnalyzePersistContext` and the combined request parser share `parseAnalyzePersistContextFromDescriptors`; the combined parser passes its one captured top-level map while the public direct parser captures its own map once. `parseAnalyzeSuccess`, `normalizeAnalyzeHostOutcome`, and `parseAnalyzeForwardResult` use `ownDataProperty` for every accepted nested property. `parseAnalyzeSuccess` accepts only a non-array data object with string `markdown` and absent-or-string `saved_to`, then returns `{ markdown, savedTo }`. `parseAnalyzeForwardResult` returns `AnalyzeForwardResponse`, validating the already-normalized one-layer result plus an optional warning-code array equal to an ordered subset of `ANALYSIS_PERSISTENCE_WARNING_ORDER` with no duplicate. It constructs only the locked output fields and ignores additional own data fields; accessor/descriptor failures still return the fixed malformed error. `normalizeAnalyzeHostOutcome` follows this exact decision tree:

```text
outer status=success + inner status=success + valid data -> parsed success
outer status=success + inner status=success + invalid data -> fixed malformed error
outer status=success + inner status=error -> safe inner Host error/code/metadata
outer status=error -> safe outer Host error/code/metadata
every other shape -> fixed malformed error
```

Only string `error`/`message`, normalized string `error_code`, string `errorKind`, and finite numeric `httpStatus` may survive error normalization. Additional fields are ignored.

- [ ] **Step 6: Parse the exact payload, acquire one transport lease, then sequence persistence**

`isAnalyzePayload` uses `ownDataProperty(payload, 'action')`; only exact primitive string `analyze_error` selects this path. Non-Analyze routing never enters this handler; it passes `guardNonAnalyzeNativeMessage` and forwards only the returned frozen snapshot. The guard independently rejects a captured `analyze_error`, closing a stateful action-flip between routing and snapshot. Production bridge dependencies default to `recordAnalyzeStart` and `completeAnalyzePersistence`; bridge tests inject `recordStart`/`completePersistence` only to force boundary failures.

Current FAB source unconditionally emits `text`, `context`, `timestamp`, and `rootPath`. `text` is assembled as a string; `context` uses the existing `'Unknown Context'` string fallback; `timestamp` is `toLocaleString()`; and normal `usePrefs` merges the established `DEFAULT_PREFS.rootPath === ''`. Therefore all four are required strings. Before Task 7, contain a malformed non-string `effectivePrefs.rootPath` to that existing empty-string default; this preserves shipped behavior rather than inventing a new default. `rootPath` preserves explicit `''`. `product` and `caseNumber` are optional strings. `rootPathOverrideProvided` is absent or exact `true`. No other payload key is supported.

Before routing through this parser, update FAB's outbound payload assembly so optional source values are omitted unless strings; do not emit own `product: undefined` or `caseNumber: undefined`:

```ts
const rootPath = typeof effectivePrefs.rootPath === 'string'
    ? effectivePrefs.rootPath
    : ''
const hostPayload = {
    text: fullContext,
    context: page.source || 'Unknown Context',
    timestamp: new Date().toLocaleString(),
    rootPath,
    ...(typeof page.productCategory === 'string'
        ? { product: page.productCategory }
        : {}),
    ...(typeof page.caseNumber === 'string'
        ? { caseNumber: page.caseNumber }
        : {}),
}
```

Task 7 later replaces this local root selection with its frozen request root and conditionally adds `rootPathOverrideProvided: true`; before Task 7, baseline manual Analyze omits that marker. Tests cover both phases. Never default optional `product`/`caseNumber` fields to empty strings merely to satisfy the parser.

Implement `parseAnalyzeForwardRequest` as the only combined context/action parser. Refactor `parseAnalyzePersistContext` to accept/use the same captured guarded descriptor map internally, so one top-level `Object.getOwnPropertyDescriptors(inner)` snapshot supplies both context and action; do not reread a stateful proxy between them. Add these exact helpers:

```ts
const ANALYZE_PAYLOAD_KEYS = new Set([
    'text', 'context', 'timestamp', 'rootPath',
    'product', 'caseNumber', 'rootPathOverrideProvided',
])

function defineAnalyzeData(
    target: object,
    key: string,
    value: unknown,
): boolean {
    try {
        Object.defineProperty(target, key, {
            value,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        return true
    } catch {
        return false
    }
}

function parseAnalyzeNativePayload(value: unknown): AnalyzeNativePayload | null {
    try {
        if (
            typeof value !== 'object'
            || value === null
            || Array.isArray(value)
            || Object.getPrototypeOf(value) !== Object.prototype
        ) return null
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const keys = Reflect.ownKeys(descriptors)
        for (const key of keys) {
            if (typeof key !== 'string' || !ANALYZE_PAYLOAD_KEYS.has(key)) {
                return null
            }
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (
                !holder
                || !Object.hasOwn(holder, 'value')
            ) return null
            const field = descriptorField(descriptors, key)
            if (field.kind !== 'value') return null
        }
        const text = descriptorField(descriptors, 'text')
        const context = descriptorField(descriptors, 'context')
        const timestamp = descriptorField(descriptors, 'timestamp')
        const rootPath = descriptorField(descriptors, 'rootPath')
        if (
            text.kind !== 'value' || typeof text.value !== 'string'
            || context.kind !== 'value' || typeof context.value !== 'string'
            || timestamp.kind !== 'value' || typeof timestamp.value !== 'string'
            || rootPath.kind !== 'value' || typeof rootPath.value !== 'string'
        ) return null

        const product = descriptorField(descriptors, 'product')
        const caseNumber = descriptorField(descriptors, 'caseNumber')
        const override = descriptorField(
            descriptors,
            'rootPathOverrideProvided',
        )
        if (
            (product.kind !== 'absent'
                && (product.kind !== 'value'
                    || typeof product.value !== 'string'))
            || (caseNumber.kind !== 'absent'
                && (caseNumber.kind !== 'value'
                    || typeof caseNumber.value !== 'string'))
            || (override.kind !== 'absent'
                && (override.kind !== 'value' || override.value !== true))
        ) return null

        const payload: Record<string, unknown> = {}
        if (
            !defineAnalyzeData(payload, 'text', text.value)
            || !defineAnalyzeData(payload, 'context', context.value)
            || !defineAnalyzeData(payload, 'timestamp', timestamp.value)
            || !defineAnalyzeData(payload, 'rootPath', rootPath.value)
        ) return null
        if (
            product.kind === 'value'
            && !defineAnalyzeData(payload, 'product', product.value)
        ) return null
        if (
            caseNumber.kind === 'value'
            && !defineAnalyzeData(payload, 'caseNumber', caseNumber.value)
        ) return null
        if (
            override.kind === 'value'
            && !defineAnalyzeData(payload, 'rootPathOverrideProvided', true)
        ) return null
        Object.defineProperty(payload, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        return Object.freeze(payload as unknown as AnalyzeNativePayload)
    } catch {
        return null
    }
}

export function parseAnalyzeForwardRequest(
    inner: unknown,
):
    | {
          ok: true
          forwarded: AnalyzeNativeAction
          context: AnalyzePersistContext
      }
    | { ok: false; response: AnalyzeForwardResponse } {
    try {
        if (
            typeof inner !== 'object'
            || inner === null
            || Array.isArray(inner)
            || Object.getPrototypeOf(inner) !== Object.prototype
        ) {
            return invalidAnalyzeRequest()
        }
        const descriptors = Object.getOwnPropertyDescriptors(inner)
        const context = parseAnalyzePersistContextFromDescriptors(descriptors)
        if (!context) return invalidAnalyzeRequest()
        const action = descriptorField(descriptors, 'action')
        const requestId = descriptorField(descriptors, 'requestId')
        const payloadField = descriptorField(descriptors, 'payload')
        if (
            action.kind !== 'value' || action.value !== 'analyze_error'
            || requestId.kind !== 'value'
            || typeof requestId.value !== 'string'
            || requestId.value.length === 0
            || payloadField.kind !== 'value'
        ) return invalidAnalyzeRequest()
        const payload = parseAnalyzeNativePayload(payloadField.value)
        if (!payload) return invalidAnalyzeRequest()
        const forwarded: Record<string, unknown> = {}
        if (
            !defineAnalyzeData(forwarded, 'action', 'analyze_error')
            || !defineAnalyzeData(forwarded, 'requestId', requestId.value)
            || !defineAnalyzeData(forwarded, 'payload', payload)
        ) return invalidAnalyzeRequest()
        return {
            ok: true,
            forwarded: Object.freeze(forwarded as AnalyzeNativeAction),
            context: Object.freeze(context),
        }
    } catch {
        return invalidAnalyzeRequest()
    }
}

function invalidAnalyzeResponse(): AnalyzeForwardResponse {
    return {
        status: 'error',
        error_code: 'invalid_analyze_persistence_context',
        error: 'Analyze persistence context is invalid.',
    }
}

function invalidAnalyzeRequest(): {
    ok: false
    response: AnalyzeForwardResponse
} {
    return { ok: false, response: invalidAnalyzeResponse() }
}
```

Both invalid helpers construct fresh objects; never share a mutable singleton. `handleAnalyzeForward` uses `invalidAnalyzeResponse()` if direct context revalidation fails. Successful `forwarded` and payload objects have exactly `Object.prototype` and only the locked own enumerable data keys; the parser-created payload additionally owns only the non-enumerable inert `toJSON` safety shadow. Top-level attacker keys are never enumerated/copied; payload keys are exhaustively enumerated and any caller-supplied unknown string/symbol/accessor, including `toJSON`, is invalid. Do not delete fields from the caller, spread/copy either source, assign untrusted keys, or coerce values.

Create `analyzeRequestHandler.ts` with only type/function imports from `analyzeBridge.ts`. The complete exported surface and implementation are exact:

```ts
import {
    handleAnalyzeForward,
    parseAnalyzeForwardRequest,
    type AnalyzeForwardResponse,
    type AnalyzeNativeAction,
} from './analyzeBridge'

export interface AuthorizedAnalyzeTransport {
    send(forwarded: AnalyzeNativeAction): Promise<unknown>
}

export interface AnalyzeRequestHandlerDeps {
    acquireAuthorizedTransport(
        forwarded: Readonly<AnalyzeNativeAction>,
    ): Promise<
        | { allowed: false; response: AnalyzeForwardResponse }
        | { allowed: true; transport: AuthorizedAnalyzeTransport }
    >
}

export async function handleAnalyzeRequest(
    inner: unknown,
    deps: AnalyzeRequestHandlerDeps,
): Promise<AnalyzeForwardResponse> {
    const parsed = parseAnalyzeForwardRequest(inner)
    if (!parsed.ok) return parsed.response

    const acquisition = await deps.acquireAuthorizedTransport(parsed.forwarded)
    if (!acquisition.allowed) return acquisition.response

    return handleAnalyzeForward(
        parsed.forwarded,
        parsed.context,
        { send: action => acquisition.transport.send(action) },
    )
}
```

No catch converts an acquisition rejection: the provider owns typed denial and must resolve one of the locked decisions for expected gate failures. A thrown/rejected acquisition is an unexpected boundary failure handled by the Service Worker fixed catch; it still occurs before storage/send. Call `acquireAuthorizedTransport` exactly once and only after parsing. Do not reparse, reacquire, or substitute a different transport after acquisition. `handleAnalyzeForward` calls only the captured `acquisition.transport.send`; a lease disconnect rejects that send and is normalized/persisted as this request's Host outcome.

Implement the non-Analyze guard exactly as locked in Public Interfaces: one descriptor snapshot; fresh `Object.prototype` output; no spread, bracket assignment, coercion, or caller hook; fixed denial for reserved keys, `toJSON`, symbols, accessors, malformed action/request ID, arrays/scalars, proxies, and captured `analyze_error`; nested values retained by identity; inert non-enumerable `toJSON`; frozen output. It never returns the source by identity. Use a local descriptor-map reader, not another source-object classifier. The core is:

```ts
function nonAnalyzeDenied(): NonAnalyzeNativeMessageDecision {
    return {
        ok: false,
        response: {
            status: 'error',
            error: 'Invalid Extension Native message metadata.',
            error_code: 'invalid_native_message_metadata',
        },
    }
}

export function guardNonAnalyzeNativeMessage(
    inner: unknown,
): NonAnalyzeNativeMessageDecision {
    try {
        if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
            return nonAnalyzeDenied()
        }
        const descriptors = Object.getOwnPropertyDescriptors(inner)
        const keys = Reflect.ownKeys(descriptors)
        const output: Record<string, unknown> = {}
        let requestIdPresent = false
        for (const key of keys) {
            if (typeof key !== 'string') return nonAnalyzeDenied()
            if (key === '_persist' || key === 'extension_warnings' || key === 'toJSON') {
                return nonAnalyzeDenied()
            }
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (!holder || !Object.hasOwn(holder, 'value')) return nonAnalyzeDenied()
            const descriptor = holder.value as PropertyDescriptor
            if (key === 'requestId') {
                requestIdPresent = true
                if (
                    !descriptor.enumerable
                    || !Object.hasOwn(descriptor, 'value')
                    || typeof descriptor.value !== 'string'
                    || descriptor.value.length === 0
                ) return nonAnalyzeDenied()
            }
            if (!descriptor.enumerable) continue
            if (!Object.hasOwn(descriptor, 'value')) return nonAnalyzeDenied()
            Object.defineProperty(output, key, {
                value: descriptor.value,
                enumerable: true,
                writable: true,
                configurable: true,
            })
        }
        const action = Object.getOwnPropertyDescriptor(output, 'action')
        if (
            !action
            || typeof action.value !== 'string'
            || action.value === 'analyze_error'
        ) return nonAnalyzeDenied()
        if (requestIdPresent && !Object.hasOwn(output, 'requestId')) {
            return nonAnalyzeDenied()
        }
        Object.defineProperty(output, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        return { ok: true, forwarded: Object.freeze(output) }
    } catch {
        return nonAnalyzeDenied()
    }
}
```

Implement `postNativeMessageWire` after its RED. It validates one captured descriptor map, allows no non-enumerable input except the inert own `toJSON: undefined`, copies enumerable string data with `Object.defineProperty`, preserves or creates one request ID, installs its own inert shadow, freezes, registers, and posts:

```ts
export function postNativeMessageWire(
    forwarded: Readonly<Record<string, unknown>>,
    deps: NativeMessageWireDeps,
): string {
    let wire: Record<string, unknown>
    let requestId: string | undefined
    try {
        const descriptors = Object.getOwnPropertyDescriptors(forwarded)
        wire = {}
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== 'string') throw new Error('Invalid Native message')
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (!holder || !Object.hasOwn(holder, 'value')) {
                throw new Error('Invalid Native message')
            }
            const descriptor = holder.value as PropertyDescriptor
            if (key === 'toJSON') {
                if (
                    descriptor.enumerable
                    || !Object.hasOwn(descriptor, 'value')
                    || descriptor.value !== undefined
                ) throw new Error('Invalid Native message')
                continue
            }
            if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
                throw new Error('Invalid Native message')
            }
            if (key === 'requestId') {
                if (
                    typeof descriptor.value !== 'string'
                    || descriptor.value.length === 0
                ) throw new Error('Invalid Native message request ID')
                requestId = descriptor.value
                continue
            }
            Object.defineProperty(wire, key, {
                value: descriptor.value,
                enumerable: true,
                writable: true,
                configurable: true,
            })
        }
        if (requestId === undefined) requestId = deps.createRequestId()
        if (typeof requestId !== 'string' || requestId.length === 0) {
            throw new Error('Invalid Native message request ID')
        }
        Object.defineProperty(wire, 'requestId', {
            value: requestId,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        Object.defineProperty(wire, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        Object.freeze(wire)
    } catch (error) {
        if (
            error instanceof Error
            && error.message === 'Invalid Native message request ID'
        ) throw error
        throw new Error('Invalid Native message')
    }
    deps.register(requestId)
    try {
        deps.postMessage(wire)
    } catch (error) {
        try { deps.unregister(requestId) } catch { /* preserve post failure */ }
        throw error
    }
    return requestId
}
```

Tests do not depend on the generic fixed `Invalid Native message` text; it is only defense for an impossible typed direct caller. They do require the exact generated/request-field ID error. No raw input or post error is logged/coerced.

`handleAnalyzeForward(forwarded, context, deps)` begins with this exact revalidation and uses only `safeContext` afterward:

```ts
const parsedContext = parseAnalyzePersistContextValue(context)
if (!parsedContext) return invalidAnalyzeResponse()
const safeContext = Object.freeze(parsedContext)
```

It then:

1. Select `const persistenceNow = deps.persistence ? deps.persistence.now : undefined`, then await the injected/default `recordStart(safeContext, persistenceNow)`. Return the fixed start-failed error and do not call Host if it rejects.
2. Await `deps.send(forwarded)` exactly once. A rejection is normalized to `{status:'error', error:safeErrorText([descriptorSafeErrorMessage], 'Native Host error')}` without throwing the raw rejection onward. Read a rejection's `message` only through an own data descriptor.
3. Normalize the Host outcome before persistence. Convert success to `{status:'success', markdown, ...(saved_to !== undefined ? {savedTo:saved_to} : {})}` and errors to `{status:'error', error, ...(error_code ? {errorCode:error_code} : {})}`; pass that Task 4 `AnalyzeCompletion` to persistence.
4. Await the injected/default `completePersistence(safeContext, completion, deps.persistence)` in a failure-contained call. Expected local failures return warning codes; an unexpected throw attaches both allowlisted warnings in fixed order and logs fixed stage text only.
5. Return the normalized outcome with `extension_warnings` only when non-empty.

For invalid-context and start-failed pre-send outcomes, do not call completion persistence and do not attach `extension_warnings`: no Host outcome or established pending contract exists to warn about. The malicious caller-warning assertion was written in Step 1; make it pass through `parseAnalyzeForwardRequest` here and do not add a post-implementation test.

Name the mutation targets exactly `Host success survives result write failure`, `never double wraps or copies attacker outer fields`, `rejects nested wrappers and unknown Analyze payload keys`, `returns a denied transport acquisition before persistence or send`, `returns invalid Analyze metadata before transport acquisition, storage, or send`, and `fails a disconnected lease without reacquiring or reconnecting` when adding the Step 1-3 tests.

In current-baseline `serviceWorker.ts`, delete the ad hoc `_persist`/`persistMeta.requestId` construction and replace the sender's truthy request-ID read/object spread with `postNativeMessageWire`. Capture the current port and let the helper own registration plus the sole post; the outer catch never deletes the pending entry a second time:

```ts
function sendNativeMessage(
    forwarded: Readonly<Record<string, unknown>>,
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (!nativePort) connectToNativeHost()
        const port = nativePort
        if (!port) {
            reject(new Error('Could not establish connection to Native Host'))
            return
        }
        let postAttempted = false
        try {
            postNativeMessageWire(forwarded, {
                createRequestId: () => crypto.randomUUID(),
                register: requestId => {
                    pendingRequests.set(requestId, { resolve, reject })
                },
                unregister: requestId => {
                    pendingRequests.delete(requestId)
                },
                postMessage: message => {
                    postAttempted = true
                    port.postMessage(message)
                },
            })
        } catch (error) {
            if (postAttempted) nativePort = null
            reject(error)
        }
    })
}
```

Descriptor-safely classify the own inner `action`: exact `analyze_error` delegates to the pure helper with default allow-all; every non-Analyze `NATIVE_MSG` passes the shallow guard and sends only its snapshot. The branch is exactly:

```ts
const inner = message.payload ?? {}
let request: Promise<AnalyzeForwardResponse | unknown>
if (isAnalyzePayload(inner)) {
    request = handleAnalyzeRequest(inner, {
        acquireAuthorizedTransport: async () => ({
            allowed: true,
            transport: { send: sendNativeMessage },
        }),
    })
} else {
    const guarded = guardNonAnalyzeNativeMessage(inner)
    request = guarded.ok
        ? sendNativeMessage(guarded.forwarded)
        : Promise.resolve(guarded.response)
}
request
    .then(sendResponse)
    .catch(() => sendResponse({
        status: 'error',
        error: 'Native Host error',
    }))
return true
```

Import `handleAnalyzeRequest`, `guardNonAnalyzeNativeMessage`, Task 5's descriptor-safe `isAnalyzePayload`, and `postNativeMessageWire`; do not import Task 7 code forward. The baseline provider above performs no gate and returns one transport object wrapping current `sendNativeMessage`. Plan D must replace that provider with its atomic port-specific gate/transport lease without changing the parser, guard, bridge, or envelope. For non-Analyze actions Plan D calls `guardNonAnalyzeNativeMessage` before acquiring a lease; a denied message opens no port. Every actual post uses the final-wire helper.

Run the pure routing/bridge GREEN before UI changes:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts src/background/analyzeBridge.test.ts src/background/nativeMessageWire.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Analyze request-handler GREEN failed' }
```

Expected: all three files pass; handler tests observe parse/acquire/start/leased-send order, exact denial behavior, one exact inner Host action, no reacquisition after lease failure, a frozen non-Analyze snapshot, and fixed pre-send rejection of reserved metadata. Wire tests prove safe ID augmentation, register-before-post, recursive Analyze payload protection, and one cleanup on post failure.

- [ ] **Step 7: Update FAB to consume only the normalized Extension result**

Treat the Service Worker result as `unknown`, run it through an exported `parseAnalyzeForwardResult(value: unknown): AnalyzeForwardResponse` that descriptor-safely accepts only the normalized success/error fields and otherwise returns the fixed `malformed_native_response` error, then branch on that parsed value. This is defense in depth against directly mocked/compromised runtime responses. On success, render only parsed `data.markdown` and optional `saved_to`; delete `JSON.stringify(analysisData, null, 2)` fallback. On error, pass only parsed safe `error` and `error_code` through `localizeAnalyzeError`.

In `promptSourceErrors.ts`, keep `localizePromptSourceError` unchanged for existing callers and add `localizeAnalyzeError`. It checks these exact boundary-code keys first, then delegates to the existing prompt-source mapping, then uses the already-safe fallback:

```ts
const ANALYZE_ERROR_TRANSLATION_KEYS: Record<string, string> = {
    malformed_native_response: 'analysisMalformedResponse',
    invalid_analyze_persistence_context: 'analysisPersistenceContextInvalid',
    analysis_persistence_start_failed: 'analysisPersistenceStartFailed',
}
```

Extract the current presentational `ResultPopover` from `FAB.tsx` to `ResultPopover.tsx` as a named export (retain FAB's named re-export during the same commit for existing imports) without changing its visual styles; preserve existing props and add the locked `isAnalyze`/`durabilityWarning` props. Call `localizeAnalyzeError` when `isAnalyze` is true. FAB passes `isAnalyze={popoverIsAnalyze.current}` on every render; immediate/hydrated Analyze paths set that ref before opening, while bookmark note/ping paths explicitly set it false before opening. Unknown Host codes continue to display only their normalized safe fallback. `ResultPopover.test.tsx` renders each boundary code in English and Chinese, an unknown-code safe fallback, a durability warning separate from the Host body, `duration="0.0s"`, and a bookmark note. Update `FAB.promptSourceErrors.test.tsx` to import `ResultPopover` from the new file while retaining its full-FAB hydration test.

Add `durabilityWarning?: string` to local result-popover state and `ResultPopover`. Render it in a separate amber `role="alert"` block below the Host outcome. Map warnings without displaying raw values:

```ts
function localizeAnalysisWarnings(
    warnings: readonly AnalysisPersistenceWarning[] | undefined,
): string | undefined {
    if (!warnings?.length) return undefined
    return warnings.includes('analysis_pending_cleanup_failed')
        ? t('analysisDurabilityAndCleanupWarning')
        : t('analysisDurabilityWarning')
}
```

Call this helper only with `parseAnalyzeForwardResult`'s validated warning array. Do not accept a cast/raw warning value at the UI boundary.

The prewritten `analyzeRequestHandler.test.ts` cases are the baseline Service Worker Analyze handoff proof. They exercise the same function called by `serviceWorker.ts` with a pure transport-provider/lease spy, without importing the side-effectful worker.

Add these exact translations:

| Key | English | Chinese |
|---|---|---|
| `analysisMalformedResponse` | `The Native Host returned a malformed Analyze response.` | `本机宿主返回了格式错误的分析响应。` |
| `analysisPersistenceContextInvalid` | `Analyze could not start because its persistence context was invalid.` | `由于分析持久化上下文无效，无法开始分析。` |
| `analysisPersistenceStartFailed` | `Analyze could not start because local recovery state could not be saved.` | `由于无法保存本地恢复状态，无法开始分析。` |
| `analysisDurabilityWarning` | `Analysis completed, but the result could not be saved for navigation recovery.` | `分析已完成，但结果无法保存以供页面导航后恢复。` |
| `analysisDurabilityAndCleanupWarning` | `Analysis completed, but result recovery and analyzing-state cleanup may be unavailable until retry or expiry.` | `分析已完成，但在重试或状态过期前，结果恢复和分析状态清理可能不可用。` |

Host success remains a success popover/bubble and Host error remains an error popover; neither changes title/status because of durability warnings. Do not send warning codes to Host or bind them to Host `error_code` localization.

- [ ] **Step 8: Complete and run the prewritten FAB malformed/warning regressions**

Update existing success fixtures to the normalized one-layer Extension result and finish only fixture/import adjustments needed by the RED tests written in Step 3. Preserve the existing stale A/B, timeout, hash, and prompt-error tests; do not add new behavioral cases after production code.

Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeBridge.test.ts src/background/analyzeRequestHandler.test.ts src/background/nativeMessageWire.test.ts src/utils/promptSourceErrors.test.ts src/components/ResultPopover.test.tsx src/components/FAB.spinner.test.tsx src/components/FAB.promptSourceErrors.test.tsx --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Analyze bridge GREEN failed' }
```

Then run independently:

```powershell
Push-Location -LiteralPath 'extension'
try { & npm exec tsc -- --noEmit -p tsconfig.json; if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' } } finally { Pop-Location }
```

Expected: all seven test files pass and TypeScript exits 0. The handler tests prove parse/acquire/start/leased-send order, exact payload/action construction, and no reacquisition after disconnect; wire tests prove the final posted object preserves the parser payload identity and serialization shadows; no test observes raw malformed data or a persistence warning in Host-bound payloads.

- [ ] **Step 9: Prove the non-masking contract is active**

Temporarily rethrow the result-persistence failure before returning from `handleAnalyzeForward`. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeBridge.test.ts -t 'Host success survives result write failure' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Non-masking mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Non-masking mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the promise rejects instead of returning Host success plus `analysis_result_not_persisted`. Restore containment and rerun Task 5 GREEN; expected PASS.

Temporarily copy the caller's top-level descriptors into the forwarded action. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'never double wraps or copies attacker outer fields' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Exact Analyze envelope mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Exact Analyze envelope mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the provider/lease observes `type`, `extension_warnings`, `__proto__`, arbitrary data, or a symbol beyond the three locked keys. Restore exact construction and rerun Task 5 GREEN; expected PASS.

Temporarily return the source object from `guardNonAnalyzeNativeMessage`. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'captures a frozen non-Analyze snapshot before source mutation' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Non-Analyze snapshot mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Non-Analyze snapshot mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because post-guard source mutation adds reserved metadata or the forwarded value shares source identity. Restore fresh frozen snapshot construction and rerun Task 5 GREEN; expected PASS.

Temporarily rebuild the final wire object with object spread so the non-enumerable `toJSON` shadow is lost. Run:

```powershell
& npm run test:run --prefix extension -- src/background/nativeMessageWire.test.ts -t 'shadows inherited toJSON on the final wire object' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Native wire serialization mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Native wire serialization mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the inherited hook runs or replaces serialized data. Restore descriptor construction/inert shadow and rerun Task 5 GREEN; expected PASS.

Temporarily ignore unknown payload keys instead of rejecting them. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'rejects nested wrappers and unknown Analyze payload keys' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Strict Analyze payload mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Strict Analyze payload mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because a nested wrapper, unknown key, `type`, `extension_warnings`, `__proto__`, or symbol reaches acquisition. Restore exact payload-key rejection and rerun Task 5 GREEN; expected PASS.

Temporarily acquire transport after `handleAnalyzeForward`. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'returns a denied transport acquisition before persistence or send' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analyze transport-acquisition order mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze transport-acquisition mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the denial path writes pending state and/or invokes send. Restore parse -> acquire -> start -> leased-send and rerun Task 5 GREEN; expected PASS.

Temporarily call `deps.acquireAuthorizedTransport` before `parseAnalyzeForwardRequest`. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'returns invalid Analyze metadata before transport acquisition, storage, or send' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analyze parse-before-acquisition mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze parse-before-acquisition mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because malformed metadata reaches acquisition and could open a port. Restore parse-first behavior and rerun Task 5 GREEN; expected PASS.

Temporarily catch a leased-send disconnect and call `acquireAuthorizedTransport` again. Run:

```powershell
& npm run test:run --prefix extension -- src/background/analyzeRequestHandler.test.ts -t 'fails a disconnected lease without reacquiring or reconnecting' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analyze transport lease mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze transport lease mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the provider runs twice or transport B sends under transport A's prior authorization. Restore one acquisition/no reconnect and rerun Task 5 GREEN; expected PASS.

- [ ] **Step 10: Commit strict Analyze wire handling**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/background/analyzeBridge.ts',
    'extension/src/background/analyzeBridge.test.ts',
    'extension/src/background/analyzeRequestHandler.ts',
    'extension/src/background/analyzeRequestHandler.test.ts',
    'extension/src/background/nativeMessageWire.ts',
    'extension/src/background/nativeMessageWire.test.ts',
    'extension/src/background/serviceWorker.ts',
    'extension/src/components/ResultPopover.tsx',
    'extension/src/components/ResultPopover.test.tsx',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/components/FAB.promptSourceErrors.test.tsx',
    'extension/src/utils/promptSourceErrors.ts',
    'extension/src/utils/promptSourceErrors.test.ts',
    'extension/src/utils/translations.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 5 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 5 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 5 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 5 staged diff check failed' }
& git commit -m "fix(analysis): validate wire results and preserve outcomes"
if ($LASTEXITCODE -ne 0) { throw 'Task 5 commit failed' }
```

Expected: one commit containing the pure Analyze request handler, bridge/parser/persistence-warning behavior, thin Service Worker wiring, and focused UI tests; unrelated worktree files remain untouched.

## Task 6: FAB Page Identity and Busy SPA Scanning

**Files:**
- Create: `extension/src/utils/pageIdentity.ts`
- Create: `extension/src/utils/pageIdentity.test.ts`
- Create: `extension/src/components/FAB.pageIdentity.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/hooks/useAnalysisHydration.ts`
- Modify: `extension/src/hooks/useAnalysisHydration.test.ts`

**Interfaces:**
- Consumes: `ScrapedData` only as untrusted identity input and exact case number for durable hydration.
- Produces: `PageIdentity`, `parsePageIdentity`, and identity-only/full scan separation; Task 7 consumes `PageIdentity` in `snapshotAnalyzeRequest`.

- [ ] **Step 1: Add failing pure PageIdentity tests**

Create this exact table in `pageIdentity.test.ts`:

| Input | Expected |
|---|---|
| `{caseNumber:'A', ticketTitle:'Title'}` | `'case:A'` |
| `{caseNumber:'', ticketTitle:'Title'}` | `'title:Title'` |
| `{ticketTitle:'Title'}` | `'title:Title'` |
| `{caseNumber:'A', ticketTitle:'Changed'}` after prior title | still `'case:A'` |
| empty strings and absent fields | `null` |
| whitespace-only case/title string | exact `'case:   '`/`'title:   '` token; no trimming |
| present number/object/array/symbol/function identity field | `null`; no coercion |
| top-level getter for `caseNumber`/`ticketTitle` | `null`; getter spy has zero calls; raw object not logged |
| top-level proxy descriptor trap that throws | `null`; exception contained; no coercion, secret, or raw object is logged; descriptor access remains bounded and does not repeat after classification |
| revoked proxy at identity or scrape boundary | `parsePageIdentity`, `parsePageIdentitySnapshot`, and `parseScrapedDataSnapshot` return `null` | no exception, conversion, or raw log escapes |
| plain scrape snapshot | inherited fields plus own string fields | returns a new `Object.prototype` object with only own string data; inherited fields absent |
| malformed scrape snapshot | getter or present non-string supported field | returns `null`; getter is not invoked |

The parser does not trim or canonicalize accepted values; non-empty means `length > 0`, and the original exact string is embedded. Case always wins over title.

- [ ] **Step 2: Run the pure test to prove RED**

```powershell
if (Test-Path -LiteralPath 'extension/src/utils/pageIdentity.ts') {
    throw 'Page identity module unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/utils/pageIdentity.test.ts --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'Page identity RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Page identity RED did not fail with Vitest exit 1' }
```

Expected: this isolated first RED fails only because `pageIdentity.ts` does not exist. Create a compile-only module exporting `PageIdentity`, `PageIdentitySnapshot`, and the three locked functions; each function returns `null`. Rerun the same command and require named precedence/malformed/no-coercion assertions to fail before Step 3 implementation.

- [ ] **Step 3: Implement the opaque case-first identity parser**

Implement with descriptor-safe own reads and no coercion:

```ts
export type PageIdentity = `case:${string}` | `title:${string}`

export interface PageIdentitySnapshot {
    identity: PageIdentity | null
    caseNumber: string
}

function readIdentityString(
    descriptors: PropertyDescriptorMap,
    key: 'caseNumber' | 'ticketTitle',
): { kind: 'absent' | 'invalid' } | { kind: 'value'; value: string } {
    try {
        const descriptor = descriptors[key]
        if (!descriptor) return { kind: 'absent' }
        if (!Object.hasOwn(descriptor, 'value')) return { kind: 'invalid' }
        return typeof descriptor.value === 'string'
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}

export function parsePageIdentitySnapshot(
    value: unknown,
): PageIdentitySnapshot | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const caseNumber = readIdentityString(descriptors, 'caseNumber')
        const ticketTitle = readIdentityString(descriptors, 'ticketTitle')
        if (caseNumber.kind === 'invalid' || ticketTitle.kind === 'invalid') return null
        const exactCase = caseNumber.kind === 'value' ? caseNumber.value : ''
        const exactTitle = ticketTitle.kind === 'value' ? ticketTitle.value : ''
        return {
            identity: exactCase.length > 0
                ? `case:${exactCase}`
                : exactTitle.length > 0
                    ? `title:${exactTitle}`
                    : null,
            caseNumber: exactCase,
        }
    } catch {
        return null
    }
}

export function parsePageIdentity(value: unknown): PageIdentity | null {
    const snapshot = parsePageIdentitySnapshot(value)
    return snapshot ? snapshot.identity : null
}

const SCRAPED_STRING_FIELDS = [
    'errorText', 'ticketTitle', 'productCategory', 'caseNumber', 'severity',
    'statusReason', 'description', 'context', 'timestamp', 'source',
] as const

export function parseScrapedDataSnapshot(value: unknown): ScrapedData | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const result: ScrapedData = {}
        for (const key of SCRAPED_STRING_FIELDS) {
            const descriptor = descriptors[key]
            if (!descriptor) continue
            if (!Object.hasOwn(descriptor, 'value')) return null
            if (descriptor.value === undefined) continue
            if (typeof descriptor.value !== 'string') return null
            result[key] = descriptor.value
        }
        return result
    } catch {
        return null
    }
}
```

Do not use URL, title plus case, normalization, or storage keys as identity. Place `// Title fallback guards live display only; durable storage remains case-number keyed.` above `parsePageIdentitySnapshot`. Accessors return null without invocation; a throwing descriptor proxy returns null. The scanner consumes only `PageIdentitySnapshot`, never the raw scraped object.

- [ ] **Step 4: Add failing busy SPA component tests**

In `FAB.pageIdentity.test.tsx`, use a controllable `scanForErrors` mock and a captured MutationObserver callback. Test this sequence:

```text
initial full scan -> case A/title A/body A
start Analyze A and hold response
DOM mutation -> identity-only scan returns case B/title B/body B
resolve Analyze A success
post-run full scan returns case B/title B/body B
```

Assert while A is pending:

- hydration rerenders with exact case B immediately;
- the editable textarea still contains A/body or the user's manual edit;
- `isUserEdited` is not reset by the identity-only scan;
- A's local spinner/disabled state is not attached to B, while the underlying A request and safety timeout remain active;
- A result popover, success bubble, error bubble, and duration do not appear on B;
- no visible text contains old case A after the switch;
- success/failure visible-page telemetry is absent for A, while request-completion telemetry may retain A's hash;
- after completion, `scanForErrors` is called for a full scan without waiting for another mutation and the textarea catches up to B/body;
- timeout followed by late promise settlement produces exactly one post-run full scan for that request.

Add title-fallback variants with no case numbers: title A to title B suppresses A UI; title edits within a page that has case A do not change identity. Include Host-error completion and safety-timeout variants to prove all visible outcome paths use the same request/page guard.
Add a malformed/throwing scan identity case: `parsePageIdentitySnapshot` returns null, scanner state is unchanged, visible completion remains governed by the last accepted identity, and the observer never crashes or invokes getters. Add a valid empty-object case separately; it yields `{identity:null,caseNumber:''}` and suppresses ownership-based completion.
Add a first-scan/manual-Analyze race test: after the initial scan resolves A, clicking Analyze immediately snapshots `case:A` and hydrates A without waiting for another React effect tick.
Add exact user-edit sequence titled `replaces a user-edited A textarea with B after busy Analyze completes`: user edits A textarea, starts Analyze, busy identity-only scan observes B without replacing text, completion triggers post-run B full scan, and B text forcibly replaces edited A.
Name the primary busy-switch case exactly `switches identity from A to B while Analyze is busy` and the accessor containment case exactly `contains throwing identity accessors` for Step 9.

Before any production edit, extend `useAnalysisHydration.test.ts` with exact test `clears A hydration while deferred B hydration is pending`: hold A's storage read, rerender to B, resolve B later, and assert no A popover/pending/analyzing value is exposed while B is pending or after A resolves late.

- [ ] **Step 5: Run FAB identity tests to prove RED**

```powershell
& npm run test:run --prefix extension -- src/components/FAB.pageIdentity.test.tsx -t 'replaces a user-edited A textarea with B after busy Analyze completes' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Busy-switch textarea RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Busy-switch textarea RED did not fail with Vitest exit 1' }
```

Expected: the exact test FAILS because current MutationObserver returns early while busy or post-run full scan retains user-edited A after identity ref already became B. Then run the whole file to retain all other RED observations:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.pageIdentity.test.tsx --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'FAB identity RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'FAB identity RED did not fail with Vitest exit 1' }
```

Run the deferred hydration RED independently:

```powershell
& npm run test:run --prefix extension -- src/hooks/useAnalysisHydration.test.ts -t 'clears A hydration while deferred B hydration is pending' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Deferred hydration RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Deferred hydration RED did not fail with Vitest exit 1' }
```

Expected: the named test collects and FAILS because A state remains exposed during the B read. Missing export/setup or zero matches is invalid evidence.

- [ ] **Step 6: Separate current identity from editable scraped context**

In FAB, add refs/state with these responsibilities. Define `applyIdentityScan` and `applyFullScan` as component-local functions that read only refs/state setters; mirror any mutable render value they need into a ref. This lets the MutationObserver and `handleAnalyze` finalizer call the same current logic without stale render data or duplicating scans:

```ts
const currentPageIdentityRef = useRef<PageIdentity | null>(null)
const currentCaseNumberRef = useRef('')
const [hydrationCaseNumber, setHydrationCaseNumber] = useState('')
const localAnalyzePageRef = useRef<{
    requestId: string
    pageIdentity: PageIdentity | null
    caseNumber: string
} | null>(null)
const postRunScanOwnerRef = useRef<string | null>(null)
const analyzeOriginRef = useRef<{
    requestId: string
    pageIdentity: PageIdentity | null
} | null>(null)
const identityChangedDuringAnalyzeRef = useRef(false)
```

Replace `useAnalysisHydration(scrapedData?.caseNumber || '')` with `useAnalysisHydration(hydrationCaseNumber)`. Keep active-work and visible-page busy state separate: `localAnalyzeRequestIdRef`/`isAnalyzingRef` continue to mean a request is executing, while React `isAnalyzing` is true only when `localAnalyzePageRef.current.pageIdentity` matches the current non-null identity or the parsed hydrated pending belongs to `hydrationCaseNumber`. Define `reconcileVisibleAnalyzingState()` to calculate that boolean, call `setIsAnalyzing(visible)`, and leave `isAnalyzingRef.current = Boolean(localAnalyzeRequestIdRef.current)` as the active-work guard. This allows B to avoid A's spinner without cancelling A. The MutationObserver reads the active request ref, not visible `isAnalyzing`, so it remains identity-only until the executing request ends. Add two application functions:

```ts
function applyIdentityScan(fresh: unknown): void {
    const parsed = parsePageIdentitySnapshot(fresh)
    if (!parsed) return
    const { identity, caseNumber } = parsed
    const identityChanged = identity !== currentPageIdentityRef.current
    const caseChanged = caseNumber !== currentCaseNumberRef.current
    if (identityChanged || caseChanged) {
        if (
            localAnalyzeRequestIdRef.current
            && analyzeOriginRef.current?.requestId
                === localAnalyzeRequestIdRef.current
            && identity !== analyzeOriginRef.current.pageIdentity
        ) {
            identityChangedDuringAnalyzeRef.current = true
        }
        currentPageIdentityRef.current = identity
        currentCaseNumberRef.current = caseNumber
        setHydrationCaseNumber(caseNumber)
        if (identityChanged) {
            setResultPopover(previous => ({ ...previous, isOpen: false }))
            setStatusBubble(previous => ({ ...previous, visible: false }))
            setIsOpen(false)
        }
        reconcileVisibleAnalyzingState()
    }
}

function applyFullScan(
    fresh: unknown,
    completedOrigin: PageIdentity | null = null,
    isPostRunScan = false,
): void {
    const previousIdentity = currentPageIdentityRef.current
    const plain = parseScrapedDataSnapshot(fresh)
    if (!plain) return
    const parsed = parsePageIdentitySnapshot(plain)
    if (!parsed) return
    const nextIdentity = parsed.identity
    applyIdentityScan(plain)
    const replaceAfterAnalyze = isPostRunScan && (
        identityChangedDuringAnalyzeRef.current
        || nextIdentity !== completedOrigin
    )
    if (replaceAfterAnalyze) {
        isUserEdited.current = false
        setHasAutoAnalyzed(false)
        identityChangedDuringAnalyzeRef.current = false
        analyzeOriginRef.current = null
    }
    setScrapedData(previous => {
        if (replaceAfterAnalyze || nextIdentity !== previousIdentity) {
            isUserEdited.current = false
            setHasAutoAnalyzed(false)
            return plain
        }
        if (isUserEdited.current) return previous
        return plain
    })
}
```

Before storing `fresh`, create a plain `ScrapedData` display snapshot from own data descriptors for the existing string fields (`errorText`, `ticketTitle`, `productCategory`, `caseNumber`, `severity`, `statusReason`, `description`, `context`, `timestamp`, `source`). Ignore absent fields; reject present non-string/accessor/proxy fields. `applyFullScan` stores only this plain snapshot. Thus identity-only and full scans never directly read `fresh.caseNumber`, spread `fresh`, or retain getter-bearing objects.

Initialize `currentPageIdentityRef`, `currentCaseNumberRef`, and `hydrationCaseNumber` together from the accepted initial full scan. Do not wait for the separate `scrapedData` effect to establish identity; the first Analyze must snapshot the same token that hydration/observer guards already use.

At the start of `handleAnalyze`, snapshot `pageIdentityOfRun`, set `analyzeOriginRef.current = {requestId, pageIdentity: pageIdentityOfRun}`, and clear `identityChangedDuringAnalyzeRef.current = false`. The exact stale-result guard is PageIdentity equality, not a permissive empty-case comparison:

```ts
const requestStillOwnsVisiblePage =
    pageIdentityOfRun !== null
    && pageIdentityOfRun === currentPageIdentityRef.current
```

Task 7 replaces this local identity/case/ID tuple with one `AnalyzeRequestSnapshot` without changing the guard. Identity change updates stale-request display guards and closes the menu so stale editable context is not presented on the new page, but it must not clear `latestRequestId`, `localAnalyzeRequestIdRef`, the safety timer, or the request itself: the originating Analyze remains in flight and persists for its original case. When request identity is `null`, persist it under the exact case string as already required, but do not attach completion UI to an unidentified page because no non-null token can prove page ownership. Do not show an old-case-naming fallback bubble on the new page; suppress it entirely.

Guard the hydration-to-local-popover effect before any `setResultPopover`:

```ts
if (hydration.popover?.identity.caseNumber !== currentCaseNumberRef.current) return
```

This prevents the previous case's hook result from reopening during the render where `hydrationCaseNumber` has changed but the new async storage read has not completed. Because the hydrated identity intentionally contains only exact case number/request-or-timestamp, it does not participate in title-fallback identity; title-only navigation suppression remains FAB-live state as required.

In `useAnalysisHydration`, clear `popover`, `isAnalyzing`, and `pending` synchronously at the start of the case-number effect before awaiting `getAnalysisSnapshot`; retain the existing generation/cancel check before applying the async snapshot. This implements the deferred A-to-B test already proven RED in Step 5; do not add the test after production code.

- [ ] **Step 7: Run identity-only scans while busy and a full scan in `finally`**

Keep hidden-tab behavior and existing debounce. Change the MutationObserver scan rule:

```ts
const fresh = await PageReader.scanForErrors()
if (!fresh) return
if (localAnalyzeRequestIdRef.current || isOpen) {
    if (localAnalyzeRequestIdRef.current) {
        applyIdentityScan(fresh)
    }
    return
}
applyFullScan(fresh)
```

Identity-only application must not call `setScrapedData`, mutate textarea, reset `isUserEdited`, replace enriched context, change title fallback into a storage key, or trigger auto-analysis. In `handleAnalyze`'s finalizer, require both `localAnalyzeRequestIdRef.current === requestId` and `analyzeOriginRef.current?.requestId === requestId`, capture `origin = analyzeOriginRef.current.pageIdentity`, clear local busy ownership, and always run one full scan. Call `applyFullScan(fresh, origin, true)`: if the flag is set or fresh identity differs origin, reset `isUserEdited`, replace A with B even though `currentPageIdentityRef` is already B, reset auto-analyze, clear the flag, and clear `analyzeOriginRef`. Ordinary observer scans call `applyFullScan(fresh)` and do not force replacement. Set `postRunScanOwnerRef.current = requestId` at start; timeout/finally clear it before awaiting so only one scan runs. A failed scan logs fixed text and clears origin/flag only after this request owns the terminal cleanup.

Implement the prewritten `replaces a user-edited A textarea with B after busy Analyze completes` case: initial full scan A; user edits textarea; start/hold A Analyze; identity-only scan B leaves edited A text visible and sets the flag; resolve A; post-run full scan B replaces textarea with B, sets `isUserEdited=false`, resets auto-analyze, clears flag, and suppresses A result UI. It already failed before production edits because `previousIdentity` was B and the old `isUserEdited` branch retained A.

The finalizer's executable call is exactly:

```ts
const originRecord = analyzeOriginRef.current
if (!originRecord || originRecord.requestId !== requestId) return
const origin = originRecord.pageIdentity
const fresh = await PageReader.scanForErrors()
if (fresh) applyFullScan(fresh, origin, true)
```

Gate all result popover, status bubble, duration state, menu-close action, and visible success/failure telemetry on `requestStillOwnsVisiblePage`. Request-completion telemetry may use the originating case hash but must not mutate current-page UI.

- [ ] **Step 8: Run GREEN and concurrency regressions**

```powershell
& npm run test:run --prefix extension -- src/utils/pageIdentity.test.ts src/components/FAB.pageIdentity.test.tsx src/components/FAB.spinner.test.tsx src/hooks/useAnalysisHydration.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Page identity GREEN failed' }
```

Then run independently:

```powershell
Push-Location -LiteralPath 'extension'
try { & npm exec tsc -- --noEmit -p tsconfig.json; if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' } } finally { Pop-Location }
```

Expected: all four files pass and TypeScript exits 0. Existing A/B request, hydrated spinner, and exact-case durable hydration tests remain GREEN.

Run the exact post-run replacement GREEN target:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.pageIdentity.test.tsx -t 'replaces a user-edited A textarea with B after busy Analyze completes' --reporter=verbose
if ($LASTEXITCODE -ne 0) { throw 'Busy-switch textarea GREEN failed' }
```

- [ ] **Step 9: Prove busy identity scanning is active**

Temporarily restore `if (isAnalyzingRef.current || isOpen) return` before the scan. Run:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.pageIdentity.test.tsx -t 'switches identity from A to B while Analyze is busy' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Busy identity-scan mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Busy identity-scan mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because hydration remains A or A's completion becomes visible on B. Restore identity-only scanning and rerun Task 6 GREEN; expected PASS.

Temporarily replace `parsePageIdentitySnapshot(fresh)` with a direct `fresh.caseNumber` read. Run:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.pageIdentity.test.tsx -t 'contains throwing identity accessors' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Identity accessor mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Identity accessor mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL with the getter exception or a getter spy call. Restore the safe snapshot parser and rerun Task 6 GREEN; expected PASS.

- [ ] **Step 10: Commit page identity hardening**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/utils/pageIdentity.ts',
    'extension/src/utils/pageIdentity.test.ts',
    'extension/src/components/FAB.pageIdentity.test.tsx',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/hooks/useAnalysisHydration.ts',
    'extension/src/hooks/useAnalysisHydration.test.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 6 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 6 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 6 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 6 staged diff check failed' }
& git commit -m "fix(fab): track SPA identity during analysis"
if ($LASTEXITCODE -ne 0) { throw 'Task 6 commit failed' }
```

Expected: one commit containing only PageIdentity, busy-scan, post-run scan, and related regression changes; unrelated worktree files remain untouched.

## Task 7: One-Request Root Invocation and Host Explicit-Empty Compatibility

**Files:**
- Create: `extension/src/utils/analyzeRequest.ts`
- Create: `extension/src/utils/analyzeRequest.test.ts`
- Create: `extension/src/components/FAB.analyzeRequest.test.tsx`
- Create: `extension/src/background/contextMenu.test.ts`
- Delete: `extension/src/components/FAB.rootPathOverride.test.ts`
- Modify: `extension/src/background/contextMenu.ts`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/components/FAB.promptSourceErrors.test.tsx`
- Modify: `extension/src/components/FAB.userPrompt.test.tsx`
- Modify: `extension/src/components/FAB.bookmarkTelemetry.test.tsx`
- Modify: `extension/src/utils/prefs.ts`
- Modify: `host/dh_native_host.py`
- Modify: `host/test_session_workspace.py`

**Interfaces:**
- Consumes: Task 1 `ownDataProperty`; Task 6 `PageIdentity`/`parsePageIdentity`, current `prefs.rootPath`, and context-menu `{selectionText, rootPath}` event detail.
- Produces: `AnalyzeInvocation`, `AnalyzeRequestSnapshot`, `ContextMenuAnalyzePayload`, `buildContextMenuAnalyzePayload`, `readAnalyzeInvocation`, `snapshotAnalyzeRequest`, `requestMatchesPage`, and nested Host action-payload marker `rootPathOverrideProvided: true` only for a valid invocation override.

- [ ] **Step 1: Add failing pure request snapshot tests**

Create the following exact matrix in `analyzeRequest.test.ts`:

| Preference Root | Invocation own `rootPathOverride` | Snapshot Root | `rootPathOverrideProvided` |
|---|---|---|---:|
| `'C:\\Prefs'` | absent | `'C:\\Prefs'` | false |
| `'C:\\Prefs'` | `'C:\\Menu'` | `'C:\\Menu'` | true |
| `'C:\\Prefs'` | `''` | `''` | true |
| `'C:\\Prefs'` | number/null/object/array/accessor/proxy | `'C:\\Prefs'` | false |
| malformed preference Root | absent | `''` | false |

Assert the returned object is frozen, captures exact non-empty `requestId`, exact string case number, and Task 6 page identity, and is unaffected when the source invocation/page objects are mutated later. Empty/malformed request IDs or throwing page descriptors reject with fixed `Invalid Analyze request snapshot`; no getter runs. `requestMatchesPage` returns true only for the same non-null token.

In the same file, test `buildContextMenuAnalyzePayload` with a stored preferences object whose own data `rootPath` is nonempty, explicitly `''`, absent, malformed, accessor-backed, and behind a throwing descriptor proxy. Nonempty and empty strings produce an own `rootPath`; every absent/malformed case omits the property. A string `selectionText` is preserved; malformed selection is omitted. Getter/conversion hooks are never invoked and proxy exceptions are contained.

In `contextMenu.test.ts`, import the RED-target `ContextMenuClickDeps` and `handleContextMenuAnalyzeClick`, construct `vi.fn` deps, and assert this contract:

```ts
export interface ContextMenuClickDeps {
    readPreferences: () => Promise<unknown>
    executeInTab: (tabId: number) => Promise<void>
    sendToTab: (
        tabId: number,
        message: { type: 'TRIGGER_ANALYZE'; payload: ContextMenuAnalyzePayload },
    ) => Promise<void>
}

it('preserves an explicit empty Root through the click boundary', async () => {
    const order: string[] = []
    const deps: ContextMenuClickDeps = {
        readPreferences: vi.fn(async () => {
            order.push('read')
            return { rootPath: '' }
        }),
        executeInTab: vi.fn(async () => { order.push('execute') }),
        sendToTab: vi.fn(async () => { order.push('send') }),
    }
    await expect(handleContextMenuAnalyzeClick(
        { selectionText: 'selected' }, 7, deps,
    )).resolves.toBe('sent')
    expect(order).toEqual(['read', 'execute', 'send'])
    expect(deps.sendToTab).toHaveBeenCalledWith(7, {
        type: 'TRIGGER_ANALYZE',
        payload: { selectionText: 'selected', rootPath: '' },
    })
})
```

Add table rows for missing tab ID (no deps called), nonempty Root, malformed Root omission, execute/send failure fixed logging, and exact call order. The exported pure boundary means no new global `chrome.contextMenus/tabs/scripting` mock surface is required.

- [ ] **Step 2: Run the pure snapshot test to prove RED**

```powershell
if (Test-Path -LiteralPath 'extension/src/utils/analyzeRequest.ts') {
    throw 'Analyze request module unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/utils/analyzeRequest.test.ts --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Analyze request module RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze request module RED did not fail with Vitest exit 1' }
```

Expected: this isolated first RED fails only because `analyzeRequest.ts` does not exist. Create a compile-only module by importing Task 1 `ownDataProperty` and copying only the locked `AnalyzeInvocation`, `AnalyzeRequestSnapshot`, `ContextMenuAnalyzePayload`, and Task 7 function signatures. `readAnalyzeInvocation` returns `undefined`, `requestMatchesPage` returns false, builders return `{}`, and `snapshotAnalyzeRequest` throws fixed `Invalid Analyze request snapshot`. Do not redeclare or re-export `OwnDataProperty`/`ownDataProperty`. Then run the behavioral pair:

```powershell
& npm run test:run --prefix extension -- src/utils/analyzeRequest.test.ts src/background/contextMenu.test.ts --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'Analyze request RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze request RED did not fail with Vitest exit 1' }
```

Expected: imports succeed and named snapshot/presence/click-boundary assertions fail. `contextMenu.ts` must export a compile-only `handleContextMenuAnalyzeClick` shell before this pair; a missing export is not valid behavioral RED.

- [ ] **Step 3: Implement immutable request snapshot helpers**

Implement descriptor-safe override selection with Task 1 `ownDataProperty`. Presence means an own data string property exists; an absent/malformed/accessor override falls back to the current preference. Snapshot page identity/case from `parsePageIdentitySnapshot(pageData)`, never direct property access. A present string override, including `''`, is explicit. Construct only trusted primitive fields before calling `Object.freeze`; never freeze an untrusted caller object. Return:

```ts
const page = parsePageIdentitySnapshot(pageData)
if (!page || typeof requestId !== 'string' || requestId.length === 0) {
    throw new Error('Invalid Analyze request snapshot')
}
const override = ownDataProperty(invocation, 'rootPathOverride')
const rootPathOverrideProvided = override.kind === 'value'
    && typeof override.value === 'string'
const safePreferenceRoot = typeof preferenceRoot === 'string'
    ? preferenceRoot
    : ''
const rootPath = rootPathOverrideProvided
    ? override.value as string
    : safePreferenceRoot
return Object.freeze({
    requestId,
    pageIdentity: page.identity,
    caseNumber: page.caseNumber,
    rootPath,
    rootPathOverrideProvided,
})
```

`requestMatchesPage` is:

```ts
return request.pageIdentity !== null && request.pageIdentity === current
```

Implement the click boundary now, after its RED run:

```ts
export async function handleContextMenuAnalyzeClick(
    info: { selectionText?: unknown },
    tabId: number | undefined,
    deps: ContextMenuClickDeps,
): Promise<'sent' | 'ignored' | 'failed'> {
    if (!Number.isInteger(tabId) || (tabId as number) <= 0) return 'ignored'
    try {
        const storedPreferences = await deps.readPreferences()
        await deps.executeInTab(tabId as number)
        const selection = ownDataProperty(info, 'selectionText')
        const payload = buildContextMenuAnalyzePayload(
            selection.kind === 'value' ? selection.value : undefined,
            storedPreferences,
        )
        await deps.sendToTab(tabId as number, {
            type: 'TRIGGER_ANALYZE',
            payload,
        })
        return 'sent'
    } catch {
        console.error('[DH-BG] Context menu Analyze failed')
        return 'failed'
    }
}
```

Add accessor-backed and revoked `info` rows: both omit selection without invoking a getter or throwing, while an otherwise valid Root still follows the same read/execute/send order. `buildContextMenuAnalyzePayload` already returns a new ordinary object built only from accepted own strings; do not call `Object.freeze` on its return at this trust boundary because a mocked/revoked implementation must be contained by the surrounding `try` rather than receiving another proxy-sensitive reflective operation. `setupContextMenu` delegates to this function through the concrete production adapter in Step 6. Do not persist invocation data or merge it into `Preferences`.

- [ ] **Step 4: Add failing FAB one-request Root tests**

In `FAB.analyzeRequest.test.tsx`, mock preferences as mutable test state and capture consecutive `analyze_error` messages. Cover:

1. Context-menu event with `rootPath: 'C:\\Menu'` sends one request whose nested action payload contains that Root and `rootPathOverrideProvided: true`.
2. The next manual Analyze sends current `'C:\\Prefs'`, omits the nested explicit marker, and never repeats `'C:\\Menu'`.
3. Context-menu event with own `rootPath: ''` sends nested empty Root with `rootPathOverrideProvided: true`; next normal request returns to preference Root.
4. Missing/malformed/accessor Root uses current preference with no marker and never invokes conversion/getter hooks; malformed/getter-bearing page data returns no Host message.
5. Preferences change while a request is in flight does not mutate the already-sent payload; a later normal request sees the new preference.
6. Automatic Analyze and manual button Analyze each snapshot current preference Root independently with no explicit marker.

Assert `chromeMockSpies.storageSet/remove` never receive context-menu Root state.
Also retain Task 6's SPA assertion after replacing locals with `AnalyzeRequestSnapshot`: switching from A to B while A is in flight leaves `request.pageIdentity`, `request.caseNumber`, and `request.rootPath` unchanged, suppresses A UI on B, and persists A under A's exact case.
Name case 3 exactly `applies an explicit empty Root to exactly one request` for Step 10.

- [ ] **Step 5: Run FAB Root tests to prove RED**

```powershell
& npm run test:run --prefix extension -- src/components/FAB.analyzeRequest.test.tsx --reporter=dot
if ($LASTEXITCODE -eq 0) { throw 'FAB request-scope RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'FAB request-scope RED did not fail with Vitest exit 1' }
```

Expected: FAIL because current code stores `rootPathOverride`, ignores explicit empty, and leaks it into later requests.

- [ ] **Step 6: Pass Root as an invocation argument and remove persistent override**

Change the function shape to:

```ts
const handleAnalyze = async (
    dataToAnalyze: ScrapedData | null = null,
    invocation?: AnalyzeInvocation,
) => {
    const request = snapshotAnalyzeRequest(
        crypto.randomUUID(),
        targetData,
        prefs.rootPath,
        invocation,
    )
    const {
        requestId, pageIdentity, caseNumber, rootPath, rootPathOverrideProvided,
    } = request
    const page = parseScrapedDataSnapshot(targetData)
    if (!page) return
    latestRequestId.current = requestId
    localAnalyzePageRef.current = { requestId, pageIdentity, caseNumber }
    const hostPayload = {
        text: fullContext,
        context: page.source || 'Unknown Context',
        timestamp: new Date().toLocaleString(),
        rootPath,
        ...(rootPathOverrideProvided
            ? { rootPathOverrideProvided: true }
            : {}),
        ...(typeof page.productCategory === 'string'
            ? { product: page.productCategory }
            : {}),
        ...(typeof caseNumber === 'string'
            ? { caseNumber }
            : {}),
    }
    const message = {
        type: 'NATIVE_MSG',
        payload: {
            action: 'analyze_error',
            payload: hostPayload,
            requestId,
            _persist: {
                caseNumber,
                successTitle: t('analyze'),
                errorTitle: t('analysisFailed'),
            },
        },
    }
    await chrome.runtime.sendMessage(message)
}
```

In `contextMenu.ts`, replace `(prefs.dh_prefs as any)?.rootPath || ''` and the manually assembled payload with:

```ts
const productionContextMenuDeps: ContextMenuClickDeps = {
    readPreferences: () => new Promise((resolve, reject) => {
        chrome.storage.local.get('dh_prefs', result => {
            if (chrome.runtime.lastError) {
                reject(new Error('Context menu preferences read failed'))
                return
            }
            const prefs = ownDataProperty(result, 'dh_prefs')
            resolve(prefs.kind === 'value' ? prefs.value : undefined)
        })
    }),
    executeInTab: async tabId => {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => true,
        })
    },
    sendToTab: (tabId, message) => new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            if (chrome.runtime.lastError) {
                reject(new Error('Context menu Analyze delivery failed'))
                return
            }
            resolve()
        })
    }),
}

void handleContextMenuAnalyzeClick(
    info,
    tab?.id,
    productionContextMenuDeps,
)
```

`buildContextMenuAnalyzePayload`, `readAnalyzeInvocation`, `snapshotAnalyzeRequest`, and Task 8 `classifyConfigUpdateResponse` import and use Task 1's exact `ownDataProperty(value, key: PropertyKey): OwnDataProperty` implementation. Task 7 does not define or re-export a duplicate.

Add one `Proxy.revocable` row to every `ownDataProperty` consumer matrix in this task: revoked stored preferences, invocation detail, page data, and context-menu payload all return the documented absent/invalid fallback without throwing. This is required because `Array.isArray(revokedProxy)` itself throws; the type/array/descriptor sequence therefore remains wholly inside the helper's `try`.

A data-descriptor string Root is copied as an own payload field even when empty; absence/malformed/accessor/proxy returns a payload with no `rootPath` field. This preserves missing versus explicitly captured empty. The FAB context-menu listener calls:

```ts
void handleAnalyze(dataToAnalyze, readAnalyzeInvocation(e.detail))
```

`readAnalyzeInvocation` performs the same descriptor-safe own read: exact string Root, including empty, returns `{ rootPathOverride: value }`; every absent/malformed/accessor/proxy input returns `undefined`. Test it in `analyzeRequest.test.ts` with the same presence matrix.

Manual and automatic callers pass no invocation. Replace Task 6's local visible-page comparison with `requestMatchesPage(request, currentPageIdentityRef.current)` everywhere. Build the nested `analyze_error.payload.rootPath` from the frozen request and add nested `analyze_error.payload.rootPathOverrideProvided: true` only when the request says true. Delete `rootPathOverride` state, `effectivePrefs`, every `setRootPathOverride`, the `mergeRootPathOverride` import/helper, and `FAB.rootPathOverride.test.ts`. Update FAB test mocks to expose only `usePrefs`.

- [ ] **Step 7: Add failing Host compatibility tests**

In `host/test_session_workspace.py`, preserve the existing missing and empty fallback tests, then add executable tests using the existing `NativeHost.__new__`, `initialize_prompt_state`, `MagicMock`, and `AsyncMock` fixture pattern. Add this helper as a real method inside `TestSessionIdentityLifecycle`:

```py
def _make_root_contract_host(self, configured_root: str):
    host = NativeHost.__new__(NativeHost)
    initialize_prompt_state(host)
    host.root_path = configured_root
    host.current_case_id = None
    host.current_session_id = None
    host.current_session_root_path = None
    host.current_prompt_fingerprint = None
    host.session = object()
    host.client = object()
    host.last_session_error = None
    host._validate_effective_root = MagicMock()
    host._resolve_prompt_snapshot = MagicMock(
        side_effect=lambda root, _only: make_snapshot(root)
    )
    host._refresh_session = AsyncMock(return_value=True)
    host.send_progress = MagicMock()
    host.scrubber = MagicMock()
    host.scrubber.scrub.side_effect = lambda value: value
    host.current_request_id = None
    return host

async def test_explicit_empty_analyze_root_overrides_config_for_one_request(self):
    configured = r'C:\MyWorkbench\MyCases'
    host = self._make_root_contract_host(configured)
    config = {
        '_effective_root': None,
        '_use_workspace_only': False,
        'working_directory': os.getcwd(),
    }
    def load_explicit_empty(*, root_path_override):
        self.assertIsNone(root_path_override)
        host.root_path = None
        return config
    host._get_session_config = MagicMock(side_effect=load_explicit_empty)
    result = await host.handle_analyze_error({
        'text': None,
        'caseNumber': '2601190030003106',
        'rootPath': '',
        'rootPathOverrideProvided': True,
    })
    self.assertEqual(result['error'], 'No text provided for analysis.')
    host._get_session_config.assert_called_once_with(root_path_override=None)
    self.assertIsNone(host.root_path)

async def test_request_after_explicit_empty_without_marker_uses_configured_root(self):
    configured = r'C:\MyWorkbench\MyCases'
    host = self._make_root_contract_host(configured)
    generic = {
        '_effective_root': None,
        '_use_workspace_only': False,
        'working_directory': os.getcwd(),
    }
    configured_data = {
        '_effective_root': configured,
        '_use_workspace_only': False,
        'working_directory': configured,
    }
    calls = 0
    sentinel = object()
    def load_config(*, root_path_override=sentinel):
        nonlocal calls
        calls += 1
        if root_path_override is None:
            host.root_path = None
            return generic
        host.root_path = configured
        return configured_data
    host._get_session_config = MagicMock(side_effect=load_config)
    await host.handle_analyze_error({
        'text': None, 'caseNumber': '2601190030003106',
        'rootPath': '', 'rootPathOverrideProvided': True,
    })
    await host.handle_analyze_error({
        'text': None, 'caseNumber': '2601190030003106',
    })
    self.assertGreaterEqual(calls, 2)
    self.assertEqual(host._get_session_config.call_args_list[:2], [
        unittest.mock.call(root_path_override=None),
        unittest.mock.call(),
    ])
    self.assertEqual(host.root_path, configured)

async def test_malformed_explicit_marker_uses_legacy_fallback(self):
    configured = r'C:\MyWorkbench\MyCases'
    for marker in (False, None, 1, 'true', [], {}):
        with self.subTest(marker=marker):
            host = self._make_root_contract_host(configured)
            host._get_session_config = MagicMock(return_value={
                '_effective_root': configured,
                '_use_workspace_only': False,
                'working_directory': configured,
            })
            await host.handle_analyze_error({
                'text': None,
                'caseNumber': '2601190030003106',
                'rootPath': '',
                'rootPathOverrideProvided': marker,
            })
            host._get_session_config.assert_called_once_with()

async def test_explicit_marker_with_non_string_root_uses_legacy_fallback(self):
    configured = r'C:\MyWorkbench\MyCases'
    host = self._make_root_contract_host(configured)
    host._get_session_config = MagicMock(return_value={
        '_effective_root': configured,
        '_use_workspace_only': False,
        'working_directory': configured,
    })
    await host.handle_analyze_error({
        'text': None,
        'caseNumber': '2601190030003106',
        'rootPath': {'malformed': True},
        'rootPathOverrideProvided': True,
    })
    host._get_session_config.assert_called_once_with()
    self.assertEqual(host.root_path, configured)
```

These four tests prove explicitness requires both marker `is True` and a string Root.

Run:

```powershell
$rootRed=Join-Path ([IO.Path]::GetTempPath()) 'dh-plan-e-root-red'
if (Test-Path -LiteralPath $rootRed) { throw 'Root RED temp already exists' }
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH')
$savedEnv=@{}
foreach ($name in $envNames) {
    $savedEnv[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
}
$testExit=99
try {
    New-Item -ItemType Directory -Path $rootRed | Out-Null
    $env:LOCALAPPDATA=$rootRed
    $env:APPDATA=$rootRed
    $env:USERPROFILE=$rootRed
    $env:HOME=$rootRed
    $env:TEMP=$rootRed
    $env:TMP=$rootRed
    $env:PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path
    & 'host\venv\Scripts\python.exe' -m unittest host.test_session_workspace -v
    $testExit=$LASTEXITCODE
} finally {
    foreach ($name in $envNames) {
        if ($null -eq $savedEnv[$name]) {
            Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable(
                $name,
                $savedEnv[$name],
                'Process'
            )
        }
    }
    if (Test-Path -LiteralPath $rootRed) {
        Remove-Item -LiteralPath $rootRed -Recurse -Force
    }
}
if ($testExit -eq 0) { throw 'Host Root RED unexpectedly passed' }
if ($testExit -eq 99) { throw 'Host Root RED did not execute' }
if ($testExit -ne 1) { throw "Host Root RED returned unexpected exit code: $testExit" }
```

Expected: new explicit-empty tests FAIL because `handle_analyze_error` currently treats every empty Root as legacy fallback. Existing old-Host fallback tests remain PASS. The `Remove-Item` shown above is inside the same block's `finally`; that invocation deletes its known temp root and restores every prior process environment value. Inspect output to reject unrelated import/setup failures, and record the observed assertion failure rather than accepting any arbitrary nonzero `$testExit`.

- [ ] **Step 8: Implement Host marker semantics without changing legacy payloads**

In `handle_analyze_error`, explicitness requires literal `True` plus a string Root; malformed combinations preserve legacy fallback:

```py
payload_root_explicit = (
    payload.get("rootPathOverrideProvided") is True
    and isinstance(payload_root_value, str)
)
if payload_root_explicit:
    payload_root_path = self._normalize_root_path(payload_root_value)
    full_config = self._get_session_config(
        root_path_override=payload_root_path
    )
elif isinstance(payload_root_value, str) and payload_root_value.strip():
    payload_root_path = self._normalize_root_path(payload_root_value)
    full_config = self._get_session_config(root_path_override=payload_root_path)
else:
    full_config = self._get_session_config()
    payload_root_path = full_config.get("_effective_root")
```

This preserves old Extension behavior when the marker is absent, including an old empty `rootPath` falling back to Host config. A new explicit empty passes `None` as the one-request override, selecting the Host's existing generic compatibility working directory without modifying `config.json`. Do not add a Host field or Chrome storage record for this override.

- [ ] **Step 9: Run GREEN across Extension and Host Root behavior**

```powershell
$ErrorActionPreference='Stop'
$rootGreen=Join-Path ([IO.Path]::GetTempPath()) 'dh-plan-e-root-green'
if (Test-Path -LiteralPath $rootGreen) { throw 'Root GREEN temp already exists' }
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH')
$savedEnv=@{}
foreach ($name in $envNames) {
    $savedEnv[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
}
try {
    New-Item -ItemType Directory -Path $rootGreen | Out-Null
    & npm run test:run --prefix extension -- src/utils/analyzeRequest.test.ts src/background/contextMenu.test.ts src/components/FAB.analyzeRequest.test.tsx src/components/FAB.spinner.test.tsx src/components/FAB.promptSourceErrors.test.tsx src/components/FAB.userPrompt.test.tsx src/components/FAB.bookmarkTelemetry.test.tsx --reporter=dot
    if ($LASTEXITCODE -ne 0) { throw 'Extension Root suite failed' }
    $env:LOCALAPPDATA=$rootGreen
    $env:APPDATA=$rootGreen
    $env:USERPROFILE=$rootGreen
    $env:HOME=$rootGreen
    $env:TEMP=$rootGreen
    $env:TMP=$rootGreen
    $env:PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path
    & 'host\venv\Scripts\python.exe' -m unittest host.test_session_workspace host.test_prompt_session -v
    if ($LASTEXITCODE -ne 0) { throw 'Host Root suite failed' }
    Push-Location -LiteralPath 'extension'
    try {
        & npm exec tsc -- --noEmit -p tsconfig.json
        if ($LASTEXITCODE -ne 0) { throw 'Extension TypeScript check failed' }
    } finally {
        Pop-Location
    }
} finally {
    foreach ($name in $envNames) {
        if ($null -eq $savedEnv[$name]) {
            Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable(
                $name,
                $savedEnv[$name],
                'Process'
            )
        }
    }
    if (Test-Path -LiteralPath $rootGreen) {
        Remove-Item -LiteralPath $rootGreen -Recurse -Force
    }
}
```

Expected: all seven Extension files pass, both Host modules report `OK`, and the nested `extension/` TypeScript command exits 0. Existing missing/empty old payload tests remain GREEN. The `Remove-Item` shown above is inside the same block's `finally`; no later shell depends on `$rootGreen`.

- [ ] **Step 10: Prove explicit-empty presence is active**

Temporarily change the request helper's valid-string check to require a truthy string. Run:

```powershell
& npm run test:run --prefix extension -- src/components/FAB.analyzeRequest.test.tsx -t 'applies an explicit empty Root to exactly one request' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Explicit-empty Root mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Explicit-empty Root mutation did not fail with Vitest exit 1' }
```

Expected mutation output: FAIL because the context-menu request sends the preference Root or omits `rootPathOverrideProvided`. Restore presence-sensitive handling and rerun Task 7 GREEN; expected PASS.

- [ ] **Step 11: Commit per-request Root behavior**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/utils/analyzeRequest.ts',
    'extension/src/utils/analyzeRequest.test.ts',
    'extension/src/background/contextMenu.ts',
    'extension/src/background/contextMenu.test.ts',
    'extension/src/components/FAB.analyzeRequest.test.tsx',
    'extension/src/components/FAB.rootPathOverride.test.ts',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/components/FAB.promptSourceErrors.test.tsx',
    'extension/src/components/FAB.userPrompt.test.tsx',
    'extension/src/components/FAB.bookmarkTelemetry.test.tsx',
    'extension/src/utils/prefs.ts',
    'host/dh_native_host.py',
    'host/test_session_workspace.py'
)
& git add -A -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 7 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 7 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 7 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 7 staged diff check failed' }
& git commit -m "fix(analysis): scope Root override to one request"
if ($LASTEXITCODE -ne 0) { throw 'Task 7 commit failed' }
```

Expected: one commit; Git records deletion of the obsolete lifetime test and addition of request-level Extension/Host coverage, while unrelated worktree files remain untouched.

## Task 8: Safe Native Update Errors and Exact Config Acknowledgment

**Files:**
- Create: `extension/src/utils/nativeUpdateError.ts`
- Create: `extension/src/utils/nativeUpdateError.test.ts`
- Modify: `extension/src/background/serviceWorker.ts`
- Modify: `extension/src/content/index.tsx`
- Create: `extension/src/content/updateErrorBridge.ts`
- Create: `extension/src/content/updateErrorBridge.test.ts`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/utils/configUpdateResult.ts`
- Modify: `extension/src/utils/configUpdateResult.test.ts`
- Modify: `extension/src/utils/translations.ts`
- Modify: `extension/src/test/chromeMock.ts`

**Interfaces:**
- Consumes: Task 1 `ownDataProperty`, `safeErrorText`, existing `ConfigUpdateDecision`, and the current baseline Service Worker direct-port event route.
- Produces: Plan E-owned `NativeUpdateErrorEvent`/`normalizeNativeUpdateError`, direct runtime/tab/DOM delivery, and this exact config matrix:

| `success` | `config_saved` | `acknowledged` | `issue` |
|---|---|---:|---|
| `true` | absent | true | `null` |
| `true` | `true` | true | `null` |
| `true` | `false` | false | `{configSaved:false,...}` |
| `false` | `true` | true | `{configSaved:true,...}` |
| `false` | absent/`false` | false | `{configSaved:false,...}` |
| `success` absent/non-boolean | absent/boolean | false | `{configSaved:false,...}` |
| either/absent/malformed | present non-boolean/accessor | false | `{configSaved:false,...}` |

- [ ] **Step 1: Add the helper tests and prove feature RED**

Create `nativeUpdateError.test.ts` with the exact input/result matrix:

| Raw Native value | Result error |
|---|---|
| `{payload:{error:'safe'}}` | `'safe'` |
| `{payload:{message:'safe message'}}` | `'safe message'` |
| `{error:'top-level safe'}` | `'top-level safe'` |
| `{payload:{error:{secret},message:'payload safe'},error:'top safe',message:'top message'}` | `'payload safe'`; exact candidate precedence is payload error, payload message, top-level error, top-level message |
| missing, empty, object, array, function, symbol, bigint, null | `'Update check failed.'` |
| accessor/throwing `toString`/`toJSON` | `'Update check failed.'`; getter/conversion hooks are not called; no throw |
| proxy descriptor trap that throws | `'Update check failed.'`; exception contained; no coercion, secret, or raw value observed; access remains bounded and does not repeat after the fallback is chosen |
| revoked proxy at the outer value or nested `payload` | `'Update check failed.'` | no exception, conversion, storage, runtime/tab forwarding of raw data, or raw log |

Before the RED run, create only `nativeUpdateError.test.ts`; do not create `nativeUpdateError.ts` or an export shell yet. Every eventual result must deep-equal:

```ts
{
    type: 'NATIVE_UPDATE_ERROR',
    payload: { error: expected },
}
```

Spy on all console methods and assert a secret marker from rejected values never appears. The normalizer may inspect only own data descriptors for `payload.error`, `payload.message`, `error`, and `message`, in that order. Name the precedence case exactly `uses fixed update-error candidate precedence` and the full secret/non-forwarding case `normalizes update_error without forwarding raw data`.

The helper module is absent at the deterministic Plan E base; the test file was just created in this step. Run only that new helper test now:

```powershell
if (Test-Path -LiteralPath 'extension/src/utils/nativeUpdateError.ts') {
    throw 'Plan E helper unexpectedly exists at the execution base'
}
& npm run test:run --prefix extension -- src/utils/nativeUpdateError.test.ts --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Update-error helper RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Update-error helper RED did not fail with Vitest exit 1' }
```

Expected: FAIL because `./nativeUpdateError` does not exist. Import failure is valid RED only for this new helper test. Verify verbose output names only this test file and missing helper; any other import/configuration failure blocks implementation.

- [ ] **Step 2: Implement and prove the helper GREEN**

Create `nativeUpdateError.ts` with the exact Plan E implementation below; begin the file by copying the locked `NativeUpdateErrorEvent` and `NativeUpdateErrorDeliveryDeps` declarations from Public Interfaces exactly once:

```ts
import { ownDataProperty } from './ownData'
import { safeErrorText } from './safeErrorText'

export function normalizeNativeUpdateError(
    value: unknown,
): NativeUpdateErrorEvent {
    const payload = ownDataProperty(value, 'payload')
    const payloadError = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'error')
        : { kind: 'invalid' as const }
    const payloadMessage = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'message')
        : { kind: 'invalid' as const }
    const error = ownDataProperty(value, 'error')
    const message = ownDataProperty(value, 'message')
    return {
        type: 'NATIVE_UPDATE_ERROR',
        payload: {
            error: safeErrorText([
                payloadError.kind === 'value' ? payloadError.value : undefined,
                payloadMessage.kind === 'value' ? payloadMessage.value : undefined,
                error.kind === 'value' ? error.value : undefined,
                message.kind === 'value' ? message.value : undefined,
            ], 'Update check failed.'),
        },
    }
}
```

The helper declares/exports the locked `NativeUpdateErrorEvent` exactly as in Public Interfaces and imports only `ownDataProperty`/`safeErrorText`; do not duplicate the type elsewhere. Run:

```powershell
& npm run test:run --prefix extension -- src/utils/nativeUpdateError.test.ts --reporter=verbose
if ($LASTEXITCODE -ne 0) { throw 'Update-error helper GREEN failed' }
```

Expected: helper tests PASS. This GREEN closes the helper feature cycle before delivery tests.

- [ ] **Step 3: Add baseline delivery/UI tests and prove RED**

Extend `chromeMock.ts` with runtime-message emission for the Options UI listener plus tab query/send spies. Add tests proving:

- Plan E's injected update-error ingress receives raw `update_error`, logs only fixed `'[DH-SW] Update check failed'`, sends one normalized runtime event and one normalized active-tab event, and content converts the tab message into `dh-update-error` with `{error:string}`. `serviceWorker.ts` delegates its current unsolicited-port branch to this ingress, but tests do not import the worker.
- FAB listens to `dh-update-error`, reapplies `safeErrorText`, and removes the listener on unmount.
- Raw payload object is not passed to runtime/tabs, stored, serialized, or logged.
- Options and FAB descriptor-read normalized candidates and reapply `safeErrorText([candidate], t('updateCheckFailed'))` before display.

Add the ingress, Options, content-bridge, and FAB cases before delivery implementation; all four must be RED. Place `delivers only the normalized error to runtime, tab, and FAB DOM` in `nativeUpdateError.test.ts`. Import failure is not acceptable here. After writing the tests, add these compile-only shells, then run the tests and require assertion failures for missing runtime/tab sends, DOM detail, Options display, and FAB display:

```ts
// nativeUpdateError.ts, temporary RED shell after normalizeNativeUpdateError
export async function handleNativeUpdateError(
    _raw: unknown,
    _deps: NativeUpdateErrorDeliveryDeps,
): Promise<void> {}

// content/updateErrorBridge.ts, temporary RED shell
export const UPDATE_ERROR_DOM_EVENT = 'dh-update-error' as const
export interface UpdateErrorDomDetail { error: string }
export function forwardNativeUpdateErrorToWindow(
    _message: unknown,
    _target: EventTarget = window,
): boolean {
    return false
}
```

The FAB listener remains absent for RED, but its test imports only established component/shared symbols. Assert this exact delivery body plus titles `bridges NATIVE_UPDATE_ERROR with safe detail` and `defends FAB update error display`:

```ts
it('delivers only the normalized error to runtime, tab, and FAB DOM', async () => {
    setActiveTabs([{ id: 17 }])
    const secret = { toString: vi.fn(() => 'SECRET') }
    const observed: unknown[] = []
    window.addEventListener(UPDATE_ERROR_DOM_EVENT, event => {
        observed.push((event as CustomEvent).detail)
    }, { once: true })
    await handleNativeUpdateError({
        action: 'update_error',
        payload: { error: secret, message: 'safe update failure' },
    }, baselineDeliveryDeps)
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
        type: 'NATIVE_UPDATE_ERROR',
        payload: { error: 'safe update failure' },
    })
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledWith(17, {
        type: 'NATIVE_UPDATE_ERROR',
        payload: { error: 'safe update failure' },
    })
    expect(forwardNativeUpdateErrorToWindow(
        chromeMockSpies.tabsSendMessage.mock.calls[0][1],
    )).toBe(true)
    expect(observed).toEqual([{ error: 'safe update failure' }])
    expect(secret.toString).not.toHaveBeenCalled()
})
```

The delivery interface was already exported by Step 2; tests consume that exact shape without redeclaring it.

Do not add a second Native-port owner or import `serviceWorker.ts` in these tests. `emitRuntimeMessage(message)` invokes registered Options/runtime UI listeners with fixed mock sender plus a response spy. Do not coerce malformed test messages when deriving action/type logs.

Test placement is exact: `bridges NATIVE_UPDATE_ERROR with safe detail` lives in `content/updateErrorBridge.test.ts`; `defends FAB update error display` lives in `FAB.spinner.test.tsx`; `defends Options update error display` lives in `Options.test.tsx`. Helper titles are `uses fixed update-error candidate precedence` and `normalizes update_error without forwarding raw data`.

Add these exact chromeMock exports:

```ts
export function setActiveTabs(tabs: Array<{ id?: number }>): void
export function emitRuntimeMessage(message: unknown): void
export function emitTabMessage(tabId: number, message: unknown): void
export const chromeMockSpies: {
    runtimeSendMessage: ReturnType<typeof vi.fn>
    tabsQuery: ReturnType<typeof vi.fn>
    tabsSendMessage: ReturnType<typeof vi.fn>
}
```

`installChromeMock()` provides callback/Promise-compatible `chrome.tabs.query` and `chrome.tabs.sendMessage`; `runtimeSendMessage` aliases the existing `sendMessage` spy. `resetChromeMock()` clears active tabs, tab message logs, UI runtime listeners, and spies. `content/index.tsx` delegates its `NATIVE_UPDATE_ERROR` branch to the directly tested `forwardNativeUpdateErrorToWindow` helper; `emitTabMessage` remains available for the one content-listener assertion that invokes it.

- [ ] **Step 4: Run delivery/UI RED**

```powershell
& npm run test:run --prefix extension -- src/utils/nativeUpdateError.test.ts src/components/Options.test.tsx src/components/FAB.spinner.test.tsx src/content/updateErrorBridge.test.ts -t '(delivers only the normalized error to runtime, tab, and FAB DOM|defends Options update error display|defends FAB update error display|bridges NATIVE_UPDATE_ERROR with safe detail)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Update-error delivery RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Update-error delivery RED did not fail with Vitest exit 1' }
```

Expected: all four named tests run and fail their intended assertions for absent runtime/tab sends, DOM bridge, Options display, and FAB behavior. Reject import/configuration/no-test failures.

- [ ] **Step 5: Implement safe baseline ingress and defense-in-depth UI**

Keep Step 2's helper unchanged. Replace the compile-only shells with the delivery/bridge/UI implementation. Leave current update availability/not-available behavior untouched.

Implement the ingress after RED:

```ts
export function handleNativeUpdateError(
    raw: unknown,
    deps: NativeUpdateErrorDeliveryDeps,
): Promise<void> {
    const event = normalizeNativeUpdateError(raw)
    console.warn('[DH-SW] Update check failed')
    return Promise.allSettled([
        deps.sendRuntime(event),
        deps.queryActiveTabs().then(tabs => Promise.allSettled(
            tabs.flatMap(tab => tab.id === undefined
                ? []
                : [deps.sendTab(tab.id, event)]),
        )),
    ]).then(() => undefined)
}
```

The content bridge is:

```ts
export function forwardNativeUpdateErrorToWindow(
    message: unknown,
    target: EventTarget = window,
): boolean {
    const type = ownDataProperty(message, 'type')
    const payload = ownDataProperty(message, 'payload')
    if (type.kind !== 'value' || type.value !== 'NATIVE_UPDATE_ERROR') return false
    const candidate = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'error')
        : { kind: 'invalid' as const }
    const error = safeErrorText([
        candidate.kind === 'value' ? candidate.value : undefined,
    ], 'Update check failed.')
    target.dispatchEvent(new CustomEvent<UpdateErrorDomDetail>(
        UPDATE_ERROR_DOM_EVENT,
        { detail: { error } },
    ))
    return true
}
```

`content/index.tsx` calls this helper for every runtime message; false means it was not this event. FAB's listener performs the same `ownDataProperty` read, localizes fallback, and unregisters on cleanup. Never log `msg`, `msg.payload`, or normalized user-controlled text.

In current `serviceWorker.ts`, the unsolicited port branch is exact:

```ts
const action = ownDataProperty(msg, 'action')
if (action.kind === 'value' && action.value === 'update_error') {
    void handleNativeUpdateError(msg, productionUpdateErrorDeps)
    return
}
```

`productionUpdateErrorDeps` wraps current `chrome.runtime.sendMessage`, active/current-window `chrome.tabs.query`, and `chrome.tabs.sendMessage`; it creates no new port owner and leaves other update actions unchanged.

Options' current runtime listener and FAB's DOM listener each read only own data and call `safeErrorText` with localized fallback before state/render. Add no direct Native Host connection, polling, storage cleanup, or reload behavior.

- [ ] **Step 6: Add the complete failing config matrix**

Replace the two happy-path cases in `configUpdateResult.test.ts` with `it.each` covering every row in the locked table. “Absent” must be represented by no own `config_saved` property; add present malformed values:

```ts
[null, 'true', 1, 0, [], {}, Symbol('x')]
```

Add getter/proxy cases where descriptor access throws and assert a safe unacknowledged issue with no conversion/logging. For contradictory `{success:true, config_saved:false}`, assert safe string error/message precedence and fixed empty fallback when neither is a string. Assert `{success:false, config_saved:true}` remains acknowledged with `configSaved:true` issue.
Also test an accessor-backed or throwing-proxy outer `status`/`data`; classification returns the same fixed unacknowledged `{configSaved:false}` issue and never throws or logs raw input.

In `Options.test.tsx`, send an instruction edit and a prompt edit through `{success:true, config_saved:false}`. Then trigger another preference update and assert the same instruction/prompt revision/value is resent because acknowledgment did not advance; `refreshPromptHealth` must not run for the contradictory response. Repeat with `config_saved` present non-boolean. Preserve tests proving shipped legacy `{success:true}` and `{success:true, config_saved:true}` advance revisions and do refresh health, while saved refresh failure advances with an issue.
Use these exact test titles across the matrix: `classifies the config_saved property-presence matrix`, `acknowledges the legacy Host response without config_saved`, `keeps contradictory config_saved false instruction revision retryable`, and `keeps non-boolean config_saved prompt revision retryable`. Name the null-presence mutation target exactly `rejects present null config_saved`. The update-error mutation title comes from Step 2's helper test: `uses fixed update-error candidate precedence`.

- [ ] **Step 7: Run config tests to prove RED**

```powershell
& npm run test:run --prefix extension -- src/utils/configUpdateResult.test.ts src/components/Options.test.tsx -t '(classifies the config_saved property-presence matrix|acknowledges the legacy Host response without config_saved|keeps contradictory config_saved false instruction revision retryable|keeps non-boolean config_saved prompt revision retryable)' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Config acknowledgment RED unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Config acknowledgment RED did not fail with Vitest exit 1' }
```

Expected: FAIL because current code acknowledges every `success:true`, including explicit false and present malformed `config_saved`.

- [ ] **Step 8: Implement exact property-presence classification**

Import Task 1 `ownDataProperty` so absence and present malformed values cannot collapse. An accessor is present-invalid, not absent:

Production imports `ownDataProperty(value, key: PropertyKey): OwnDataProperty` from `ownData.ts`. Its exact executable body is locked in Task 1 Step 2; Task 8 does not define a duplicate.

Replace optional-chaining outer checks with `ownDataProperty`: exact own data `status === 'success'` and a non-array own data `data` object are required; every outer accessor/proxy/malformed status follows the fixed outer failure decision without reading unsafe error properties directly. Then classify both inner fields. Apply this order:

```text
1. present invalid/non-boolean config_saved -> unacknowledged, configSaved false
2. success === true and config_saved absent/true -> acknowledged, no issue
3. success === true and config_saved false -> unacknowledged issue
4. success === false and config_saved true -> acknowledged saved issue
5. success === false and config_saved absent/false -> unacknowledged issue
6. every malformed/absent success shape -> unacknowledged issue
```

Build issue fallbacks only from valid string `error`/`message`; Options already supplies localized `configNotSaved` when fallback is empty. Only `decision.acknowledged` reaches `acknowledgeInstructionRevision`/`acknowledgePromptRevision`, so no separate revision rule is added.

Add revoked outer-response and revoked nested-`data` rows to `configUpdateResult.test.ts`. Both must return the fixed unacknowledged `{configSaved:false}` decision without throwing, logging, or invoking conversion hooks. Do not perform a separate `Array.isArray(data)` outside `ownDataProperty` containment; classify nested fields only by calling `ownDataProperty(dataField.value, ...)`, whose entire type/array/descriptor sequence is caught.

- [ ] **Step 9: Add translations and run GREEN**

Add `updateCheckFailed` with exact copy `{ en: 'Update check failed.', zh: '更新检查失败。' }`; retain `checkFailed` only where it is already semantically correct. Ensure the contradictory config path renders the existing `configNotSaved`, while saved refresh failure renders the existing `configSavedRefreshFailed`.

Run the complete GREEN suite:

```powershell
$ErrorActionPreference='Stop'
& npm run test:run --prefix extension -- src/utils/nativeUpdateError.test.ts src/utils/configUpdateResult.test.ts src/components/Options.test.tsx src/components/FAB.spinner.test.tsx src/content/updateErrorBridge.test.ts --reporter=dot
if ($LASTEXITCODE -ne 0) { throw 'Task 8 GREEN failed' }
Push-Location -LiteralPath 'extension'
try {
    & npm exec tsc -- --noEmit -p tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw 'Task 8 TypeScript check failed' }
} finally {
    Pop-Location
}
```

Expected: all five files pass, including `updateErrorBridge.test.ts` and FAB display regression; TypeScript runs from `extension/`. Legacy `{success:true}` remains acknowledged; malformed/false values remain retryable.

- [ ] **Step 10: Prove presence detection and helper normalization are active**

Perform both temporary mutations:

1. Replace the own-property check with `result.config_saved == null`, then run:

```powershell
& npm run test:run --prefix extension -- src/utils/configUpdateResult.test.ts -t 'rejects present null config_saved' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Config presence mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Config presence mutation did not fail with Vitest exit 1' }
```

Expected: the exact named test appears in output and Vitest exits nonzero because malformed presence is acknowledged as legacy absence.

2. In `normalizeNativeUpdateError`, remove the `payload.message` candidate (or move it after top-level `error`), then run:

```powershell
& npm run test:run --prefix extension -- src/utils/nativeUpdateError.test.ts -t 'uses fixed update-error candidate precedence' --reporter=verbose
if ($LASTEXITCODE -eq 0) { throw 'Update-error normalization mutation unexpectedly passed' }
if ($LASTEXITCODE -ne 1) { throw 'Update-error normalization mutation did not fail with Vitest exit 1' }
```

Expected: the exact named test appears and Vitest exits nonzero because the helper selects the wrong safe string. Restore the fixed four-candidate decision before continuing.

Restore both changes and rerun Task 8 GREEN; expected PASS.

- [ ] **Step 11: Commit boundary hardening**

```powershell
$ErrorActionPreference='Stop'
$expected=@(
    'extension/src/utils/nativeUpdateError.ts',
    'extension/src/utils/nativeUpdateError.test.ts',
    'extension/src/background/serviceWorker.ts',
    'extension/src/content/index.tsx',
    'extension/src/content/updateErrorBridge.ts',
    'extension/src/content/updateErrorBridge.test.ts',
    'extension/src/components/Options.tsx',
    'extension/src/components/Options.test.tsx',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/utils/configUpdateResult.ts',
    'extension/src/utils/configUpdateResult.test.ts',
    'extension/src/utils/translations.ts',
    'extension/src/test/chromeMock.ts'
)
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Task 8 files' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged Task 8 files' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne $expected.Count) {
    throw "Task 8 staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 8 staged diff check failed' }
& git commit -m "fix(native): normalize update and config acknowledgments"
if ($LASTEXITCODE -ne 0) { throw 'Task 8 commit failed' }
```

Expected: the exact staged set contains all fourteen Task 8 files and nothing else; one commit contains helper, current Worker/content/FAB delivery, config classification, tests, and translations. Downstream-plan sentinel files remain absent.

## Task 9: Scripted Evidence Executor, Windows Promotion Retry, and Final Evidence

> **Implementation worker:** Use `superpowers:test-driven-development` for both
> code cycles and `superpowers:verification-before-completion` before every
> completion claim. This Task 9 is the complete executable plan. No earlier
> Task 9 text, embedded executor, or cross-process shell state is retained.

> **Task 9 authority override:** This Task 9 supersedes every earlier global or
> file-map statement about Task 9 chronology, counts, persistent controller,
> mutex/lease lifetime, TypeScript/Vitest commands, authorized paths, and release
> assets. Tasks 1-8 remain byte-identical historical instructions. Task 9 uses
> only the latest accepted specs and independent one-line scripted calls below.

### 9.1 Files, Interfaces, and Scope

**Exact reviewed-change surface:**

- Authority, read only: `docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md`
- Authority, read only: `docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md`
- Modify and commit first: `docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md`
- Create in asset RED: `extension/test/defaultItems.test.mjs`
- Create in asset GREEN: `.gitattributes`
- Modify in asset GREEN: `.gitignore`
- Create in asset GREEN: `extension/items.json`
- Create in executor RED: `host/test_plan_e_evidence.py`
- Create as a compile-only shell in executor RED, then implement in GREEN: `plan_e_evidence.py`
- Modify in promotion RED only: `host/test_update_engine_resume.py`
- Modify in promotion GREEN only: `host/update_engine.py`

The latest correction spec, revised plan, asset test and three asset-production
paths, root CLI, CLI tests, promotion tests, and promotion production are the
ten paths added or edited by this correction sequence. The prior scripted spec
is immutable read-only authority and remains an earlier reviewed-range path;
other earlier Plan E range paths likewise remain reviewed history but are not
edited by this Task 9 correction.

No other product, test, documentation, version, dependency, packaging, release,
installer, or generated path may be edited. The root CLI is internal maintenance
tooling. The Host runtime must not import it, PyInstaller must not collect it,
and release staging must not copy it. The public asset correction authorizes the
asset test plus exact `.gitattributes`, `.gitignore`, and `extension/items.json`
changes; the Windows retry spec authorizes the two promotion paths; executor
paths are internal evidence tooling and tests only. No other product/test path is
authorized.
The asset is a tracked public release/build input, not a generated release
artifact; restoring it is the sole exception to the earlier no-release-assets
wording.
No architecture/user/developer guide change is required because the asset
restores an already-accepted public default and the executor is internal Plan E
tooling; there is no new user workflow or runtime architecture.
Do not update `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`,
or `USER_GUIDE.md` in this correction.
Do not modify the accepted specs; they are immutable reviewed authority inputs.

**Authority and precedence:**

1. `docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md`
   at `1efb528282a2fd6a5c926f09d417a30d72f45897` is authoritative for the
   asset TDD/provenance, Vitest selector identity, exact promotion-class
   restoration, revised chronology, and `70/130` path arithmetic.
2. `docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md`
   at `cba1030baf6508d08d6ce67ac40728ebdd47f199` remains authoritative for the
   tracked CLI and all orchestration not amended above.
3. `docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md`
   remains authoritative for the Task 6/7 loss boundary, audit schemas, review
   criteria, final artifact durability, and historical-claim limits.
4. `docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`
   remains authoritative for the complete retry behavior and TDD matrix.
5. `docs/superpowers/specs/2026-08-21-plan-e-executor-boundary-correction-design.md`
   remains historical authority for independent process ownership and narrow
   RED attestation, except where the latest spec replaces its embedded executor,
   plan subject, producer topology, finalizer behavior, and old path counts.

The primary product authority remains
`docs/superpowers/specs/2026-07-18-whole-branch-important-hardening-design.md`,
Plan E sections 6-10, 11, and 13, narrowed only by the accepted boundary,
evidence-loss, retry, and executor specs above.

For Task 9 only, this section supersedes the earlier global persistent
controller/Step-0 exception and every old plan subject/count. No mutex, lease,
function, environment value, or process handle spans an edit, commit, review, or
separate command. Tasks 1-8 remain byte-identical historical instructions; their
old Task-9 references are non-authoritative for this execution.

The evidence-loss amendment commit is
`d51ca4aabd4a40b91818191424993a8d3ab3cd27`; the Windows retry design commit is
`249b1a3750b50db1336fb39661db9306355a1a18`; the executor-boundary correction is
`d237ab2ea7aee73114476b3eb19db620321d349f`. Preflight binds each full SHA,
subject, path, parent, and ancestry rather than trusting filenames alone. Their
exact subjects are respectively `docs(evidence): define Plan E report-loss
boundary`, `docs(update): define Windows promotion retry`, and
`docs(evidence): correct Plan E executor boundary`.
The latest correction commit is the one-path direct child of the scripted spec
commit `cba1030baf6508d08d6ce67ac40728ebdd47f199`, with exact subject
`docs(extension): define Plan E public asset correction` and
path
`docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md`.
Its full SHA is `1efb528282a2fd6a5c926f09d417a30d72f45897`.

The final evidence set is unchanged from the evidence-loss amendment: 24 fixed
verification artifacts, six exact surviving Task reports, two current-state
Task 6/7 audits, and 26 promotion transcript leaves, for 58 manifest artifacts.
The 24 fixed slots include focused/full/Host/static results, inert promotion
command/mutation provenance snapshots and hash/map/ledger records, both review
packages/diffs, and both findings files. The two legacy-named `.ps1` paths are
comment-only UTF-8 evidence snapshots rendered from fixed command definitions
and observed receipts: the Python CLI writes/hashes them but never invokes,
imports, dot-sources, or treats them as executable authority. Tests parse both
and require zero executable PowerShell statements, functions, or script blocks.
The manifest and final report make the evidence commit exactly 60 paths. The
auxiliary `.superpowers/sdd/current-state-mutation-results.json` is a
receipt-bound candidate used to build focused results and audits, is outside the
58/60 inventories, is removed only after successful final post-validation, and
is preserved on failure.
Producer receipts and Git-common state are internal execution state and never
enter the 58-artifact manifest or 60-path evidence commit.
All machine evidence remains local and deterministic; no remote attestation,
timestamp service, signing service, or network upload is added.
File-content hashes are SHA-256 lowercase hex; Git blob/tree/commit identities
are lowercase 40-hex SHA-1 as used by this repository. Do not interchange them.
The public asset and its Node test are reviewed product/test paths, not members
of the 58/60 evidence sets; final evidence records their committed blobs/build
hashes without duplicating them as artifacts.

The terminal graph contains exactly eight `produce` records plus the two review
ingestion terminal records: `promotion`, `focused-extension`, `full-extension`,
`host`, `static`, `task-audits`, `plan-e-review-package`,
`whole-review-package`, `plan-e-review`, and `whole-review`. `task-audits` owns
the auxiliary current-state mutation candidate within its closed dependency.
The code dependency graph, not receipt-provided strings, selects the exact final
dependency closure.

Producer IDs in state/receipts are exactly the eight CLI `--kind` values;
review-ingestion IDs are exactly `plan-e-review` and `whole-review`. No legacy
short IDs (`focused`, `full`, `audits`, or a review-ingest prefix) are accepted.

Dependencies are fixed: `promotion`, `focused-extension`, `full-extension`, and
`host` have only chronology/source prerequisites; `static` requires focused,
full, and Host results; `task-audits` requires focused, Host, static, and its
owned current mutations; each review package requires frozen audits; each review
ingestion requires its matching package plus both audits; finalization requires
promotion, focused, full, Host, static, audits, both packages, and both review
terminal records for the complete ten-record closure.

Tested-source roots are exactly `extension`, `host`, `tests`, this plan,
`.gitattributes`, `.gitignore`, `release_helper.py`, `plan_e_evidence.py`, `dev_switch.py`,
`installer_core.ps1`, `dyhelper_installer.ps1`, and `install.bat`. The CLI binds
every tracked leaf under those roots to the reviewed-head Git blob; the explicit
root CLI addition is the latest-spec expansion, while its Host test is naturally
covered under `host`.

**Public CLI grammar:**

These are the only public subcommands and producer kinds:

```text
plan_e_evidence.py preflight
plan_e_evidence.py produce --kind promotion --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind focused-extension --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind full-extension --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind host --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind static --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind task-audits --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind plan-e-review-package --reviewed-head 40-lowercase-hex
plan_e_evidence.py produce --kind whole-review-package --reviewed-head 40-lowercase-hex
plan_e_evidence.py ingest-review --kind plan-e --reviewed-head 40-lowercase-hex --session-id opaque-ascii --input absolute-path
plan_e_evidence.py ingest-review --kind whole --reviewed-head 40-lowercase-hex --session-id opaque-ascii --input absolute-path
plan_e_evidence.py retire --old-head 40-lowercase-hex --new-head 40-lowercase-hex
plan_e_evidence.py finalize --reviewed-head 40-lowercase-hex
plan_e_evidence.py verify-final --final-head 40-lowercase-hex
plan_e_evidence.py status
```

Use stdlib `argparse.ArgumentParser` with `allow_abbrev=False`,
`fromfile_prefix_chars=None`, `add_help=False`, and a custom non-exiting error
path. Unknown/duplicate options, omitted required arguments, and extra
positionals never pass through. Help/version is not a separate evidence command;
grammar failures emit canonical `invalid_cli`.
Do not call `sys.exit` inside parsing/handlers; `main` returns the fixed integer
and the module guard performs the single `SystemExit` conversion.

Every invocation writes exactly one canonical JSON object to stdout. Every
object has closed keys, including `schema_version`, `command`, `status`, and
`code`; `schema_version` is exactly integer `1`. Canonical JSON uses
`ensure_ascii=True`, strict UTF-8 without BOM, sorted keys, compact separators,
no CR/non-finite value, and exactly one final LF.
All persisted executor state/receipt records also use schema version `1`; an
unknown version blocks without migration.
No child output, stack trace, arbitrary path content, review text, URL, secret,
or raw exception is written to stdout/stderr; command-specific safe fields are
the only diagnostics.
Exit codes are fixed:

| Exit | Meaning |
|---:|---|
| `0` | Success |
| `2` | Usage or closed CLI grammar failure |
| `3` | Retained, abandoned, malformed, unknown, or incompatible state blocks automation |
| `4` | Evidence, test, audit, review, or final validation failure |
| `5` | Internal execution or I/O failure |

The exact success codes are `preflight_ok`, `state_absent`, `state_ready`,
`producer_succeeded`, `review_ingested`, `head_retired`, `finalized`, and
`final_verified`. A rejected review uses `status: "blocked"`, code
`review_rejected`, and exit `4`. Retained state uses `status: "blocked"`, code
`retained_state`, and exit `3`. Usage uses `status: "error"`, code
`invalid_cli`, and exit `2`. Unexpected internal failure uses `status: "error"`,
code `internal_error`, and exit `5`; it exposes no raw exception text or state
file content.
Validation failures use fixed safe codes from a closed enum beneath the command
result (for example chronology, evidence, test, audit, review, or final); no raw
exception-derived code is accepted.
CLI stdout encoding uses `sys.stdout.buffer.write` with one precomputed canonical
byte string so console encoding/newline translation cannot alter evidence JSON.
Session IDs are the implementation-safe accepted subset
`^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$`; the leading alphanumeric prevents a
value from being interpreted as an option while the remaining shell-safe set
preserves the scripted spec's opaque printable-ASCII claim boundary. Every
observed literal is validated first and then passed inside single quotes.
`finalize` success remains `code: "finalized"` but carries no final commit ID;
the CAS/result is validated internally, and `verify-final` is the only command
that exposes the final head.

`status` returns `state_absent` only when neither lease nor state root exists;
`state_ready` only for a completely strict compatible terminal inventory;
otherwise exit `3`/`retained_state`. It never treats an empty-but-present root,
orphan lease, partial quarantine, or unknown entry as absent/ready.
After finalization, tracked evidence paths do not count as state; only the fixed
Git-common authority paths are classified by `status`.
`status` never reports a producer ready merely because a receipt file exists;
it validates the complete terminal record and candidate hash closure first.
For `state_ready`, canonical JSON includes exact `reviewed_head` for the selected
single-head succeeded/rejected terminal set; for `state_absent` it is null; for
retained/mixed state it is omitted in favor of fixed authority paths. Retirement
accepts `old-head` only from this validated non-null `state_ready.reviewed_head`.

Closed command-specific success fields are fixed as follows: `preflight` adds
authority/chronology/cleanliness summaries; `status` adds classification,
`reviewed_head`, and
sorted authority paths; `produce` adds kind, reviewed head, receipt path, and
candidate hash map; `ingest-review` adds kind, reviewed head, declared session
ID, disposition, receipt/findings/input/package/diff/audit hashes; `retire` adds
old/new heads and retired terminal IDs; `finalize` adds reviewed head,
prospective evidence subject/tree/staged map, exact staged manifest/report
SHA-256 values, and `58/60/130` counts but does not claim the final commit SHA;
`verify-final` adds final head/parent/subject, exact committed manifest/report
SHA-256 values, `58/60/70/130` counts, and exact
`final_commit_validation: "PASS"` / `base_to_final_union_validation: "PASS"`
fields. Tests lock exact key sets and types for every outcome.

**Implementation architecture, without an embedded implementation:**

- Resolve the repository only as `Path(__file__).resolve().parent`; ambient cwd
  is never authority.
- Use only Python standard-library modules. Keep the CLI in one root module,
  with small immutable record types for command definitions, owner/lease state,
  producer receipts, review records, retirement checkpoints, and finalizer
  checkpoints.
- Keep callable boundaries equivalent to `parse_args`, strict canonical JSON
  load/write, path containment, read-only Git, foreground child execution,
  mutex acquisition, preflight, each fixed producer, review ingestion,
  retirement, finalization, final verification, and `main`. Signatures accept
  explicit `Path`, immutable definition, and injected adapter values in unit
  tests; they never accept arbitrary executables, cleanup roots, candidate
  paths, Git operations, or producer IDs.
- Test-facing names/signatures are exact:
  `canonical_json_bytes(value: object) -> bytes`,
  `load_canonical_json(path: Path, schema: RecordSchema) -> dict[str, object]`,
  `parse_cli(argv: Sequence[str]) -> ParsedCommand`,
  `execute_command(command: ParsedCommand, adapters: Adapters) -> CliResult`,
  `emit_result(result: CliResult, stream: BinaryIO) -> None`, and
  `main(argv: Sequence[str] | None = None) -> int`. `RecordSchema`,
  `ParsedCommand`, `CliResult`, `CommandSpec`, `ProducerSpec`, and `Adapters` are
  frozen dataclasses/protocols. The compile-only shell defines these names and
  signatures with inert returns so imports/collection succeed.
- `CliResult` has exact fields `schema_version: int`, `command: str`,
  `status: str`, `code: str`, and `fields: tuple[tuple[str, object], ...]`;
  serialization merges the closed command-specific fields after rejecting key
  collisions. `CommandSpec` binds ID, executable role, argv, cwd role,
  environment, timeout, stdin policy, and output bounds. `ProducerSpec` binds
  ID, dependencies, ordered commands, candidate paths, source roots, worktree
  policy, and validator ID. `Adapters` supplies filesystem, Git, process,
  mutex, clock, and randomness boundaries; production uses stdlib adapters and
  tests provide disposable fakes.
- `status` result schemas explicitly include `reviewed_head: str | None` for
  `state_absent/state_ready`; retirement reads only a validated `state_ready`
  object. Finalizer APIs accept the immutable reviewed-head argument and never
  derive it from current HEAD after CAS. Report inputs intentionally exclude any
  final commit ID, prospective tree, report/manifest Git blob ID, complete staged
  blob map, or report self-hash. The committed report builder's signature
  accepts reviewed head, evidence subject, receipts, validated artifact hashes,
  the exact staged manifest SHA-256, and fixed inventory/readiness contracts
  only; `finalize` output owns prospective tree/index and report-hash reporting,
  while `verify-final` owns final-head reporting.
- Define code constants for every command, producer dependency, executable,
  argv, cwd, environment key, candidate path, source root, test selector, skip
  rule, report heading, review heading, artifact inventory, and commit subject.
  Tests compare the constants with the literal contracts in this plan.
- Keep state only at `GIT_COMMON_DIR/plan-e-evidence-v1.lease.json` and below
  `GIT_COMMON_DIR/plan-e-evidence-v1/heads`, `retirements`, and `finalizer`.
  Head-scoped producer directories contain only `owner.json`, `candidates`, and
  `receipt.json`. Candidate strings in receipts are data, never write/delete
  authority.
- A lease record is closed over schema, command kind, random 32-lowercase-hex
  token, reviewed head, owner path, state root, exact authority paths, and the
  applicable checkpoint. A producer owner additionally binds producer ID,
  source blobs, candidate allowlist, and optional exact worktree registration.
- A command receipt row is closed over ID, absolute executable, exact argv,
  absolute cwd, exact sorted environment, `shell: false`, observed exit code,
  stdin hash or null, and stdout/stderr SHA-256. A succeeded producer receipt is
  closed over schema, producer ID, reviewed head, status, source blobs, command
  rows, candidate SHA-256 map, and optional verified removed-worktree record.
  Numeric fields require exact `int` (never bool); nullable fields distinguish
  absent input from an empty byte stream; list/object orders are definition-
  locked rather than normalized after parsing.
- A rejected review record contains only its fixed review kind, reviewed head,
  input/package/diff/audit hashes, declared session ID, fixed rejection
  classifications, `status: rejected`, and an empty candidate map.
- A finalizer lease is closed over token, kind, reviewed head, expected branch
  ref, checkpoint, candidate hash map, index blob map, prospective commit object,
  expected pre/post ref values, owner path, and quarantine path. Its only legal
  progression is `started -> candidates-validated -> staged -> committed ->
  post-validated`.
  Retained lease validation also binds complete owner, candidate, index, HEAD,
  ref, temporary, and quarantine maps before resume.

This is the complete **State Model**; there is no repository-side state root,
ambient temporary authority, or cross-process in-memory state.

`preflight` and `status` are read-only. They do not acquire the mutation mutex,
create directories, touch the index, refresh filesystem-monitor state, or alter
Git metadata. All pre-lease Git reads use absolute system Git with
`--no-optional-locks` and a closed child environment containing
`GIT_OPTIONAL_LOCKS=0`. Direct Git config parsing must prove that effective
filesystem monitoring is absent or false before any worktree-reading command.
Preflight also proves this is the primary worktree, the exact branch is present,
the tracked source/index is clean, expected evidence outputs are absent or
known compatible terminal candidates, Task 6/7 report paths are absent, six
historical reports match, and no unknown linked worktree registration exists.
It also verifies literal base ancestry, every planning/spec ancestor, Plan A-C
prerequisite report/commit identity, and all Plan D sentinel paths absent.
Unexpected repository-side evidence/output files block; only six frozen reports
and the closed ignored diagnostic allowlist may pre-exist.
The read-only commands snapshot and recheck Git index bytes and relevant common-
directory metadata around their own reads, so a nominally read-only child that
causes refresh side effects fails validation. Read-only failure must not create
the fixed state root merely to report the failure.
All Git reads specify `--no-pager`, noninteractive prompt/credential settings,
and bounded captured output; no command may open an editor, pager, signing UI,
credential prompt, or network transport.
Both read-only commands return fixed classifications on strict-read failure and
never attempt repair, coercion, migration, or a fallback parser.
They do not require Python bytecode writes; set/inherit no bytecode cache output
inside the repository.
Repository config inspection reads fixed local/global/system config files
directly or with no-optional-locks Git and records their hashes where relevant;
a config change before a sensitive operation blocks revalidation.

Every mutating invocation independently acquires one fixed Windows named mutex,
then exclusively creates and durably rereads the fixed lease as its first
filesystem write. The state root may be created only after that reread. An
abandoned mutex, existing incompatible lease, unknown state entry, partial
owner, retained worktree, or malformed receipt blocks without cleanup. The only
automatic retained-state exceptions are exact same-token finalizer checkpoint
resume and clean terminal `rejected` review retirement. All other retained
state requires manual inspection and separate authorization.
Only `finalize` may resume a retained finalizer lease; every other command
reports and blocks without adoption.
Before lease creation, a mutating command performs only the read-only preflight
checks above; once the lease exists, every subsequent write is selected by that
lease/token/owner authority until success cleanup or fail-stop retention.
The lease is a sibling of the state root in the already-existing Git common
directory, so creating the lease never requires creating its parent or the state
root first.
The mutex name is a fixed code constant derived from the canonical repository
identity, not mutable cwd text; tests use a separate random test-only name.
Mutex acquisition is nonblocking for ordinary commands: contention returns
exit `3`/`retained_state` with fixed classification and no mutation. An
abandoned acquisition is never treated as ownership suitable for cleanup.
The ctypes adapter checks every Win32 return/error code, closes handles exactly
once, and never exposes a raw handle outside its context boundary.
On non-Windows, mutating production commands return fixed unsupported/blocking
status rather than emulating the mutex; only read-only verification and tests
with injected adapters may run.
This Plan E evidence execution is therefore Windows-only, matching the target
repository and promotion retry incident; cross-platform evidence execution needs
a separately accepted design.

Before every hook-capable or ref-mutating Git operation, revalidate no effective
hooksPath/non-sample hook, signing side effect, credential/helper invocation, or
attributes-selected filter. Do not bypass or disable hooks. `finalize` does not
run `git commit`; after those checks it writes the index/tree, creates the fixed
commit with `git commit-tree`, and performs the one compare-and-swap
`git update-ref <branch> <new-sha> <reviewed-head>` transition.
The finalizer's Git object/ref operations use the same closed environment and
validated absolute Git executable as read-only operations, with only fixed
author/committer values inherited from already-validated local repository config.
Effective `.gitattributes` for every reviewed/evidence path must not select a
clean/smudge/process filter, working-tree encoding, or other byte-transforming
rule; line-ending config is recorded and blob comparisons remain authoritative.

Child processes use `subprocess.run(..., shell=False)`, absolute executables,
fixed cwd, and a closed environment. Remove `PYTHONPATH`, `PYTHONHOME`,
`NODE_OPTIONS`, all unapproved `GIT_*`, all `NPM_CONFIG_*`, and all inherited
environment names with the Plan-E control prefix, plus all other inherited
evidence-control values unless one fixed producer supplies a reviewed safe
value. Every Host child receives six distinct, existing, disposable directories
for `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP`. The
parent environment is byte-for-byte unchanged.
Every child has a fixed command-specific timeout; timeout terminates and waits
for the exact child/process tree through the injected process adapter before
retaining state. No detached descendant is permitted. Use argument arrays only;
no command line is joined and reparsed through a shell.
The fixed command environments retain only validated system variables required
for process startup plus the explicit producer values; every recorded key/value
is sorted and presence-aware, including explicit removal of forbidden values.
Python children set `PYTHONDONTWRITEBYTECODE=1`; no `__pycache__` may appear in
source or owned candidate trees.
Captured stdout/stderr are bounded by fixed per-command limits; overflow
terminates validation with safe code `internal_error`, records hashes only when
complete, and retains ownership state without echoing potentially sensitive
child output.

Audit, report, findings, receipt, lease, and manifest parsers use closed
schema-version-1 shapes unless the latest spec explicitly names a different
version. They reject unknown/missing keys, duplicate keys, non-finite values,
bool-as-int, wrong enum/type/order/cardinality, malformed hashes, and
noncanonical bytes. Audit generation and validation recompute Git lineage,
trees, subjects, parents, numstat, source blobs, evidence hashes, selectors,
assertions, and mutation restoration rather than trusting producer prose.

Candidate publication uses same-directory `os.link(temporary, target)` after
exclusive write, file flush/fsync, parent durability handling, reread, and hash
validation. Existing targets,
unsupported hard links, collisions, and concurrent publication fail closed;
`os.replace` is forbidden for immutable candidate publication. Only finalization
materializes non-historical candidates at fixed `.superpowers/sdd` paths. The
six surviving reports are immutable read-only exceptions and are force-added
from their existing exact bytes.
Require temporary and target `st_dev` equality and link count/inode identity
where supported; any cross-volume or unsupported identity check blocks.

All state paths come from a closed code map, are resolved beneath their fixed
authority root, and reject symlink/reparse hazards. Canonical state transitions
use no-overwrite publication where immutable and durable same-directory
replacement only for an already-owned mutable lease/checkpoint. Receipt data
never selects a filesystem authority. Token-bearing temporary names and allowed
relative children are derived from that closed map and owner record; cleanup
rejects unlisted children or token/path mismatch rather than inferring ownership.
Strict readers bound file sizes before allocation and reject directories,
hard-link surprises where identity matters, sparse/unsupported entries, and
content changes between stat/read/reread checks.
All repository-relative serialized paths use `/`, reject `.`/empty components,
drive/UNC forms, trailing separators, alternate data streams, reserved Windows
device names, and casefold collisions.

Before any producer, validate the complete known state inventory: every prior
record is an exact terminal `succeeded` or `rejected` record at a compatible
head, every succeeded candidate is present/hash-exact, and there is no unknown
entry, lease, owner, temporary, quarantine, or registration. This permits
sequential independent producers without treating compatible completed state as
a crash. The closed dependency graph enforces producer ordering.

Only `promotion` and `task-audits` may create detached linked worktrees. The
owner record binds token, normalized absolute path, exact detached head,
allowed mutation paths, original blobs, and expected mutated hashes. Removal is
non-force and occurs only after exact registration, head, restored blobs, and
clean status are revalidated. Pruning worktree registrations, force removal,
automatic reset, broad cleanup, push, publish, tag, install, registry mutation,
browser operation, network operation, authenticated operation, and real updates
are forbidden.

### 9.2 Authority and Chronology Preflight

- [ ] **Step 1: Verify the current authority before changing the plan**

The current branch must be `docs/prompt-scope-cleanup-design`, and current HEAD
must resolve exactly to `1efb528282a2fd6a5c926f09d417a30d72f45897`
with subject `docs(extension): define Plan E public asset correction`. That
commit changed only the latest correction spec and has parent
`cba1030baf6508d08d6ce67ac40728ebdd47f199`.
Resolve every abbreviated historical identifier through Git and store/compare
only full 40-hex SHAs; abbreviations in immutable report prose are display only.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD
```

Expected stdout: exactly
`1efb528282a2fd6a5c926f09d417a30d72f45897`.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" status --short
```

Before this documentation revision is committed, the only permitted line is the
target plan. Before asset RED starts, output must be empty.

- [ ] **Step 2: Commit this revised plan as the sole direct child**

The revised plan commit changes exactly
`docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md`, has parent
`1efb528282a2fd6a5c926f09d417a30d72f45897`, and has exact subject
`docs(update): integrate Plan E build prerequisites`.
This documentation edit itself is made with `apply_patch`; no product/test file
is touched before the plan commit.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

Before each commit command in this task, compare
`git diff --cached --name-only --no-renames` with that step's exact path
allowlist and stop on any missing/extra path. Never use `git add .`.
Also require unstaged diff contains only the same allowlist before staging.
The executor RED allowlist is the two sorted paths named in Step 3; each other
code/document commit allowlist is its one named path; finalization alone owns
the literal 60-path staging set.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "docs(update): integrate Plan E build prerequisites"
```

Do not hold an evidence mutex during this commit or any later code-edit/commit
cycle. Before asset RED, reread the plan commit parent, subject, one-path diff,
clean tracked worktree, and empty index directly from Git.

The required direct single-parent sequence after that plan commit is exact:

1. One-path public asset RED, subject
   `test(extension): define Plan E public default asset`.
2. Exact three-path public asset GREEN, subject
   `fix(extension): restore public default asset`.
   Paths are exactly `.gitattributes`, `.gitignore`, and
   `extension/items.json`; `extension/test/defaultItems.test.mjs` remains the
   unchanged RED-commit blob.
3. Two-path executor RED, subject
   `test(evidence): define Plan E executor contracts`.
4. One-path executor implementation, subject
   `feat(evidence): add Plan E evidence executor`.
5. One-path promotion RED, subject
   `test(update): cover locked preparing promotion`.
6. One-path promotion implementation, subject
   `fix(update): retry locked preparing promotion`.
7. Optional focused fixes only under separately accepted specs, closed path
   allowlists, fixed subjects, and fresh RED/GREEN/mutation evidence. Any such
   fix invalidates and regenerates every producer, audit, and review. The
   accepted correction spec fixes each subject exactly before the edit; no
   generic subject pattern authorizes a fix. Adding any reviewed path requires a
   new accepted path-count amendment before editing.
   A fix may change only paths already in the 70-path reviewed list unless that
   amendment explicitly expands the list.
8. Exact 60-path final evidence child, subject
   `docs(verification): record Plan E hardening evidence`.

The latest correction commit itself is the one-path direct child of
`cba1030baf6508d08d6ce67ac40728ebdd47f199`, with its exact path/subject above;
preflight validates both correction and scripted authorities before future
children.

Asset RED is the direct child of the plan revision; asset GREEN is its direct
child; executor RED is the direct child of asset GREEN; executor implementation
is its direct child; promotion RED is the direct child of executor
implementation; promotion implementation is the direct child of promotion RED.
With no optional fix, final evidence is the direct child of promotion
implementation. With an accepted fix, every fix remains a single-parent
descendant and final evidence is the child of the last reviewed fix head.

The executor implementation must be GREEN and complete its seven mutation
checks before promotion RED begins. The promotion RED commit must contain the
new tests while `host/update_engine.py` remains byte-identical to its parent.
The implementation commit must leave the RED test blob unchanged.
Asset GREEN/build must be committed and clean before executor RED begins; the
executor tests bind its exact asset/test/attributes/ignore blobs.

This is the complete **Commit Sequence**. No squash, amend, merge, reordered
parent, extra path, or unaccepted interstitial commit is permitted.
Each commit is created only by its explicit command after exact staged allowlist
and diff-check gates; do not amend any commit.
Do not commit, tag, or push any evidence candidate before `finalize`; the only
pre-final commits are the plan, two asset TDD commits, two executor TDD commits,
two promotion TDD commits, and separately accepted fixes.

**Locked historical report contract:**

| Task | Required path state | Required SHA-256 |
|---:|---|---|
| 1 | Present, immutable | `678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba` |
| 2 | Present, immutable | `edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7` |
| 3 | Present, immutable | `5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591` |
| 4 | Present, immutable | `5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2` |
| 5 | Present, immutable | `323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73` |
| 6 | `.superpowers/sdd/task-6-report.md` absent | `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef` remains the expected unavailable identity |
| 7 | `.superpowers/sdd/task-7-report.md` absent | `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f` remains the expected unavailable identity |
| 8 | Present, immutable | `3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b` |

If either Task 6/7 report path reappears with its exact locked hash, stop and
revise the evidence contract before combining it with audits. If the optional
recovery diagnostic exists, it is read-only and must hash to
`0c2905ea665ee190cd9725c63385e402dcdf490e71154097b2285fd674d1266f`.

The six present reports are the only pre-existing final-evidence paths. Before
finalization, require them untracked/unstaged and exact; after finalization they
must be tracked in the evidence commit with identical blobs. The two absent
paths never enter the manifest or commit.
All eight expected report hashes remain present in authority/report metadata;
only six have available bytes and final paths.
The current immutable reports themselves are never rewritten to mention the new
executor; their exact old bytes are evidence inputs.

### 9.3 Public Asset TDD Prerequisite

- [ ] **Step 1: Add only the canonical public-asset contract test**

Use `apply_patch` to create only
`extension/test/defaultItems.test.mjs` from canonical commit
`60ee0f2b7ca6784ca12dba8c2bbe66ce338fdef5`. Its exact Git blob is
`a43893359255c5e1573fdee19569f8cd20dde73f`; canonical blob-byte SHA-256 is
`b2c4f1e291dbc1862f8ae3a9f1bbaffc7483345b09ccd8d45767f9f7eaa9ce39`;
size is 7,357 bytes, 208 LF lines, no BOM, final LF. Read bytes via
`git show`, verify blob ID and SHA-256 through `git cat-file blob`, then apply
those exact bytes. While RED, `.gitattributes` and `extension/items.json` remain
absent and `.gitignore` still has exactly one standalone `items.json` line.

```powershell
& "C:\Program Files\nodejs\node.exe" --test "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\test\defaultItems.test.mjs"
```

Expected RED: Node collects all five tests; failures are caused by missing
`extension/items.json` during test execution, not syntax/import/zero-collection
failure. Exit is `1`, output includes five collected tests and missing-file
diagnostics. Before commit, require sole dirty/untracked path is the test,
`git check-ignore` confirms the missing asset name is still ignored, and staged
blob equals `a43893359255c5e1573fdee19569f8cd20dde73f`.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "extension/test/defaultItems.test.mjs"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "test(extension): define Plan E public default asset"
```

Expected: direct one-path child of the revised plan, exact subject/path/blob,
asset and attributes still absent, `.gitignore` unchanged, clean index/status.

- [ ] **Step 2: Restore exact public asset and LF contract**

Use `apply_patch` only:

1. Create `extension/items.json` from canonical commit
   `6e501b536cb2693d68bb7d2ece38544ae3ad5c1d`, exact blob
   `2fa48bf2a60af716c36ed9ee9f80ed83af3e0530`, SHA-256
   `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`,
   692 bytes, 28 LF lines, no BOM, final LF.
2. Create `.gitattributes` with exactly one line
   `extension/items.json text eol=lf` plus LF, blob
   `f40b738f6e25d1e45d6400414b3bad8536138712`, SHA-256
   `2be83d22f91add38d54a1eda87fa02e3654c9fec3375d5fc72792a7094db6bda`.
3. Modify current `.gitignore` only by deleting its one exact standalone
   `items.json` line. All other bytes remain unchanged. Resulting blob is
   `c7ac6d30d14a7294a13932c0a055fb4dba498bcf`, SHA-256
   `80ecafcfe55f95ab0c3141c3bf2b5c01a4e143593471a27fd939762307a67c40`,
   499 bytes, 51 LF lines, final LF.

Do not copy canonical `.gitignore`, private/local/ignored/rescued menu data, or
canonical `Options.collapseFolders.test.ts`. The asset has exactly the five
public nodes/credential-free GitHub URLs and canonical JSON enforced by the test.

```powershell
& "C:\Program Files\nodejs\node.exe" --test "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\test\defaultItems.test.mjs"
```

Expected GREEN: exactly five tests pass, zero fail, exit `0`.

Run the network-inert production build with absolute local executables. TypeScript:

```powershell
& "C:\Program Files\nodejs\node.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\node_modules\typescript\bin\tsc" --noEmit --tsBuildInfoFile "C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-asset-tsbuildinfo" -p "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\tsconfig.json"
```

Vite build:

```powershell
& "C:\Program Files\nodejs\node.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\node_modules\vite\bin\vite.js" build "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension" --config "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\vite.config.ts" --configLoader runner --emptyOutDir
```

Expected: both exit `0`; no npm/npx/network fallback. Verify
`extension/dist/items.json` exists and its bytes/blob-byte SHA-256 equal source
and `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`.
Verify source/test/attributes canonical blob IDs with `git hash-object` and
`git cat-file blob`; verify `.gitignore` differs from its parent only by that
one deleted line.

Stage exactly `.gitattributes`, `.gitignore`, and `extension/items.json`; the
asset test remains byte-identical to its RED commit and is not restaged.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- ".gitattributes" ".gitignore" "extension/items.json"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "fix(extension): restore public default asset"
```

Expected: direct child of asset RED; exact three paths/subjects/blobs; test blob
unchanged; five tests/build/source-dist hash rerun GREEN from committed head;
clean tracked worktree, empty index, and no extra asset/menu path.

### 9.4 Exact Path Inventories

The literal Plan E integration base is
`0dbb4852931b50153fb898b03129ae0092c46404`. At the reviewed product/tool head,
`git diff --name-only --no-renames` from that base must equal this exact sorted,
unique 70-path list. The CLI constants and tests enforce it; the Markdown does
not implement the validator.

<!-- PLAN_E_REVIEWED_PATHS_START -->
```text
.gitattributes
.gitignore
docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md
docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md
docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md
docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md
docs/superpowers/specs/2026-08-21-plan-e-executor-boundary-correction-design.md
docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md
docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md
extension/items.json
extension/src/background/analyzeBridge.test.ts
extension/src/background/analyzeBridge.ts
extension/src/background/analyzeRequestHandler.test.ts
extension/src/background/analyzeRequestHandler.ts
extension/src/background/contextMenu.test.ts
extension/src/background/contextMenu.ts
extension/src/background/nativeMessageWire.test.ts
extension/src/background/nativeMessageWire.ts
extension/src/background/resetExtensionState.test.ts
extension/src/background/serviceWorker.ts
extension/src/background/teamManifestSync.test.ts
extension/src/background/teamManifestSync.ts
extension/src/components/FAB.analyzeRequest.test.tsx
extension/src/components/FAB.bookmarkTelemetry.test.tsx
extension/src/components/FAB.pageIdentity.test.tsx
extension/src/components/FAB.promptSourceErrors.test.tsx
extension/src/components/FAB.rootPathOverride.test.ts
extension/src/components/FAB.spinner.test.tsx
extension/src/components/FAB.tsx
extension/src/components/FAB.userPrompt.test.tsx
extension/src/components/MenuLogic.teamCache.test.ts
extension/src/components/MenuLogic.ts
extension/src/components/Options.collapseFolders.test.ts
extension/src/components/Options.test.tsx
extension/src/components/Options.tsx
extension/src/components/ResultPopover.test.tsx
extension/src/components/ResultPopover.tsx
extension/src/content/index.tsx
extension/src/content/updateErrorBridge.test.ts
extension/src/content/updateErrorBridge.ts
extension/src/hooks/useAnalysisHydration.test.ts
extension/src/hooks/useAnalysisHydration.ts
extension/src/test/chromeMock.ts
extension/src/utils/analysisStore.test.ts
extension/src/utils/analysisStore.ts
extension/src/utils/analyzeRequest.test.ts
extension/src/utils/analyzeRequest.ts
extension/src/utils/bookmarkItems.test.ts
extension/src/utils/bookmarkItems.ts
extension/src/utils/configUpdateResult.test.ts
extension/src/utils/configUpdateResult.ts
extension/src/utils/nativeUpdateError.test.ts
extension/src/utils/nativeUpdateError.ts
extension/src/utils/ownData.test.ts
extension/src/utils/ownData.ts
extension/src/utils/pageIdentity.test.ts
extension/src/utils/pageIdentity.ts
extension/src/utils/prefs.ts
extension/src/utils/promptSourceErrors.test.ts
extension/src/utils/promptSourceErrors.ts
extension/src/utils/teamCatalog.test.ts
extension/src/utils/teamCatalog.ts
extension/src/utils/translations.ts
extension/test/defaultItems.test.mjs
host/dh_native_host.py
host/test_plan_e_evidence.py
host/test_session_workspace.py
host/test_update_engine_resume.py
host/update_engine.py
plan_e_evidence.py
```
<!-- PLAN_E_REVIEWED_PATHS_END -->

Expected read-only checks at the reviewed head:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --name-only --no-renames "0dbb4852931b50153fb898b03129ae0092c46404..HEAD"
```

Expected: exactly the 70 lines above, in bytewise order after sorting, with no
version/dependency path and no Plan D sentinel.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --check "0dbb4852931b50153fb898b03129ae0092c46404..HEAD"
```

Expected: exit `0`, empty stdout/stderr.

The exact final 58-artifact manifest follows. The auxiliary current-state
mutation candidate is deliberately absent.
The two findings files are among the 24 fixed slots, so review durability does
not increase the 58 count.

<!-- PLAN_E_ARTIFACT_PATHS_START -->
```text
.superpowers/sdd/focused-extension-results.json
.superpowers/sdd/full-extension-results.json
.superpowers/sdd/host-test-results.json
.superpowers/sdd/invoke-promotion-test.ps1
.superpowers/sdd/original-whole-branch-interim-review-findings.md
.superpowers/sdd/original-whole-branch-interim-review-package.txt
.superpowers/sdd/original-whole-branch-interim-review.diff
.superpowers/sdd/plan-e-only-review-findings.md
.superpowers/sdd/plan-e-only-review-package.txt
.superpowers/sdd/plan-e-only-review.diff
.superpowers/sdd/promotion-ast.sha256
.superpowers/sdd/promotion-executor.sha256
.superpowers/sdd/promotion-green-source.sha256
.superpowers/sdd/promotion-green.sha256.json
.superpowers/sdd/promotion-ledger.json
.superpowers/sdd/promotion-mutation-runner.sha256
.superpowers/sdd/promotion-mutation-source.sha256
.superpowers/sdd/promotion-mutation.sha256.json
.superpowers/sdd/promotion-observed.json
.superpowers/sdd/promotion-red-source.sha256
.superpowers/sdd/promotion-red.sha256.json
.superpowers/sdd/promotion-transcripts.sha256.json
.superpowers/sdd/promotion-transcripts/green/test_non_windows_or_unlisted_promotion_errors_are_not_retried.txt
.superpowers/sdd/promotion-transcripts/green/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_hooks_wrap_the_logical_operation_once.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/green/test_update_engine_constructor_signature_remains_frozen.txt
.superpowers/sdd/promotion-transcripts/green/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/green/test_windows_sharing_errors_32_and_33_are_retryable.txt
.superpowers/sdd/promotion-transcripts/mutation-bound/test_persistent_windows_promotion_lock_stops_after_three_attempts.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-bound/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/mutation-classification/test_windows_access_denied_retries_atomic_preparing_promotion.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-classification/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/mutation-initial/test_preparing_promotion_revalidates_before_and_after_sleep.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-initial/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/mutation-post-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-post-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/mutation-pre-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-pre-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/red/test_non_windows_or_unlisted_promotion_errors_are_not_retried.txt
.superpowers/sdd/promotion-transcripts/red/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_hooks_wrap_the_logical_operation_once.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/red/test_update_engine_constructor_signature_remains_frozen.txt
.superpowers/sdd/promotion-transcripts/red/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/red/test_windows_sharing_errors_32_and_33_are_retryable.txt
.superpowers/sdd/reviewed-head-verification.json
.superpowers/sdd/run-promotion-mutations.ps1
.superpowers/sdd/task-1-report.md
.superpowers/sdd/task-2-report.md
.superpowers/sdd/task-3-report.md
.superpowers/sdd/task-4-report.md
.superpowers/sdd/task-5-report.md
.superpowers/sdd/task-6-audit-evidence.json
.superpowers/sdd/task-7-audit-evidence.json
.superpowers/sdd/task-8-report.md
```
<!-- PLAN_E_ARTIFACT_PATHS_END -->

The exact sorted 60-path staged and committed set follows. It is the 58 paths
above plus the manifest and report, written literally so tests can compare both
inventories rather than trusting arithmetic alone.

<!-- PLAN_E_FINAL_EVIDENCE_PATHS_START -->
```text
.superpowers/sdd/final-artifacts.sha256.json
.superpowers/sdd/focused-extension-results.json
.superpowers/sdd/full-extension-results.json
.superpowers/sdd/host-test-results.json
.superpowers/sdd/invoke-promotion-test.ps1
.superpowers/sdd/original-whole-branch-interim-review-findings.md
.superpowers/sdd/original-whole-branch-interim-review-package.txt
.superpowers/sdd/original-whole-branch-interim-review.diff
.superpowers/sdd/plan-e-extension-hardening-report.md
.superpowers/sdd/plan-e-only-review-findings.md
.superpowers/sdd/plan-e-only-review-package.txt
.superpowers/sdd/plan-e-only-review.diff
.superpowers/sdd/promotion-ast.sha256
.superpowers/sdd/promotion-executor.sha256
.superpowers/sdd/promotion-green-source.sha256
.superpowers/sdd/promotion-green.sha256.json
.superpowers/sdd/promotion-ledger.json
.superpowers/sdd/promotion-mutation-runner.sha256
.superpowers/sdd/promotion-mutation-source.sha256
.superpowers/sdd/promotion-mutation.sha256.json
.superpowers/sdd/promotion-observed.json
.superpowers/sdd/promotion-red-source.sha256
.superpowers/sdd/promotion-red.sha256.json
.superpowers/sdd/promotion-transcripts.sha256.json
.superpowers/sdd/promotion-transcripts/green/test_non_windows_or_unlisted_promotion_errors_are_not_retried.txt
.superpowers/sdd/promotion-transcripts/green/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_hooks_wrap_the_logical_operation_once.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/green/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/green/test_update_engine_constructor_signature_remains_frozen.txt
.superpowers/sdd/promotion-transcripts/green/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/green/test_windows_sharing_errors_32_and_33_are_retryable.txt
.superpowers/sdd/promotion-transcripts/mutation-bound/test_persistent_windows_promotion_lock_stops_after_three_attempts.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-bound/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/mutation-classification/test_windows_access_denied_retries_atomic_preparing_promotion.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-classification/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/mutation-initial/test_preparing_promotion_revalidates_before_and_after_sleep.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-initial/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/mutation-post-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-post-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/mutation-pre-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.restored-green.txt
.superpowers/sdd/promotion-transcripts/mutation-pre-sleep/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/red/test_non_windows_or_unlisted_promotion_errors_are_not_retried.txt
.superpowers/sdd/promotion-transcripts/red/test_persistent_windows_promotion_lock_stops_after_three_attempts.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_hooks_wrap_the_logical_operation_once.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_revalidates_before_and_after_sleep.txt
.superpowers/sdd/promotion-transcripts/red/test_preparing_promotion_revalidation_rejects_every_authority_mismatch.txt
.superpowers/sdd/promotion-transcripts/red/test_update_engine_constructor_signature_remains_frozen.txt
.superpowers/sdd/promotion-transcripts/red/test_windows_access_denied_retries_atomic_preparing_promotion.txt
.superpowers/sdd/promotion-transcripts/red/test_windows_sharing_errors_32_and_33_are_retryable.txt
.superpowers/sdd/reviewed-head-verification.json
.superpowers/sdd/run-promotion-mutations.ps1
.superpowers/sdd/task-1-report.md
.superpowers/sdd/task-2-report.md
.superpowers/sdd/task-3-report.md
.superpowers/sdd/task-4-report.md
.superpowers/sdd/task-5-report.md
.superpowers/sdd/task-6-audit-evidence.json
.superpowers/sdd/task-7-audit-evidence.json
.superpowers/sdd/task-8-report.md
```
<!-- PLAN_E_FINAL_EVIDENCE_PATHS_END -->

The reviewed set and final evidence set must be disjoint. Therefore the literal
base-to-final union is exactly `70 + 60 = 130` unique paths. The CLI must compute
all three lists from Git and its constants and reject missing, extra, duplicate,
unsorted, renamed, pre-existing evidence, or overlapping paths.
Every duplicate inventory occurrence is eliminated in this revised Task 9: the
three marked lists above are the sole Markdown copies, and CLI tests compare
each code constant directly with its one marked source.

### 9.5 Executor TDD

- [ ] **Step 1: Create the full test module and compile-only CLI shell**

Create `host/test_plan_e_evidence.py` first. It may import the root CLI through
`importlib.util.spec_from_file_location` so the production module remains
outside Host runtime imports. All tests use disposable directories and
disposable Git repositories; tests never point a mutation adapter at this real
worktree. Patch adapters only at unavoidable Windows/Git/process boundaries,
and use real filesystem/Git behavior in disposable roots for everything else.
Test fixtures/helpers remain private in this one test module; do not add fixture
files, golden files, scripts, or committed sample repositories.
Create both RED files with `apply_patch`; no generated or editor-side file write
may add a third path.

Create `plan_e_evidence.py` in the same RED edit with only imports, public
constants/types/signatures, `main(argv: Sequence[str] | None = None) -> int`, and
the `if __name__ == "__main__": raise SystemExit(main())` entry point. Every
stubbed callable returns an inert sentinel or syntactically valid canonical JSON
with intentionally wrong `status/code`; do not raise from a behavior reached by
these tests. It must compile and import. It must not create state, launch
children, or partially implement behavior. Collection/import or raw exception
errors are invalid RED.
The shell includes all exact dataclasses/protocols/functions named in section
9.1; it does not omit an interface and rely on dynamic test lookup failure.

Use exactly these classes and test methods. Each method owns one spec contract;
table-driven cases collect row diagnostics and end in one aggregate assertion so
the compile-only shell produces exactly one failure per method. Do not use
independently failing `subTest` rows during the locked RED, and do not multiply
overlapping method names.

The seven mutation-proof methods are present in RED but use the inert shell as
their expected precondition and finish with one assertion that the real
mutation/restoration contract is not yet available. After GREEN, the same
methods perform the temporary source mutation and restoration proof; no test is
added after the two-path RED commit.

Because those methods intentionally fail before the implementation exists and
pass by actually catching/restoring a broken implementation afterward, they
provide both the locked RED count and current mutation proof without editing the
test file in the implementation commit.
Each helper locks one exact implementation transformation string/AST site in its
test fixture; no ad hoc mutation selected at runtime is accepted.

**`CliContractTests`**

Exact method count: `12`.

- `test_cli_grammar_accepts_only_fixed_commands_and_producer_kinds`: accepted
  argv are the exact grammar in section 9.1. Reject missing/extra options,
  uppercase or short heads, arbitrary producer/review kinds, arbitrary command
  strings, duplicate options, relative review input, and options on
  `preflight/status`. Assert exit `2`, canonical stdout, `status: "error"`, and
  `code: invalid_cli` for every rejected row. Assert parser abbreviation,
  response files, help/version pseudo-evidence, and unknown pass-through are
  disabled.
  Reject either literal session marker and the pre-CAS reviewed-head marker if
  the controller fails to replace it.
  On Windows, absolute review input accepts drive-qualified regular paths only;
  reject relative, UNC/device, alternate-stream, and repository-contained paths.
- `test_every_command_emits_one_canonical_json_object_and_fixed_exit_code`:
  invoke success, usage, retained-state, validation-failure, and injected-I/O
  fixtures; assert one stdout object, no extra line, exact required keys and
  closed command-specific keys, integer schema version `1`, empty successful
  stderr, fixed safe failure stderr policy, and exits `0/2/3/4/5` respectively.
  Inject secret markers into child output, exception text, URLs, review input,
  and state content; none may appear in stdout/stderr.
  Command-specific validation classification uses only the closed safe-code
  enum, never exception-derived text.
  Patch text stdout encoding/newline behavior and require direct binary write of
  one canonical byte string.
- `test_cli_main_maps_only_known_failures_and_releases_resources_in_finally`:
  table-drive usage, blocked, validation, I/O, and unexpected internal failures;
  require exact exits/codes, one safe stdout object, no traceback, child/mutex/
  file handles closed in `finally`, and no conversion of interrupt/termination
  signals into success.
  Fixed command timeouts and process-tree termination/await behavior are part of
  the known internal-failure mapping.
  Parser/handlers return integers and do not call `sys.exit`; only the module
  guard converts `main()` to `SystemExit`.
- `test_review_session_cli_grammar_uses_shell_safe_subset`: accept exactly
  `^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$`; explicitly reject leading
  hyphen (including `-x` and `--option`), leading punctuation from the remaining
  safe set, apostrophe, quote, backtick, dollar, semicolon, pipe, ampersand,
  parentheses, controls, whitespace, Unicode, empty, and over-limit values
  before any state mutation. Accept one-character alphanumeric IDs and
  alphanumeric-leading values containing every permitted remaining character.
  Invoke the parser with representative accepted/rejected literals as distinct
  argv elements to prove no value is reparsed as an option or shell syntax.
  Exercise both the split pair `--session-id -x` and attached
  `--session-id=-x`; both return canonical `invalid_cli` before mutation. Include embedded `$`, backtick,
  apostrophe, double quote, semicolon, pipe, ampersand, and parentheses rows. The
  two accepted IDs must differ exactly.
- `test_preflight_binds_exact_direct_commit_chronology_and_path_scopes`: build
  valid and one-axis-mutated Git histories. Require latest-spec -> one-path plan
  -> one-path asset RED -> three-path asset GREEN -> two-path executor RED ->
  one-path executor implementation -> one-path promotion RED -> one-path
  promotion implementation, exact subjects/parents/paths, asset test unchanged
  from asset RED through asset GREEN, root CLI unchanged from executor RED
  through promotion RED except its one implementation commit, promotion
  production unchanged through promotion RED, promotion test unchanged through
  implementation, and later fixes only
  under separately accepted specs/closed allowlists. Reject merge, reordered,
  missing, extra, or later rewritten protected commits.
  Require every commit has exactly one parent and the reviewed head is the exact
  tail after any separately accepted fixes.
  Require plan revision direct parent is the full latest-spec SHA and exact one
  plan path; no older correction plan subject/path is accepted.
- `test_preflight_requires_canonical_branch_repo_tools_and_clean_source`:
  reject wrong branch, secondary worktree, repository identity/path mismatch,
  detached HEAD, dirty tracked source, nonempty index, changed tested-source
  blob, Plan D sentinel, version/dependency delta, unsafe/reparse tool, and
  unexpected evidence output. Unrelated ignored diagnostics are accepted only
  through the fixed read-only diagnostic allowlist. Also reject missing literal
  base ancestry, planning/spec/Plan A-C prerequisite drift, and any Plan D
  sentinel.
  Require no unexpected tracked/untracked evidence path in the repository; the
  six historical reports and approved ignored diagnostics are the only initial
  exceptions.
  During TDD commit gates, an untracked path outside the exact current allowlist
  is also rejected.
- `test_tested_source_roots_and_reviewed_blobs_are_exact`: enumerate every
  tracked leaf under the fixed tested-source roots, including root CLI and Host
  executor test; compare working hash to reviewed-head blob, reject missing/
  extra root or leaf, dirty tested source, and later protected-path rewrite.
- `test_preflight_requires_six_report_hashes_and_task_6_7_absence`: table-drive
  each surviving report missing/hash drift, either absent report appearing, and
  the optional recovery diagnostic with correct/incorrect hash. Correct optional
  diagnostic is cited but never promoted; every mismatch blocks read-only.
- `test_recovered_exact_task_6_or_7_report_requires_contract_revision`:
  place either exact locked historical report at its absent path; preflight and
  every mutating command block before state creation rather than combining it
  with audits or deleting/retiring it. Wrong bytes also block as unexpected.
- `test_repository_root_is_script_relative_not_ambient_cwd`: invoke the copied
  CLI from an unrelated cwd; assert it resolves the disposable repository that
  contains the copied script and never reads/writes the unrelated cwd.
- `test_producer_maps_and_command_constants_are_exact`: compare every producer
  ID, dependency, command ID, absolute tool role, argv, cwd role, source root,
  candidate allowlist, selector, skip rule, and final report/review heading with
  this plan and the accepted specs. Assert arbitrary executables, candidate
  paths, cleanup roots, Git operations, and command substitutions have no CLI
  grammar. Fixed absolute executables resolve to Host venv Python, system Git,
  system Node, and checked-in local Node entry points only; tests reject PATH
  substitution, npm/npx fallback, or drift. Every Vitest command with cwd at the
  repository root uses exact argv `--root extension --config vitest.config.ts`;
  reject an omitted config, a config path with the root redundantly prefixed, or
  any other root/config pairing. JSON reporter output uses the exact token-owned
  `--outputFile.json=<absolute-path>` argument.
- `test_public_types_and_function_signatures_are_exact`: inspect the shell and
  GREEN module for the section 9.1 dataclasses/protocols/functions, exact
  annotations/defaults/fields/frozen status, `main` return contract, and no
  extra public callable/type; this fails by assertion on inert shell behavior,
  not import/attribute error.

**`CanonicalJsonTests`**

Exact method count: `3`.

- `test_canonical_json_round_trip_is_byte_exact`: accepted object encodes as
  ASCII-escaped strict UTF-8, no BOM/CR, sorted keys, compact separators, one LF, and strict reread
  returns the same value.
- `test_canonical_json_rejects_duplicate_unknown_missing_and_noncanonical_data`:
  table-drive duplicate keys, unknown/missing keys, `NaN`/infinity, BOM, invalid
  UTF-8, CRLF, pretty spacing, missing/double final LF, uppercase/malformed
  hashes, negative counters, bool-as-int, wrong list order, and duplicate list
  members; each is exit `3` for retained state or `4` for external evidence,
  never coerced.
  Distinguish lowercase 40-hex Git IDs from lowercase 64-hex SHA-256 by field;
  reject swapped lengths/types.
- `test_random_token_is_exact_128_bit_lowercase_hex`: inject deterministic 16
  random bytes and require exactly 32 lowercase hex characters; reject short,
  long, uppercase, non-hex, bool/integer, or reused tokens before lease write.
  Production randomness is `secrets.token_hex(16)` or equivalent stdlib CSPRNG.

**`PathSafetyTests`**

Exact method count: `2`.

- `test_authority_paths_reject_escape_alias_case_separator_and_reparse`:
  table-drive `..`, absolute injection, prefix sibling, case-fold alias,
  separator alias, symlink/reparse owner/root/parent/descendant, unsupported file
  type, oversize state, content race, and resolved containment escape. Assert no
  write/delete/Git mutation. Also reject dot/empty/trailing components, drive/
  UNC, alternate data stream, reserved Windows device, and casefold collision.
- `test_receipt_strings_never_authorize_writes_or_deletes`: place an outside
  victim path in candidate, owner, worktree, and quarantine string fields;
  strict validation blocks and the victim bytes remain unchanged.

**`ReadOnlyCommandTests`**

Exact method count: `6`.

- `test_preflight_and_status_are_read_only_and_index_byte_exact`: snapshot HEAD,
  ref files, index bytes, worktree registration, tracked status, untracked
  sentinels, and Git common-directory entries before/after both commands. Assert
  exact identity and no mutation mutex acquisition or directory creation.
  `status` strict-reads only known authority paths, reports exact fixed
  classifications/paths, and never emits retained file contents.
  Multiple repeated invocations are idempotent and leave identical snapshots/
  canonical results for unchanged state.
- `test_status_classifies_only_absent_ready_or_retained_state`: exact no-state
  returns `state_absent`; a complete compatible terminal inventory returns
  `state_ready`; empty present root, orphan lease, partial quarantine, unknown
  entry, malformed terminal record, or candidate drift returns exit `3` and
  `retained_state` without mutation.
  After each producer terminal record, `state_ready` enumerates the exact
  dependency-ordered completed IDs and hashes; missing/out-of-order state blocks.
  Unknown state schema version is retained/incompatible, never migrated.
- `test_status_reviewed_head_field_drives_retirement_and_finalizer_literals`:
  `state_absent` returns null; single-head `state_ready` returns exact 40-hex;
  mixed/malformed state blocks without a usable head. Retirement accepts only
  this validated old head, and finalizer/resume tests retain one immutable
  pre-CAS literal even after current HEAD changes.
- `test_status_returns_absent_after_successful_finalizer_cleanup`: simulate the
  complete post-validated success cleanup while committed evidence remains in
  Git; require no lease/state authority and exact `state_absent`, proving tracked
  final artifacts are not mistaken for retained executor state.
- `test_read_only_git_uses_no_optional_locks_and_closed_environment`: capture
  every Git child; assert absolute Git, leading `--no-optional-locks`,
  `GIT_OPTIONAL_LOCKS=0`, `shell=False`, fixed cwd, and no inherited
  Plan-E-prefixed controls, `DH_PROMOTION_EVIDENCE`, `PYTHONPATH`, hooks/helper variables, or
  unrelated `GIT_*`. The CLI first resolves and validates the fixed system Git
  executable as a regular non-reparse file; PATH substitution is rejected.
  Assert no pager/editor/prompt/credential/network behavior is reachable and
  output capture is bounded.
- `test_fsmonitor_hook_signing_filter_and_helper_effectiveness_blocks`:
  table-drive true/effective `core.fsmonitor`, fsmonitor hook, hooksPath,
  non-sample hook, signing, credential/helper, and attributes-selected filter;
  assert preflight blocks before worktree-reading/ref-mutating Git. An unused
  global LFS filter is recorded but does not block. Effective working-tree
  encoding or other byte-transforming attributes also block; line-ending config
  is recorded and staged/committed blobs remain exact authority.
  Change relevant config between preflight and a sensitive operation; immediate
  revalidation blocks before hook/ref mutation.

**`MutexLeaseTests`**

Exact method count: `7`.

- `test_mutation_creates_and_rereads_lease_before_state_root`: fake adapter logs
  calls; assert non-abandoned mutex, exclusive canonical lease write/reread, then
  exact state-root creation, with durable parent/directory handling and mutex
  release/handle close in `finally`. Before lease, permit only read-only
  preflight calls; after lease, every write must bind the live token/owner.
  Assert the lease parent already exists and is the Git common directory; no
  directory creation precedes the lease write.
- `test_mutex_name_and_state_paths_bind_canonical_repository_identity`:
  equivalent path spelling/case resolves to one fixed production mutex/state
  authority; a different repository identity differs; cwd text cannot change
  either. Test adapters always substitute a unique nonproduction mutex name.
- `test_retained_abandoned_partial_and_unknown_state_blocks_without_cleanup`:
  table-drive held/abandoned mutex, existing incompatible lease, root without
  compatible succeeded inventory, partial owner, unknown entry, retained temp,
  and unknown worktree registration. Assert exit `3`, exact authority paths in
  output, and byte-identical retained state.
  A later producer invocation at either head also blocks; no retry/adoption path
  exists for ordinary crash state.
- `test_finalizer_resume_requires_same_closed_token_and_checkpoint`: exact
  same-token finalizer state may resume; different kind/token/head/owner,
  malformed maps, wrong ref/index/HEAD, missing candidate, or abandoned mutex
  blocks without adoption.
  No producer/review/retire/status invocation may adopt a finalizer lease;
  `finalize` alone can resume it.
- `test_windows_named_mutex_contention_abandonment_release_and_handle_closure`:
  on Windows, spawn real helper subprocesses with one unique test-only name and
  verify contention, abandoned acquisition classification, ownership, normal
  release, and handle closure. Bound child waits with fixed test timeouts and
  terminate/await on failure so the suite cannot hang. Skip only when
  `os.name != "nt"`; no production
  mutex name is touched. The complete executor RED/GREEN counts above are the
  Windows execution contract; on another platform this single method is the only
  authorized skip and the recorded total/skip policy must be revised before
  accepting evidence.
  Contention is nonblocking and returns exit `3`; abandoned acquisition reports
  retained state and performs no cleanup/write even though Windows grants the
  mutex handle. Win32 return/error handling and exactly-once handle closure are
  asserted for success and every failure branch.
- `test_non_windows_mutating_commands_block_without_mutex_emulation_or_write`:
  patch platform discriminator false; every mutating CLI command returns fixed
  blocked/unsupported classification with no lease/state/child/ref write, while
  read-only commands and injected unit adapters remain available.
- `test_mutex_releases_last_and_parent_state_restores_on_success_and_failure`:
  inject success, validation failure, child failure, and cleanup failure; assert
  child handles close before owned cleanup, parent cwd/environment stay exact,
  lease removal occurs only on complete success, and mutex release/handle close
  are the final adapter actions in `finally`.

**`CommandReceiptTests`**

Exact method count: `6`.

- `test_foreground_command_receipt_matches_actual_execution`: execute a fixed
  harmless Python child in a disposable repo. Assert receipt executable, argv,
  cwd, environment, `shell: false`, exit, stdin hash, and captured stdout/stderr
  hashes came from the exact object passed to `subprocess.run`. Reject command
  records synthesized before launch, after object mutation, or from descriptive
  placeholder argv.
  Require argument-array execution with no joined/reparsed shell command.
- `test_child_output_limits_fail_safely_without_partial_receipt`: fixed harmless
  children exceed stdout and stderr bounds separately; assert process
  termination is awaited, no partial succeeded receipt/candidate is promoted,
  safe `internal_error` exposes no child text, and retained ownership blocks.
- `test_child_nonzero_or_start_failure_never_promotes_succeeded_receipt`:
  table-drive start error, signal-like/nonzero exit, timeout adapter result, and
  command-definition drift; require waited/closed process when started, exact
  failure classification, no candidate/succeeded receipt, retained lease/owner,
  and unchanged parent environment/cwd.
  Timeout must terminate/await the exact child tree; detached descendants are
  forbidden by command definitions/adapters.
- `test_command_receipt_schema_rejects_unknown_missing_type_order_and_hash_drift`:
  mutate every closed command row field, command ordering, environment
  key/value/order, bool-as-int exit, stdin null/hash rule, executable/argv/cwd,
  shell flag, and output hash. Every malformed receipt blocks finalization and
  cannot be normalized into acceptance.
- `test_host_children_receive_six_fresh_distinct_contained_directories`:
  child prints only hashes of its six values; assert all directories existed
  before child start, were distinct/contained, receipt-bound, removed only after
  child exit/evidence promotion, and the parent environment stayed unchanged.
  Every external Git, Node, Python, TypeScript, Vite, Vitest, test, and mutation writer is
  foreground and synchronously awaited; no cleanup begins while a child handle
  remains live.
  Require `PYTHONDONTWRITEBYTECODE=1` and no bytecode cache under source/state.
- `test_unknown_duplicate_malformed_or_drifting_receipts_are_rejected`:
  table-drive unknown producer/command ID, duplicate command ID, unknown key,
  stale head/blob, candidate missing/extra/hash drift, unsafe cwd/env, invalid
  exit, empty command list, and overlapping candidate ownership; each blocks.
  A receipt's mere presence never makes state ready; every candidate and source
  binding is independently recomputed.

**`CandidatePublicationTests`**

Exact method count: `5`.

- `test_candidate_publication_uses_no_clobber_hard_link_and_reread`: verify
  exclusive temp, flush, exact reread, same-directory hard link, target inode/
  device/link/bytes/hash identity, and temporary removal. Cross-volume or
  unsupported identity blocks. Patch `os.replace` to fail if called.
- `test_candidate_collision_concurrency_and_crash_preserve_state`: existing
  target, unsupported hard links, two publishers, failure before/after link, and
  hash mismatch never overwrite target; lease/owner/temp/candidate state remains
  for inspection as applicable. Also prove a candidate flush/fsync failure and
  a missing durability capability fail closed before publication.
  Reinvoking a completed producer does not overwrite or silently succeed; its
  terminal record is reported by status and duplicate production is blocked.
- `test_candidate_and_receipt_publication_order_is_crash_safe`: owner/lease
  precede candidate writes; all exact candidates publish and hash before a
  terminal receipt; owned child/worktree cleanup completes before succeeded
  receipt publication; lease removal is last. Inject a crash between every
  transition and require later automation to block without treating partial
  state as succeeded.
  Producer completion leaves source checkout HEAD/ref/index unchanged.
- `test_fixed_artifact_publication_rejects_collision_except_six_reports`:
  every non-historical fixed artifact must be absent and no-clobber published;
  the six report paths are read/hash-only and never written, moved, retired, or
  deleted. Pre-final candidates remain in Git-common head-scoped state; fixed
  `.superpowers/sdd` publication happens only in `finalize`.
  Before finalization those reports must be untracked/unstaged; final staging
  force-adds their exact bytes, and committed blobs must equal preexisting hashes.
  Materialization leaves source candidate bytes/hash intact through post-
  validation and never moves/consumes them early.
- `test_candidates_are_head_scoped_and_fixed_paths_wait_for_finalize`: produce
  two immutable reviewed heads with the same producer; assert disjoint
  head-scoped candidate authorities and no `.superpowers/sdd` fixed artifact
  exists before finalization.

**`RetirementTests`**

Exact method count: `4`.

- `test_retirement_requires_complete_dependency_closed_terminal_state`:
  accept exact `succeeded/rejected` closure with ancestor old/new heads. Reject
  missing dependencies, unexpected producer, crash state, nonancestor, hash
  drift, rejected candidate, or outside path before any mutation. Subset
  retirement is accepted only when computed from the closed dependency graph and
  includes every succeeded upstream candidate plus exact rejected/no-candidate
  downstream records in that selected closure.
  Retirement is required before any producer starts for the accepted new head;
  mixed old/new head-state directories are rejected.
- `test_retirement_atomically_moves_head_authority_then_deletes_quarantine`:
  assert one whole old-head-directory rename to token quarantine, then deletion
  only under quarantine. Failure before rename changes nothing; failure after
  rename retains quarantine plus lease cleanup status and blocks later calls.
  HEAD/ref/index remain byte-identical; retirement performs no Git staging or
  commit.
- `test_retirement_never_deletes_receipt_supplied_or_unrelated_paths`:
  inject outside, sibling-head, historical-report, tracked evidence, and
  unrelated Git-common paths into all receipt string locations; only the
  constant-selected whole old-head directory may move to quarantine, and all
  victims remain byte-identical on both success and failure.
- `test_review_rejection_is_clean_terminal_state_not_crash_state`: invalid
  review writes only a canonical closed `rejected` record, no findings candidate,
  cleans owned temporary/lease state, exits `4`, and can later be retired as a
  dependency-closed terminal record. Rejection classifications are fixed enums
  such as grammar, binding, criterion, high-severity, disposition, and session;
  raw findings/input text is not copied into the record or stdout.

**`WorktreeLifecycleTests`**

Exact method count: `4`.

- `test_only_promotion_and_task_audits_may_create_linked_worktrees`: every other
  producer blocks before `git worktree add`; the two allowed definitions bind
  normalized exact path, detached head, mutation allowlist, original blobs, and
  expected mutated hashes.
- `test_owned_worktree_create_restore_remove_lifecycle_is_exact`: in a disposable
  Git repo assert owner-before-add, one exact registration/head, only allowed
  mutation, byte restoration, clean status, non-force exact removal, then path/
  registration/owner absence. For the promotion definition, one invocation at
  the reviewed head owns one detached worktree. It first materializes only the
  exact RED-commit blobs for the promotion test/production paths, runs RED, and
  restores both reviewed-head blobs in `finally`; it then applies all five fixed
  production transformations sequentially in that same worktree. Inject failure
  before mutation, after mutation, after the failing selector, after restoration,
  and before removal, and require the handler's `finally` to attempt exact-byte
  restoration/revalidation before any removal. Successful completion proves
  every RED, GREEN, mutation, and restored-GREEN transcript plus original final
  blobs and clean reviewed-head status before one non-force removal. Patch
  prune/force paths to fail if called.
- `test_worktree_head_blob_status_or_registration_mismatch_is_retained`:
  every mismatch blocks removal and preserves owner/registration/path.
- `test_worktree_path_normalization_rejects_case_separator_alias_and_prunable_state`:
  compare Git porcelain and local paths through resolved Windows case-insensitive
  identity; reject aliases, duplicate registrations, paths outside the closed
  token root, and `prunable` metadata without adopting/removing anything.

**`ResultValidationTests`**

Exact method count: `17`.

- `test_vitest_results_use_scoped_selector_multiset_identity`:
  identity is exactly `(normalized repository-relative file, tuple(ancestorTitles),
  title)` stored in a `Counter`; duplicate titles across files and duplicate
  parameter rows in one file are accepted with their exact multiplicity. Never
  treat neither `title` nor `fullName` alone as identity.
- `test_vitest_selector_multiplicity_and_status_are_exact`: explicit named
  selector requirements carry expected multiplicity; reject missing/extra row,
  wrong count, or any matching occurrence with a non-passing expected status.
- `test_vitest_full_name_is_derived_consistency_not_identity`: require each
  `fullName` to equal the exact non-empty `ancestorTitles` followed by `title`,
  joined with one space; malformed/missing/non-string values fail, but equal
  repeated `fullName` values remain valid when their scoped multiset is valid.
- `test_vitest_focused_multiset_equals_full_restricted_multiset`: restrict the
  full-run scoped-selector Counter to exact focused files and require equality
  with the focused Counter, including multiplicities and statuses; reject drift
  even when aggregate totals match.
- `test_vitest_results_require_exact_files_and_counter_reconciliation`: normalize
  `testResults[].name` to contained repository-relative POSIX paths, require
  exact test-file inventory, use `len(testResults)` as file count, and require
  `sum(len(assertionResults)) == numTotalTests` plus exact passed/failed/pending/
  deferred counter reconciliation. Nested suite counters never substitute for
  file count; traversal/case/separator aliases and zero totals fail.
- `test_extension_producer_argv_and_subset_inventories_are_exact`: compare the
  fixed twenty-four-file Plan E selector order, Task 6/7 current file lists and named
  assertions, full tracked test-file inventory, fixed local Vitest executable
  cwd/argv/reporters/output
  authority, and focused-to-full file/test relationships. Reject missing/extra/
  reordered files, wrong reporter/config/cache flag, npm/npx/network-capable
  fallback, or output outside token root. Every focused/full/Task-audit Vitest
  argv uses exact `--root extension --config vitest.config.ts`; reject a
  redundantly root-prefixed config and
  every other config spelling. Require one absolute token-owned
  `--outputFile.json=<path>` value per JSON run.
- `test_asset_provenance_build_copy_and_release_safety_are_exact`: bind canonical
  test/asset/attributes blobs and SHA-256, exact `.gitignore` deletion, five Node
  tests, source/dist asset identity, reviewed/release inclusion, and absence of
  private/local menu markers. The asset is reviewed product, never a final
  evidence artifact.
- `test_build_and_static_commands_use_only_absolute_local_node_entries`:
  require exact TypeScript, Vite, and Vitest local entry files/argv/cwd/output
  roots; reject npm/npx/PATH lookup, install/update flags, remote URL, package
  download, or network-capable fallback. Build must copy the tracked asset
  byte-identically. Vitest cwd is the repository root and its exact root/config
  pair is `--root extension --config vitest.config.ts`; the Vite build remains
  `build extension --config extension/vite.config.ts` because that is a separate
  root-CLI contract.
- `test_host_results_require_positive_counts_and_exact_skip_policy`: focused,
  Task-7-current, update-engine, package, executor, and compile phases have zero
  skips. Full and recovery each allow exactly selector
  `host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation`
  with reason `DH_PLAN_C_FROZEN_ONEDIR not set`; extra/missing/wrong skip blocks.
- `test_host_result_selectors_and_phase_modules_are_exact`: compare each phase's
  fixed module argv, positive `Ran` total, unique sorted passed selectors, skip
  subtraction, executor inclusion, and full tracked top-level Host test-module
  inventory. Reject zero tests, duplicate/missing selector, wrong module, ERROR,
  or a passing summary whose selector count does not reconcile.
- `test_promotion_result_requires_red_replay_green_mutations_and_sources`:
  require seven immutable-RED assertion failures, constructor pass, all eight
  GREEN selectors, five mutation failures plus restored GREEN, exact source
  blobs, exact 40 candidates (14 fixed plus 26 transcript leaves), transcript
  maps, observed attempts `2/3`, delays `0.05/0.2`, validation calls `1/3/5`,
  hooks once, and cause/state facts. Require source/hash records for the exact
  inert comment-only promotion command/mutation provenance artifacts; assert
  both parse to zero executable PowerShell statements and neither `.ps1` path is
  ever a child executable, imported script, dot-sourced file, or command source; label
  replay only as `RED commit replay`. Require all GREEN/mutation/restoration work to belong
  to one `produce --kind promotion` owner/lease and one detached-worktree
  lifecycle; no separate mutation command or primary-checkout edit is accepted.
  Assert the ordered command receipt contains the RED/constructor/GREEN/mutation/
  restored-GREEN actions in that one invocation and contains no `.ps1` executable
  or second mutation-process entry.
- `test_promotion_source_semantics_lock_seams_checkpoints_and_atomic_callsite`:
  extract the committed-plan promotion class/import/class-map contracts and
  require blob `476760dee46de0273d4b3beb2b8e5452e790d6df`, payload size/lines/SHA,
  13 helpers/8 tests, exact
  current indentation and class-map placement; then parse committed
  `host/update_engine.py` and require exactly the three seams/two
  constants, frozen constructor, one complete validator, one retry helper, three
  checkpoint markers/calls in order, `_replace_path` only for promotion, sleep
  only at fixed delays, and one logical `_run_preparation_operation` call. Reject
  copy/delete/non-atomic fallback or retry around hooks/active writes.
  Require unchanged operation label, transitions, active record construction,
  ownership/probe/staging logic, and later phases outside the approved callsite/
  helpers/seams/import.
  Lock the five producer transformations and selector map from section 9.6 as
  constants in `host/test_plan_e_evidence.py`; each anchor occurs exactly once,
  and the production CLI consumes those fixed definitions without accepting a
  mutation string/path from argv or receipt data.
- `test_promotion_replay_failures_are_assertions_not_collection_or_setup_errors`:
  for each immutable RED transcript require exactly one named selector,
  `Ran 1 test`, one `FAIL`, `FAILED (failures=1)`, and no ERROR/import/skip/
  timeout/signal/zero-match text; constructor requires one `ok` and `OK`.
  Require RED materialization and reviewed-head restoration to occur under the
  same promotion owner/lease/worktree and foreground process as GREEN and all
  five mutations; exact reviewed-head blobs must be restored before GREEN.
- `test_task_audits_are_canonical_current_state_only`: validate the complete
  closed schema from the evidence-loss spec, Task 6 `9` commits/`7` paths/empty
  related list/two mutations, Task 7 `3` commits/`14` paths/one exact related
  cleanup/one mutation, all locked hashes/blobs/checks, report absence, and both
  reconstruction booleans false. Bind Task 6 base/head/tree
  `ba34fb05719adeb8e5501827dc7a7398b8041aec` /
  `44fdea3e6b60fd975dc150436e08ba048a744c8c` /
  `6feb60db2767d35a7886ac32b805c12174ff683f`; Task 7 base/head/tree
  `44fdea3e6b60fd975dc150436e08ba048a744c8c` /
  `1ad75ea3891513db12a41b48ae5ccf35f32250ab` /
  `541caa656ccce0c3e8b2acc896269337ceecd995`; and related cleanup
  `e163eb28492b32b3cf743b6700eebd0bda7504cb`, parent Task 7 head, tree
  `0547bddb2968d3fd9d160a58d7ce74a67ad8b90c`, subject
  `test(fab): remove stale Root mock`, sole path
  `extension/src/components/FAB.pageIdentity.test.tsx`, numstat `0 1`, blobs
  `95476baad531c6c8a9e9e5022f1440d49a2e299c` to
  `7eed2e5a8ad30ea30c9ecd51b33bfe32293979dd`. The CLI constant tables also
  contain the ordered nine Task 6 and three Task 7 core commit rows with their
  exact parents, trees, subjects, sorted name-status paths, numstat, and head
  blobs as read from Git; the tests compare every row and reject any extra or
  missing commit/path.
- `test_task_audit_schema_rejects_every_closed_field_and_cardinality_drift`:
  mutate each top-level/nested key, enum, type, order, cardinality, command argv,
  assertion title, mutation result, machine-evidence hash/null rule, lineage
  row, source blob, report path/hash, required review kind, and reconstruction
  boolean. Reject unknown/missing fields, wrong Task 6/7 distribution, stale
  reviewed head/plan blob, noncanonical bytes, and any claimed historical
  reconstruction.
- `test_task_audits_bind_exact_machine_evidence_and_review_requirements`:
  Task 6 binds focused and reviewed-head verification hashes with Host hash
  exactly null; Task 7 binds focused, Host, and reviewed-head verification
  hashes. Both require the two review-kind list in order and exact evidence paths;
  any stale/missing/mismatched dependency receipt or hash blocks generation.
- `test_audits_freeze_before_review_and_are_never_regenerated_by_consumers`:
  after no-clobber audit publication, patch generation to fail if called; both
  package producers, review ingestions, and finalization must only validate the
  same bytes/hash. A changed reviewed head or audit input requires retirement
  and a new head-scoped candidate, never overwrite.

The immutable core commit order locked by those constants is:

```text
Task 6: c404aaf56250b522cbd038adf7c26ad689c1285d, 2303482bcc9fc10953174c453acb2196675dbc27, 38271fcee6738fcc7baba9eb67de5115f1a16fc7, 17218fae212d80e3231898a0480124683fde84c2, c03057db34f40fa429af2bc34e41f1b320272d34, bc0f701643dfd9b8d1bf2722200b5cb3d3c22eee, 8efc4f290aa3caba7b607bf97b764a073497306c, 932565e6ea2e21798ec0bb27b8502ae08a76ef22, 44fdea3e6b60fd975dc150436e08ba048a744c8c
Task 7: edeb6a8b4ed0e831ebc7358499106eb0bc4ad135, d7006450df0c672e31e812148a274b8a5e6e5c76, 1ad75ea3891513db12a41b48ae5ccf35f32250ab
```

Their exact subjects in the same order are Task 6:
`fix(fab): track SPA identity during analysis`,
`fix(fab): order SPA scans safely`,
`fix(fab): bind SPA context snapshots`,
`fix(fab): bind all analyze invocations`,
`fix(fab): separate pending scan ownership`,
`fix(fab): revalidate terminal page ownership`,
`fix(fab): gate local result hydration`,
`fix(fab): require terminal full revalidation`, and
`fix(fab): wake terminal scan coordinator`; Task 7:
`fix(analysis): scope Root override to one request`,
`fix(analysis): snapshot latest preference Root`, and
`fix(analysis): preserve title page ownership`.

Each generated audit has exact schema version `1`, evidence kind
`plan_e_task_current_state_audit`, required review list
`["plan_e_only","original_whole_branch_interim"]`, historical availability
`unrecoverable`, claim scope `current_immutable_commit_state_only`, and the
closed `audit_subject`, `claim_boundary`, `historical_report`,
`implementation_lineage`, and `verification` objects defined by the amendment.
Audit canonical JSON is written once to a head-scoped candidate through the
same no-clobber hard-link publication as every other candidate; reviews and
finalization only reread/hash it and never regenerate or edit it.

**`ReviewGrammarTests`**

Exact method count: `8`.

- `test_review_text_requires_exact_whole_file_heading_grammar`: accept only the
  exact heading orders in section 9.8. Reject prefix/suffix text, duplicate,
  missing, extra, hidden section, BOM, controls, bidi/format code points, invalid
  UTF-8, CR, trailing blank line, malformed scalar, unmatched text, and inputs
  larger than the fixed 1 MiB review limit.
  Criterion/scalar bodies must be one line; explanations outside severity/
  testing sections are unmatched text and rejected.
  Reject NUL and all Unicode control, bidi, and format characters in every
  section, including findings text and session IDs.
- `test_review_input_is_single_snapshot_regular_file_and_not_cleanup_authority`:
  reject relative, missing, directory, symlink/reparse, changing-between-read,
  or invalid UTF-8 input. Hash and validate one frozen byte snapshot, never
  reopen it for findings output, and never delete or move the external input.
- `test_review_disposition_criteria_findings_and_session_rules_are_exact`:
  require five `PASS` values, `Critical` and `Important` exactly `None.`, exact
  `PASS` versus `INTERIM PASS THROUGH PLAN E`, and two different session IDs.
  Implement the user-authorized shell-safe subset of the scripted-spec session
  grammar: exact regex `^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$`. Reject
  leading hyphen, every leading punctuation character from the remaining safe
  set, whitespace, quotes/backticks/dollar/semicolon/pipe/ampersand/parentheses,
  controls, non-ASCII, empty, equal, or over-limit IDs; no trimming, Unicode
  normalization, or case folding. Also assert metacharacters are rejected when
  embedded, not only at the first position, and accepted IDs remain literal
  single argv values. This deliberate narrowing preserves the spec's opaque-ID
  claim boundary while making one-line PowerShell transport unambiguous.
- `test_review_critical_or_important_code_finding_blocks_even_when_criteria_pass`:
  provide all five criteria `PASS` with one syntactically valid ordinary
  correctness/security Critical or Important row; only `BLOCKED` is valid and
  ingestion produces no findings candidate.
- `test_second_review_must_bind_a_different_declared_session_and_findings_hash`:
  ingest either order; reject equal normalized IDs, equal complete findings
  hashes, copied wrong-kind content, or a second record that does not bind its
  own package/diff while both still bind identical frozen audits/reviewed head.
- `test_review_findings_require_closed_file_line_grammar`: `Minor` and `Testing
  Gaps` are either `None.` or one or more `- [Minor] path:line - text` rows;
  reject mixed `None.`, missing path/positive line, wrong severity, or free text.
  Critical/Important findings, when testing blocked input, use the same
  `- [Critical] path:line - text` / `- [Important] path:line - text` grammar and
  force disposition `BLOCKED`; successful ingestion still requires exact
  `None.` in both sections. Valid Minor/Testing Gaps rows preserve `PASS` or
  interim pass while exact counts and combined hash are recorded.
- `test_review_rejects_hash_range_audit_or_prospective_durability_drift`: bind
  exact package/diff bytes, bases, reviewed head, range, both audit hashes, and
  reject a claim that the later evidence commit already exists/is durable. The
  package producer runs stat/log/name-status and full-index binary diff twice
  from exact command objects and requires byte-identical rechecks.
  Require package kind label and exact full-index binary diff command/range once;
  Plan-E package path inventory must be the literal 70 paths.
- `test_review_dispatch_candidates_are_receipt_authorized_head_scoped_bytes`:
  package success output names exact candidate authorities/hashes; dispatch
  lookup validates kind/head/hash and reads those bytes. Reject manually copied,
  fixed-path, stale-head, outside-state, or unreceipted package/audit input. An
  optional read-only transport copy must hash byte-identical before dispatch and
  never replaces original candidate validation.

**`FinalReportTests`**

Exact method count: `5`.

- `test_final_report_has_exact_headings_and_required_facts`: compare all 18
  report headings and every fact enumerated in section 9.9, including exact
  Task 1-5/8 report hashes and RED/mutation summaries, Task 6/7 unavailable
  forms, exact live totals/skips, executor results, audit/review summaries,
  forbidden operations, residual risks, and post-D rerun. Reject unresolved
  authoring markers, duplicate/missing scalar lines, non-lowercase hashes,
  empty sections, CR/BOM, wrong title, and missing final LF.
  Require exact candidate-readiness wording and keep it distinct from post-CAS
  PASS, release readiness, Plan D completion, and final whole-branch completion.
  Require the `Final artifact manifest SHA-256` scalar to contain exactly one
  lowercase 64-hex value copied
  from the exact staged manifest candidate, plus the exact prospective candidate
  contract lines in section 9.9; reject any pre-CAS base-to-final/final-commit
  `PASS` wording.
  Reject embedded executable shell/Python implementation blocks in the report;
  historical command evidence is summarized by identity/output/hash only.
- `test_final_report_requirement_matrix_has_exact_unique_coverage`:
  require every Plan E product, executor, retry, audit, review, and finalization
  invariant exactly once with exact test file/selector, producer receipt, and
  artifact binding; reject unmapped, duplicate, stale, or unknown rows.
- `test_final_report_lists_exact_reviewed_and_evidence_path_sets_once`:
  compare report path sections with marked 70/60 constants and Git, rejecting
  duplicate, missing, extra, reordered, renamed, or overlapping paths.
- `test_final_report_has_no_final_commit_sha_or_post_cas_fixed_point`:
  report inputs/bytes may contain reviewed head, fixed evidence subject,
  validated artifact hashes, the exact staged manifest SHA-256, and fixed
  inventory/readiness contracts only. The manifest excludes itself and the
  report, so recording its hash is non-circular.
  Reject prospective/final tree, complete staged blob map, report/manifest Git blob
  ID, report self-hash, final evidence commit SHA, current post-CAS HEAD, committed-report
  self-reference, post-cleanup PASS, or any field whose value depends on the
  report blob's own bytes or eventual commit ID.
  Require exact candidate-readiness/candidate-contract lines and forbid
  base-to-final, committed, finalized, or cleanup PASS language inside the
  report.
- `test_final_report_rejects_task_6_7_historical_reconstruction_claims`:
  table-drive positive, split-line, punctuation, and synonym combinations of a
  Task 6/7 historical RED/GREEN/mutation/TDD/edit/reviewer subject with the
  forbidden reconstruction verbs `recover`, `recreate`, `replay`, `reproduce`,
  and `prove`; require rejection. Accept exact `UNRECOVERABLE`, explicit
  negation, and `current_immutable_commit_state_only` statements.

**`FinalizationTests`**

Exact method count: `15`.

- `test_finalizer_validates_58_artifacts_and_stages_exact_60_blobs`: require all
  ten selected terminal records with both reviews `succeeded`, candidate hashes,
  six report hashes,
  audit/findings bytes,
  absent Task 6/7 reports, exact manifest, and exact staged list/blob map before
  commit. One missing/extra/drifting path blocks. Finalization creates only the
  canonical manifest and complete report; every other artifact comes from an
  exact producer candidate or six-report read-only exception.
  Creation order is fixed: freeze/validate the 58-artifact map, create and freeze
  canonical manifest bytes, compute their SHA-256, create the report once with
  that exact hash, then stage both. The report is never reopened to insert a
  value computed from itself or the later commit.
  Pre-commit untracked artifacts must be ignored and absent from parent/index;
  this ignore check is never used after commit.
  Require all 60 paths absent from the reviewed parent tree and added by the
  evidence commit; modification/rename status is invalid. Require every
  non-evidence tree entry identical to reviewed head.
  A clean rejected review may be retired but never satisfies finalization.
  Recompute every candidate and fixed materialization hash immediately before
  staging to close producer-to-finalizer drift.
- `test_final_report_and_manifest_are_single_creation_frozen_candidates`:
  finalizer exclusively creates canonical manifest and complete report after all
  inputs freeze, derives both from the same validated artifact map, and rejects
  any later rewrite, append, reopen race, or pre-existing output before staging.
  The manifest never contains itself or the report. Finalize the canonical
  manifest bytes first, hash the frozen staged manifest candidate, then create
  the report exactly once with that lowercase SHA-256. The report never contains
  its own hash; finalizer output records both staged hashes externally.
- `test_finalizer_requires_reviewed_head_equal_audit_subjects_and_review_heads`:
  mutate either audit subject, either package/findings head, current branch head,
  or post-review ancestry; finalization blocks before materialization/staging.
  Only the exact evidence child may advance HEAD after accepted reviews.
- `test_manifest_is_canonical_exact_58_path_sha256_map`: reject self-inventory,
  report/manifest entry inclusion, auxiliary mutation entry, missing/extra/
  unsorted path, duplicate, wrong hash, uppercase hash, or noncanonical bytes;
  independently hash every artifact before staging and from committed blobs.
  Compute the canonical manifest SHA-256 before report construction; require the
  report's exact manifest-hash scalar to match both staged and committed bytes.
- `test_finalizer_compares_every_staged_blob_with_committed_blob`: mutate a
  working artifact after staging and make the prospective commit contain a
  different blob; post-check catches the mismatch even when names/counts match.
  The report's manifest/audit/review/machine hashes are recomputed from exact
  staged blobs before commit, including exact equality between its manifest
  SHA-256 line and the staged canonical manifest bytes, then recomputed from
  committed blobs afterward.
  Review summaries are reparsed from staged findings, never receipt process
  memory or package prose.
- `test_finalizer_uses_commit_tree_and_compare_and_swap_ref_update`: assert exact
  tree creation, `git commit-tree` fixed subject/one parent, durable prospective
  SHA at `staged`, and one `git update-ref branch new reviewed-head`; commit
  hooks are neither invoked nor bypassed after their absence was revalidated.
  Branch symbolic-ref identity is recorded before staging and must not drift.
  The commit object uses the validated repository author/committer identity and
  fixed message without invoking signing or credential helpers; the resulting
  prospective commit object is retained internally before ref mutation but is
  never written into the report. Git object/ref child environment remains
  closed and checkpoint-bound.
  Tree creation uses the validated exact index and does not update the worktree;
  CAS is the sole branch-ref write. Report generation never receives the
  prospective commit object ID.
- `test_finalizer_concurrent_branch_or_index_change_blocks_without_overwrite`:
  mutate branch ref before commit creation, between staged checkpoint and CAS,
  and mutate one index stage/blob; require compare-and-swap or map validation to
  fail, preserve the external ref/index value, and retain exact checkpoint state.
  Assert no second ref writer, checkout, merge, reset, or commit command exists.
- `test_finalizer_validates_staged_diff_check_and_empty_preexisting_index`:
  require an empty index before materialization, exact force-add only for the 60
  paths, successful staged `diff --check`, and no pre-existing staged entry;
  whitespace errors, unrelated stage, alternate stage number, or path drift
  retain `staged` authority and block commit.
  Force-add is path-explicit with `--`; no pathspec expansion or `git add .`.
- `test_finalizer_preserves_index_and_head_on_post_staging_failure`:
  inject failures after staged checkpoint and after CAS; assert the exact index,
  prospective commit object, ref/HEAD, and lease remain as observed, with no automatic
  unstage/reset/HEAD rewrite. Same-token resume is the only continuation.
- `test_finalizer_resume_reconciles_only_two_exact_ref_states`: at `staged`, ref
  may equal reviewed head and receive one CAS; at post-CAS crash, ref may equal
  recorded prospective commit object and advance to `committed`. Any other ref, HEAD,
  index, token, map, or candidate blocks and never repeats commit. Resume may
  continue only the next deterministic transition and never rewrites an earlier
  checkpoint or infers a missing one.
- `test_finalizer_cleanup_quarantine_and_checkpoint_failures_are_retained`:
  before success, atomically move the complete selected head-state directory to
  finalizer quarantine and update the lease. Inject failure at each checkpoint,
  rename, deletion, and lease removal; assert exact checkpoint/index/HEAD/state
  remain and no rollback/reset/unstage occurs.
- `test_finalizer_failure_exit_codes_preserve_exact_checkpoint_authority`:
  table-drive validation failure (`4`) versus execution/I/O failure (`5`) at
  candidate validation, report creation, staging, tree/commit creation, CAS,
  post-validation, quarantine, and cleanup; assert one canonical safe result and
  exact retained lease/index/ref/HEAD facts for each checkpoint.
- `test_finalizer_success_removes_only_owned_state_after_post_validation`:
  after exact committed/clean-clone validation, require head-state quarantine,
  owner, receipts, auxiliary mutation candidate, empty state roots, and lease
  removed in order; an unrelated Git-common sentinel remains byte-identical and
  the mutex releases last. The committed fixed artifacts remain in the working
  tree as tracked bytes and are not deleted by evidence-state cleanup.
  If cleanup fails after commit/post-validation, readiness remains blocked until
  exact same-token finalizer resume completes cleanup; `verify-final` success
  alone does not waive retained state.
- `test_verify_final_is_clean_clone_read_only_and_uses_literal_base`: validate
  exact parent/subject/60-path commit, manifest hashes, report/audits/reviews,
  `70 + 60 = 130`, and clean status using committed bytes and literal base only;
  no ignored `.gitignore`, local `plan-e-base.txt`, or `git check-ignore` read.
  Clone into a disposable owned path with no local hard-link optimization,
  checkout detached final head, require one registration/no prunable state,
  validate every tracked blob, and remove only that owned clone afterward.
  Require the committed report's manifest SHA-256 line to equal the committed
  canonical manifest bytes and require the manifest to exclude itself/report.
  Canonical output alone carries `final_commit_validation: "PASS"` and
  `base_to_final_union_validation: "PASS"`; either claim in committed report
  text fails validation.
- `test_final_primary_checkout_is_clean_exact_head_without_extra_worktrees`:
  after successful cleanup require branch/HEAD at final SHA, empty index/tracked
  and unexpected-untracked status, exact committed evidence working blobs, one
  primary worktree registration, and no `prunable`; any drift blocks readiness.

**`InventoryAndReleaseTests`**

Exact method count: `5`.

- `test_literal_inventories_are_sorted_unique_and_exact`: extract this plan's
  three marked lists and compare them with CLI constants. Assert `70`, `58`,
  `60`, disjoint reviewed/evidence sets, final evidence equals artifacts plus
  manifest/report, auxiliary mutation absence, and union `130`. Assert each
  marker occurs once and there is no second literal inventory in Task 9.
  Assert no lease/owner/receipt/quarantine/state path enters either final list.
- `test_candidate_ownership_arithmetic_is_exact_and_disjoint`: require the ten
  terminal candidate counts `40/1/1/1/1/3/2/2/1/1`, 53 unique candidates,
  exactly one auxiliary exclusion, six report exceptions, and exact equality to
  the 58 manifest paths; reject overlap or count/path drift.
  Confirm both findings occupy existing fixed slots rather than increasing the
  manifest count.
- `test_release_staging_and_pyinstaller_exclude_executor`: inspect
  `release_helper.stage_release`, build command/hidden imports, release source
  allowlists, and a disposable staged release. Assert neither
  `plan_e_evidence.py` nor `host/test_plan_e_evidence.py` enters Extension,
  Host, `_internal`, staging, hidden imports, or package metadata. The test uses
  existing staging APIs only inside synthetic roots and never invokes a build,
  archive publication, tag, release, or real package operation.
  Also assert `host` production modules never import the root CLI and the CLI
  does not enter frozen-module graph/xref constants.
- `test_forbidden_operations_are_unreachable_from_cli_definitions`: inspect
  command constants and run every command with fake adapters; assert no network,
  registry, real AppData, browser, install, publish, tag, push, authenticated
  model, real update, broad reset, prune, or force-remove operation exists.
  Also assert tests never address the real repository state root, production
  mutex name, installed product, or user profile directories. Reject release
  helper `main`, build/archive/publish entry points, updater/update-engine live
  activation, registration APIs, and HTTP-capable argv in every producer map.
  Also reject shell invocation, arbitrary `-c` supplied by users, background/
  detached flags, interactive prompts, and commands outside fixed definitions.
  Treat the two legacy-named promotion `.ps1` files as comment-only output
  candidates: assert no command definition executes, imports, or dot-sources
  them and strict PowerShell AST inspection finds zero executable statements.
  Reject remote attestation/timestamp/signing/upload commands and any Git remote
  operation.
- `test_executor_tests_use_only_disposable_repo_profile_and_temp_roots`:
  instrument the shared fixture plus filesystem, subprocess, mutex, registry,
  and network adapters while exercising one row from every command family;
  every mutable path is under a test temporary root,
  every Host profile/temp variable points to six fresh children, and attempts to
  address the real repository/AppData/install/mutex/network fail the test.

Run focused GREEN by class in the exact class order above as implementation
boundaries land; every class command uses the absolute Host venv Python and
fully qualified `host.test_plan_e_evidence.<ClassName> -v`. The complete module
command remains the acceptance gate and supplies the fixed aggregate count.
Focused class runs are diagnostic iteration, not additional retained evidence
commands; producer receipts retain the final complete module/discovery commands.

This is exactly **99 behavioral test methods**. The one-to-one mapping is the
method name to its immediately following input/expected-result paragraph above;
table rows are cases within that single requirement and may not become unnamed
or duplicate tests. The test module also contains
`ExecutorMutationProofTests` with exactly these seven methods:
`test_mutation_receipt_allowlist_is_caught`,
`test_mutation_retirement_prevalidation_is_caught`,
`test_mutation_candidate_atomicity_is_caught`,
`test_mutation_worktree_head_validation_is_caught`,
`test_mutation_review_whole_text_coverage_is_caught`,
`test_mutation_host_skip_policy_is_caught`, and
`test_mutation_staged_committed_blob_comparison_is_caught`. The complete module
therefore has exactly **106 methods from the first RED commit**. It self-checks
both inventories so omitted, renamed, or extra contract tests fail.

- [ ] **Step 2: Run valid RED**

Run named smoke contracts first, then the complete module. The shell must import
and compile; all 106 tests must collect. Lock RED as exactly **106 assertion
failures, 0 errors, 0 skips on the required Windows evidence host**. If a stub accidentally satisfies an assertion,
adjust the shell's fixed wrong result, not the contract. Any syntax/import/
collection/setup error is invalid RED.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest "host.test_plan_e_evidence.CliContractTests.test_cli_grammar_accepts_only_fixed_commands_and_producer_kinds" "host.test_plan_e_evidence.CanonicalJsonTests.test_canonical_json_round_trip_is_byte_exact" "host.test_plan_e_evidence.InventoryAndReleaseTests.test_release_staging_and_pyinstaller_exclude_executor" -v
```

Expected: `Ran 3 tests`; exit `1`; exactly 3 `FAIL`, 0 `ERROR`, 0 skipped. These
three failures are included in, not additional to, the full 106-failure RED.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest "host.test_plan_e_evidence" -v
```

Expected on Windows: `Ran 106 tests`; exit `1`; `FAILED (failures=106)`, no
errors/skips. Every verbose method line ends in `... FAIL`; no method passes for
the wrong reason.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "from pathlib import Path; compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py', 'exec'); compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_plan_e_evidence.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_plan_e_evidence.py', 'exec')"
```

Expected: exit `0`, no output.

- [ ] **Step 3: Commit exactly the two RED paths**

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "host/test_plan_e_evidence.py" "plan_e_evidence.py"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "test(evidence): define Plan E executor contracts"
```

Reread one parent, exact subject, exact sorted paths
`host/test_plan_e_evidence.py` and `plan_e_evidence.py`, unchanged unrelated
blobs, clean tracked status, and empty index. The observed pre-commit executor
RED remains a narrow process attestation; chronology and the unchanged shell
blob prove only what is present in the committed RED state.

- [ ] **Step 4: Implement the root CLI from the test contracts**

Implement only `plan_e_evidence.py` with `apply_patch`. Follow section 9.1's architecture and data
schemas. Do not edit tests to fit the implementation. Keep all producer command
definitions and inventories as constants; keep Git/process/filesystem/Windows
APIs behind narrow injected adapters; keep state parsers closed and canonical;
and make every failure category return its fixed JSON/code/exit. Do not import
the CLI from Host production.
Keep implementation cohesive in the one authorized root file; private helpers
may separate concerns internally, but do not add a package/module tree or new
paths without a separately accepted path-count amendment.
Keep exported/public names exactly to the frozen interfaces/constants required by
tests; prefix implementation-only helpers with `_`.

Fixed producer behavior:

- `promotion`: create one detached worktree at the immutable reviewed head,
  materialize the exact promotion test/production blobs from the immutable RED
  commit long enough to replay seven assertion failures and one constructor
  pass, then restore exact reviewed-head blobs in `finally`; run GREEN all eight
  selectors, then five exact temporary mutations and restored GREEN in the same
  worktree and foreground invocation; complete 40
  promotion candidates. The 40 are 26 transcript leaves plus the 14 fixed inert
  promotion provenance/hash/map/ledger/observation artifacts in the 58-path
  list. Legacy-named `.ps1` artifacts are comment-only evidence snapshots with
  zero executable statements and are never executed; all behavior lives in the
  tracked Python producer.
  Original RED execution is only process attestation.
- `focused-extension`: exact Plan E focused files plus exact Task 6 and Task 7
  current-state file sets; canonical Vitest JSON with exact scoped-selector
  multisets, explicit multiplicities, statuses, and counters.
- The exact Plan E focused file inventory is
  `src/utils/ownData.test.ts`, `src/utils/bookmarkItems.test.ts`,
  `src/components/Options.test.tsx`,
  `src/components/MenuLogic.teamCache.test.ts`,
  `src/utils/teamCatalog.test.ts`,
  `src/background/teamManifestSync.test.ts`,
  `src/utils/analysisStore.test.ts`,
  `src/background/analyzeBridge.test.ts`,
  `src/background/analyzeRequestHandler.test.ts`,
  `src/background/nativeMessageWire.test.ts`,
  `src/hooks/useAnalysisHydration.test.ts`,
  `src/utils/promptSourceErrors.test.ts`,
  `src/utils/pageIdentity.test.ts`, `src/utils/analyzeRequest.test.ts`,
  `src/background/contextMenu.test.ts`,
  `src/components/ResultPopover.test.tsx`,
  `src/components/FAB.pageIdentity.test.tsx`,
  `src/components/FAB.analyzeRequest.test.tsx`,
  `src/components/FAB.spinner.test.tsx`,
  `src/components/FAB.promptSourceErrors.test.tsx`,
  `src/utils/nativeUpdateError.test.ts`,
  `src/utils/configUpdateResult.test.ts`,
  `src/background/resetExtensionState.test.ts`, and
  `src/content/updateErrorBridge.test.ts`, in that fixed order with runner/no-
  cache and verbose plus JSON reporters.
- `full-extension`: every tracked `extension/src/**/*.test.ts(x)` file at the
  reviewed head, canonical JSON, no missing/extra test file. Invoke absolute
  local Node with
  `extension/node_modules/vitest/vitest.mjs run --root extension --config
  vitest.config.ts --configLoader runner --no-cache
  --reporter=verbose --reporter=json --outputFile.json=<token-owned-json-path>`.
  The focused and Task-audit Extension commands use the same executable/root/
  config/loader/cache/reporter/output-file grammar before their fixed file and
  optional `-t` selectors. No JSON is parsed from mixed console output.
- `host`: focused, Task-7-current, full tracked discovery, update-engine,
  recovery, package, executor, and source compile phases in isolated roots. Only
  full and recovery have the one authorized frozen-probe skip/reason. Full
  discovery inventories every tracked top-level `host/test_*.py` module at the
  reviewed head, including `host/test_plan_e_evidence.py`; every phase requires
  a positive exact `Ran N tests` count and sorted passed selectors.
  Focused modules are `host.test_session_workspace`, `host.test_prompt_session`,
  `host.test_prompt_sources`, `host.test_sdk_compat`,
  `host.test_debug_prompt_isolation`, and `host.test_model_config`.
  Update-engine modules are `host.test_update_engine_resume`,
  `host.test_update_engine_host`, `host.test_update_engine_extension`, and
  `host.test_update_engine_rollback`; recovery is `host.test_update_recovery`;
  package is `host.test_release_helper` plus `host.test_package_archive`;
  executor is `host.test_plan_e_evidence`.
- `static`: TypeScript no-emit with token-owned build-info, production Vite build
  to a token-owned output, static/AST/no-coercion checks, tested-source blobs,
  and `git diff --check` from literal base to reviewed head. Generated output is
  confined to owned temporary paths and removed after command termination; it
  never changes tracked/ignored product output in the primary checkout. The
  TypeScript argv is absolute local Node plus
  `extension/node_modules/typescript/bin/tsc --noEmit --tsBuildInfoFile
  <owned-file> -p extension/tsconfig.json`; build argv is absolute local Node
  plus `extension/node_modules/vite/bin/vite.js build extension --config
  extension/vite.config.ts --configLoader runner --outDir <owned-dir>
  --emptyOutDir`. No npm/npx/network fallback is defined. Owned paths derive
  only from the producer token and closed map, never CLI grammar.
- `task-audits`: exact Task 6/7 current-state checks and three mutations in an
  owned detached worktree, then exact closed audit JSON. It never reconstructs
  historical reports or chronology. Task 6 reruns
  `extension/src/utils/pageIdentity.test.ts`,
  `extension/src/components/FAB.pageIdentity.test.tsx`,
  `extension/src/components/FAB.spinner.test.tsx`, and
  `extension/src/hooks/useAnalysisHydration.test.ts`, requiring titles
  `switches identity from A to B while Analyze is busy`,
  `contains throwing identity accessors`,
  `replaces a user-edited A textarea with B after busy Analyze completes`, and
  `clears A hydration while deferred B hydration is pending`. Task 7 reruns
  `extension/src/utils/analyzeRequest.test.ts`,
  `extension/src/background/contextMenu.test.ts`,
  `extension/src/components/FAB.analyzeRequest.test.tsx`,
  `extension/src/components/FAB.spinner.test.tsx`,
  `extension/src/components/FAB.promptSourceErrors.test.tsx`,
  `extension/src/components/FAB.userPrompt.test.tsx`,
  `extension/src/components/FAB.bookmarkTelemetry.test.tsx`,
  `host.test_session_workspace`, and `host.test_prompt_session`, requiring
  Extension title `applies an explicit empty Root to exactly one request` and
  Host selectors
  `TestSessionIdentityLifecycle.test_explicit_empty_analyze_root_overrides_config_for_one_request`,
  `TestSessionIdentityLifecycle.test_request_after_explicit_empty_without_marker_uses_configured_root`,
  `TestSessionIdentityLifecycle.test_malformed_explicit_marker_uses_legacy_fallback`, and
  `TestSessionIdentityLifecycle.test_explicit_marker_with_non_string_root_uses_legacy_fallback`.
Current mutations disable busy identity scanning, replace descriptor-safe
  identity parsing with direct accessor read, and treat explicit empty Root as
  absent/truthy-only; each exact intended title fails once with exit `1`, then
source bytes restore and the same selector passes.
- Audit current-state tests/mutations run only after focused/Host/static machine
  evidence candidates are frozen; their exact outputs and source blobs are
  recorded in the audit receipt. They are current checks, not historical GREEN.
- `plan-e-review-package`: exact package/diff for
  `0dbb4852931b50153fb898b03129ae0092c46404..<reviewed-head>` with the exact
  70-path inventory and latest asset/Vitest correction.
- `whole-review-package`: exact package/diff for
  `0040b1de1bc196b203014a8e4f94a53babb7e9aa..<reviewed-head>`.

Each producer definition lists exact candidate paths and their count. Across the
eight producers and two review ingestions, candidates are unique. The auxiliary
current-state mutation candidate is the only succeeded candidate intentionally
excluded from the 58-artifact manifest; six historical reports have no producer
candidate. Finalization checks this ownership arithmetic directly rather than
accepting a prose total.
Exact candidate arithmetic is `40 + 1 + 1 + 1 + 1 + 3 + 2 + 2 + 1 + 1 = 53`:
promotion, focused, full, Host, static, task-audits (auxiliary plus two audits),
both two-file packages, and both one-file findings ingestions. Therefore
`53 - 1 auxiliary + 6 historical reports = 58` manifest artifacts.
Implement in small GREEN increments following dependency order, running the
matching named test class after each boundary, but do not commit partial GREEN;
the one implementation commit occurs only after the complete module, mutation,
compile, discovery, and exclusion gates pass.

- [ ] **Step 5: Verify GREEN, compile, and safe mutation proof**

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest "host.test_plan_e_evidence" -v
```

Expected on Windows: exactly 106 tests pass, zero failures/errors/skips.
Require `Ran 106 tests` and final `OK`; zero-test or partial-class success is not
GREEN.

Run the three representative named tests again after the full module; require
`Ran 3 tests`, all `ok`, and final `OK`. This closes the exact named RED smoke
with matching named GREEN evidence.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest "host.test_plan_e_evidence.CliContractTests.test_cli_grammar_accepts_only_fixed_commands_and_producer_kinds" "host.test_plan_e_evidence.CanonicalJsonTests.test_canonical_json_round_trip_is_byte_exact" "host.test_plan_e_evidence.InventoryAndReleaseTests.test_release_staging_and_pyinstaller_exclude_executor" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "from pathlib import Path; compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py', 'exec'); compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_plan_e_evidence.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_plan_e_evidence.py', 'exec')"
```

Expected: exit `0`, no output.

`ExecutorMutationProofTests` is the fixed tracked CLI-test mutation helper; only
this class may mutate the copied CLI. Invoke the whole class once with
the single foreground command below. Within that one Python process, its seven
methods cover receipt allowlisting, retirement full prevalidation, hard-link
candidate atomicity, worktree-head validation, whole-file review coverage, Host
skip policy, and staged/committed blob comparison. Each method creates its own
disposable repository and copied CLI, records the original bytes/SHA-256,
requires one exact source anchor, performs the mutation, observes the matching
behavioral test fail by one intended assertion, and restores the copied CLI in
`finally`. It then requires byte/SHA-256 identity and reruns the behavioral test
GREEN before returning. The class-level fixture performs a final inventory and
byte-restoration check after all seven methods, including exceptional paths.
The primary tracked CLI is read-only throughout; no mutation is committed or
performed against the real repository. Do not invoke separate mutation commands
or claim cross-process `finally` restoration.
The mutation-helper implementation is part of the two-path RED commit, not added
afterward: against the inert CLI shell each method reaches its one final
"implementation not available" assertion and therefore contributes one valid
RED failure without mutating source. Once `plan_e_evidence.py` is implemented,
the unchanged helper activates its one-process disposable-copy mutation path.

The exact behavioral class inventory is `CliContractTests`,
`CanonicalJsonTests`, `PathSafetyTests`, `ReadOnlyCommandTests`,
`MutexLeaseTests`, `CommandReceiptTests`, `CandidatePublicationTests`,
`RetirementTests`, `WorktreeLifecycleTests`, `ResultValidationTests`,
`ReviewGrammarTests`, `FinalReportTests`, `FinalizationTests`, and
`InventoryAndReleaseTests`, followed by the exact helper class
`ExecutorMutationProofTests`. No other `unittest.TestCase` class is permitted in
the module.

Class arithmetic is exact:
`12 + 3 + 2 + 6 + 7 + 6 + 5 + 4 + 4 + 17 + 8 + 5 + 15 + 5 = 99`.

The executable count is locked numerically at 106 total methods: 99 behavioral
contract methods plus 7 mutation-proof methods. Class/method AST inventory and
the test runner's observed `Ran 106 tests` must agree.

**Prior runtime-defect regression map (all known superseded-executor failures):**

| Prior defect class | Locked regression test(s) |
|---|---|
| Process-local PowerShell state/mutex/environment assumed across tool calls | `test_repository_root_is_script_relative_not_ambient_cwd`, `test_mutation_creates_and_rereads_lease_before_state_root`, `test_mutex_releases_last_and_parent_state_restores_on_success_and_failure` |
| State root created before durable lease authority | `test_mutation_creates_and_rereads_lease_before_state_root` |
| Candidate move could overwrite/collide or publish partial bytes | `test_candidate_publication_uses_no_clobber_hard_link_and_reread`, `test_candidate_collision_concurrency_and_crash_preserve_state` |
| Fixed-path artifacts from an older head could be overwritten | `test_candidates_are_head_scoped_and_fixed_paths_wait_for_finalize` |
| Review validator accepted prefix/suffix/unmatched text or weak session input | `test_review_text_requires_exact_whole_file_heading_grammar`, `test_review_input_is_single_snapshot_regular_file_and_not_cleanup_authority`, `test_second_review_must_bind_a_different_declared_session_and_findings_hash` |
| Failed review looked like a crash or produced partial findings | `test_review_rejection_is_clean_terminal_state_not_crash_state` |
| Retirement mutated files before complete prevalidation or left ambiguous partial authority | `test_retirement_requires_complete_dependency_closed_terminal_state`, `test_retirement_atomically_moves_head_authority_then_deletes_quarantine` |
| Host skip parser accepted wrong selector/reason/count | `test_host_results_require_positive_counts_and_exact_skip_policy`, `test_host_result_selectors_and_phase_modules_are_exact` |
| Staged names/counts passed while committed blobs differed | `test_finalizer_compares_every_staged_blob_with_committed_blob` |
| Commit succeeded before checkpoint, creating retry ambiguity | `test_finalizer_uses_commit_tree_and_compare_and_swap_ref_update`, `test_finalizer_resume_reconciles_only_two_exact_ref_states` |
| Read-only preflight refreshed index/fsmonitor or inherited unsafe Git/process environment | `test_preflight_and_status_are_read_only_and_index_byte_exact`, `test_read_only_git_uses_no_optional_locks_and_closed_environment`, `test_fsmonitor_hook_signing_filter_and_helper_effectiveness_blocks` |
| Ignored-only evidence could disappear and Task 6/7 history could be overclaimed | `test_verify_final_is_clean_clone_read_only_and_uses_literal_base`, `test_final_report_rejects_task_6_7_historical_reconstruction_claims`, `test_manifest_is_canonical_exact_58_path_sha256_map` |
| Promotion retry omitted initial/pre-sleep/post-sleep validation or exceeded its retry budget | `test_promotion_result_requires_red_replay_green_mutations_and_sources` plus the complete `PreparingPromotionRetryTests` matrix |
| Release packaging accidentally included internal executor/test files | `test_release_staging_and_pyinstaller_exclude_executor` |
| Test harness touched real repository/profile/mutex state | `test_executor_tests_use_only_disposable_repo_profile_and_temp_roots` |
| Status treated malformed or empty present state as absent/ready | `test_status_classifies_only_absent_ready_or_retained_state` |
| Child output/exception leaked or unbounded capture produced partial receipts | `test_every_command_emits_one_canonical_json_object_and_fixed_exit_code`, `test_child_output_limits_fail_safely_without_partial_receipt` |
| Build failed because tracked public `extension/items.json` was missing/ignored | `test_asset_provenance_build_copy_and_release_safety_are_exact` plus canonical Node asset test |
| Legitimate parameterized/duplicate Vitest rows were rejected by an over-broad identity rule | `test_vitest_results_use_scoped_selector_multiset_identity`, `test_vitest_selector_multiplicity_and_status_are_exact`, `test_vitest_focused_multiset_equals_full_restricted_multiset` |
| Report/finalizer created a final-commit-SHA fixed point or resumed with post-CAS HEAD | `test_final_report_has_no_final_commit_sha_or_post_cas_fixed_point`, `test_status_reviewed_head_field_drives_retirement_and_finalizer_literals` |
| Promotion plan summarized rather than restoring the exact accepted class/separate RED runs | `test_promotion_source_semantics_lock_seams_checkpoints_and_atomic_callsite`, `test_promotion_replay_failures_are_assertions_not_collection_or_setup_errors` |
| Promotion mutations relied on separate authoring calls instead of one owned transaction | `test_promotion_result_requires_red_replay_green_mutations_and_sources`, `test_owned_worktree_create_restore_remove_lifecycle_is_exact`, `test_mutation_worktree_head_validation_is_caught` |

This map is required review input and is reproduced in the report with observed
PASS evidence hashes, not merely asserted in prose.
No executor implementation or test may use either field alone as assertion
identity; static source scans enforce the scoped-Counter contract instead.

The executor implementation may define private helpers needed by these
boundaries, but the Markdown deliberately gives no receipt/state/retirement/
report/finalizer function bodies. Tests target observable contracts and the
small injected adapters, not incidental internal helper count or layout.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest "host.test_plan_e_evidence.ExecutorMutationProofTests" -v
```

Expected: one foreground Python exits `0`; seven mutation/restoration proof tests
pass, and each internally observed one intended assertion failure followed by
byte-identical `finally` restoration and GREEN. Rerun the complete module
afterward and require exactly 106 tests (99 behavioral plus 7 executor mutation
proofs), all passing with no skips.

This one class command is the complete pre-implementation test-quality mutation
gate. Do not invoke its seven methods in separate shell processes and do not use
an external temporary script; the tracked test helper owns mutation, expected
failure, `finally` restoration, hash comparison, and GREEN rerun within this one
foreground Python process.

- [ ] **Step 6: Commit exactly the CLI implementation path**

Run the discovery command below before staging/commit:

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest discover -s "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host" -p "test_plan_e_evidence.py" -v
```

Expected on Windows: `Ran 106 tests`, final `OK`, and no skip. This proves the
new test file participates in documented Host discovery.

Recheck that the only working-tree path differing from executor RED HEAD is
`plan_e_evidence.py`, and that `host/test_plan_e_evidence.py` hashes to the
executor RED blob before staging.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "plan_e_evidence.py"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "feat(evidence): add Plan E evidence executor"
```

Reread exact parent, subject, one path, unchanged RED test blob, clean tracked
status, and empty index. Then proceed to promotion RED.
Do not create evidence state or run `produce` until both promotion commits are
complete and the reviewed head passes preflight.

### 9.6 Windows Preparing-Promotion Retry TDD

This cycle preserves the complete accepted matrix. It does not require or hold
an evidence mutex during edits, tests, staging, or commits. Evidence generation
later replays immutable RED and labels it `RED commit replay`; that replay and
the original observation are process attestations, not cryptographic proof of
wall-clock execution order.

- [ ] **Step 1: Add the complete failing test class**

Modify only `host/test_update_engine_resume.py` with `apply_patch`. Replace its
current leading imports with this exact complete block:

<!-- PROMOTION_IMPORT_BLOCK_START -->

```python
import ast
import inspect
import json
import os
import shutil
import stat
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import update_engine

from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION
from test_update_engine_host import TX
from test_update_support import (
    FakeMutationMutex,
    FaultController,
    InjectedCrash,
    InjectedFault,
    RecordingHooks,
)
from update_engine import (
    PreparedTransactionConflict,
    UpdateEngine,
    UpdateEngineError,
    UpdateEngineHooks,
    UpdateStateConflict,
)
from update_journal import (
    ActiveTransaction,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    TransactionPaths,
    UpdateInitiator,
    read_active_transaction,
)
```
<!-- PROMOTION_IMPORT_BLOCK_END -->

This retains every current import and adds only `inspect`, `os`, `stat`, `time`,
`SimpleNamespace`, `mock`, module `update_engine`, `ActiveTransaction`, and
`read_active_transaction`. Add class
`PreparingPromotionRetryTests(unittest.TestCase)` immediately before
`OwnershipBoundaryTests`. Update
`OwnershipBoundaryTests.test_unittest_class_map_is_exact` by adding exactly
`"PreparingPromotionRetryTests"` to the expected set.

Restore the complete class payload byte-for-byte from committed Plan E plan blob
`476760dee46de0273d4b3beb2b8e5452e790d6df` at
`cba1030baf6508d08d6ce67ac40728ebdd47f199`. Extract only bytes between the
committed `PROMOTION_TEST_CLASS_START/END` markers, including the payload's final
LF. The exact payload is 31,014 UTF-8 bytes, 759 lines, SHA-256
`e64ecfcaa73a7dc62ea0c9216027ac81a907ecc16069fd3076839f1492940815`,
with 13 helper methods and 8 test methods. Before applying it, recompute all
four facts from `git cat-file blob` and stop on drift. Do not reformat, dedent,
rewrite, or reconstruct the class from the summary below. Restore no old
embedded PowerShell/Python promotion executor.

The committed marker pair below is the payload authority. The executor test
suite extracts and hashes this exact committed payload before
authoring/validation, so a summary cannot substitute for the exact bytes.

<!-- PROMOTION_TEST_CLASS_START -->
```python
class PreparingPromotionRetryTests(unittest.TestCase):
    PROMOTION_LABEL = "workspace:promote-preparing"

    JOURNAL_MUTATIONS = {
        "journal-schema-version": ("schema_version", 2),
        "journal-transaction-id": (
            "transaction_id",
            "ffffffffffffffffffffffffffffffff",
        ),
        "journal-phase": ("phase", "staging"),
        "journal-initiator": ("initiator", "installer"),
        "journal-target-version": ("target_version", "9.9.9"),
        "journal-prior-version": ("prior_version", "old-version"),
        "journal-fresh-install": ("fresh_install", True),
        "journal-ownership-digest": ("ownership_sha256", "0" * 64),
        "journal-reason-code": ("reason_code", "host_install_failed"),
        "journal-original-failure": (
            "original_failure_code",
            "host_install_failed",
        ),
        "journal-rollback-from": ("rollback_from", "host-installed"),
        "journal-initiating-process": (
            "initiating_process",
            {"pid": 7, "creation_token": "mutated"},
        ),
        "journal-ownership-path": ("ownership_path", "other.json"),
        "journal-seed-receipt": (
            "seed_receipt",
            {
                "path": "config.json",
                "expected_sha256": "1" * 64,
                "seed_installed": False,
                "observed_live_sha256": None,
            },
        ),
    }

    REVALIDATION_MUTATIONS = (
        "source-disappears",
        "destination-created",
        *JOURNAL_MUTATIONS,
        "ownership-bytes",
        "probe-manifest",
        "host-digest",
        "host-inventory",
        "extension-digest",
        "extension-inventory",
        "extra-workspace-topology",
        "updates-root-symlink",
        "updates-root-reparse",
        "transactions-root-symlink",
        "transactions-root-reparse",
        "preparing-root-symlink",
        "preparing-root-reparse",
        "descendant-symlink",
        "descendant-reparse",
        "descendant-unsupported",
        "updates-root-canonical-escape",
        "transactions-root-canonical-escape",
        "preparing-root-canonical-escape",
        "destination-canonical-escape",
        "state-read-error",
    )

    def _require_retry_implementation(self):
        missing = [
            name
            for name in (
                "_replace_path",
                "_sleep",
                "_is_windows",
                "PROMOTION_RETRY_DELAYS",
                "PROMOTION_TRANSIENT_WINERRORS",
            )
            if not hasattr(update_engine, name)
        ]
        missing.extend(
            name
            for name in (
                "_promote_preparing_with_retry",
                "_require_preparing_promotion_candidate",
            )
            if not hasattr(UpdateEngine, name)
        )
        self.assertEqual(
            missing,
            [],
            "preparing-promotion retry implementation is absent",
        )
        self.assertIs(update_engine._replace_path, os.replace)
        self.assertIs(update_engine._sleep, time.sleep)
        self.assertEqual(update_engine._is_windows, os.name == "nt")
        self.assertEqual(update_engine.PROMOTION_RETRY_DELAYS, (0.05, 0.2))
        self.assertEqual(
            update_engine.PROMOTION_TRANSIENT_WINERRORS,
            frozenset((5, 32, 33)),
        )

    @staticmethod
    def _windows_error(winerror):
        error = OSError("synthetic promotion failure")
        error.winerror = winerror
        return error

    @staticmethod
    def _canonical_json_bytes(value):
        return (
            json.dumps(
                value,
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")

    @staticmethod
    def _tree_snapshot(root):
        if not root.exists():
            return None
        result = {"": ("directory", None)}
        for path in sorted(root.rglob("*"), key=lambda item: item.as_posix()):
            relative = path.relative_to(root).as_posix()
            info = path.lstat()
            if stat.S_ISDIR(info.st_mode):
                result[relative] = ("directory", None)
            elif stat.S_ISREG(info.st_mode):
                result[relative] = ("file", path.read_bytes())
            else:
                result[relative] = ("other", None)
        return result

    def _apply_revalidation_mutation(self, name, paths, faults, external):
        if name == "source-disappears":
            shutil.rmtree(paths.preparing_root)
            return
        if name == "destination-created":
            paths.transaction_root.mkdir()
            return
        if name in self.JOURNAL_MUTATIONS:
            key, replacement = self.JOURNAL_MUTATIONS[name]
            value = json.loads(
                paths.preparing_journal.read_text(encoding="utf-8")
            )
            value[key] = replacement
            paths.preparing_journal.write_bytes(self._canonical_json_bytes(value))
            return
        if name == "ownership-bytes":
            value = json.loads(
                paths.preparing_ownership.read_text(encoding="utf-8")
            )
            value["host_backup_roots"] = ["unexpected"]
            paths.preparing_ownership.write_bytes(
                self._canonical_json_bytes(value)
            )
            return
        if name == "probe-manifest":
            paths.preparing_probe_manifest.write_bytes(
                paths.preparing_probe_manifest.read_bytes() + b" "
            )
            return
        if name == "host-digest":
            (paths.preparing_staged_host / "helper.dll").write_bytes(
                b"mutated-host"
            )
            return
        if name == "host-inventory":
            (paths.preparing_staged_host / "unexpected.dll").write_bytes(
                b"unexpected"
            )
            return
        if name == "extension-digest":
            (paths.preparing_staged_extension / "assets/app.js").write_bytes(
                b"mutated-extension"
            )
            return
        if name == "extension-inventory":
            (paths.preparing_staged_extension / "unexpected.js").write_bytes(
                b"unexpected"
            )
            return
        if name == "extra-workspace-topology":
            (paths.preparing_root / "unexpected.bin").write_bytes(b"unexpected")
            return

        lstat_targets = {
            "updates-root": paths.updates_root,
            "transactions-root": paths.transactions_root,
            "preparing-root": paths.preparing_root,
            "descendant": paths.preparing_staged_host / "_internal",
        }
        if name.endswith("-symlink") or name.endswith("-reparse"):
            component, kind = name.rsplit("-", 1)
            faults["lstat"] = (lstat_targets[component], kind)
            return
        if name == "descendant-unsupported":
            faults["lstat"] = (
                paths.preparing_staged_host / "helper.dll",
                "unsupported",
            )
            return

        resolve_targets = {
            "updates-root": paths.updates_root,
            "transactions-root": paths.transactions_root,
            "preparing-root": paths.preparing_root,
            "destination": paths.transaction_root,
        }
        if name.endswith("-canonical-escape"):
            component = name.removesuffix("-canonical-escape")
            faults["resolve"] = (resolve_targets[component], external)
            return
        if name == "state-read-error":
            faults["read_text"] = paths.preparing_journal
            return
        raise AssertionError(f"unknown revalidation mutation: {name}")

    def _exercise_promotion(
        self,
        replace_outcomes,
        *,
        is_windows=True,
        mutation=None,
        hook_fault=None,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            fixture = MatrixHarness(root, "installed")
            paths = TransactionPaths.for_install(fixture.install, TX)
            external = root / "external"
            external.mkdir()
            if hook_fault is not None:
                fixture.controller.arm(
                    hook_fault,
                    self.PROMOTION_LABEL,
                    InjectedFault,
                )

            live_before = live_snapshot(fixture.install)
            real_replace = os.replace
            real_lstat = Path.lstat
            real_resolve = Path.resolve
            real_read_text = Path.read_text
            real_validator = fixture.engine._require_preparing_promotion_candidate
            replace_calls = []
            replacement_errors = []
            delays = []
            sequence = []
            validation_count = 0
            candidate_snapshot = None
            mutation_applied = False
            faults = {"lstat": None, "resolve": None, "read_text": None}

            def apply_mutation_once():
                nonlocal mutation_applied
                if mutation_applied:
                    return
                self._apply_revalidation_mutation(
                    mutation[1],
                    paths,
                    faults,
                    external,
                )
                mutation_applied = True

            def validating(*args):
                nonlocal candidate_snapshot, validation_count
                validation_count += 1
                sequence.append(("validate", validation_count))
                if candidate_snapshot is None:
                    candidate_snapshot = self._tree_snapshot(paths.preparing_root)
                if (
                    mutation is not None
                    and mutation[0] == "initial"
                    and validation_count == 1
                ):
                    apply_mutation_once()
                if (
                    mutation is not None
                    and mutation[0] == "pre-sleep"
                    and validation_count == 2
                ):
                    apply_mutation_once()
                return real_validator(*args)

            def replacing(source, destination):
                attempt = len(replace_calls) + 1
                replace_calls.append((Path(source), Path(destination)))
                sequence.append(("replace", attempt))
                if callable(replace_outcomes):
                    action = replace_outcomes(attempt)
                elif attempt <= len(replace_outcomes):
                    action = replace_outcomes[attempt - 1]
                else:
                    action = AssertionError(
                        "unexpected additional promotion attempt"
                    )
                if action is None:
                    return real_replace(source, destination)
                if not isinstance(action, BaseException):
                    raise AssertionError("invalid replacement outcome")
                replacement_errors.append(action)
                raise action

            def sleeping(delay):
                delays.append(delay)
                sequence.append(("sleep", delay))
                if mutation is not None and mutation[0] == "post-sleep":
                    apply_mutation_once()

            def lstat(path, *args, **kwargs):
                target = faults["lstat"]
                if target is None or path != target[0]:
                    return real_lstat(path, *args, **kwargs)
                info = real_lstat(path, *args, **kwargs)
                kind = target[1]
                if kind == "symlink":
                    return SimpleNamespace(
                        st_mode=stat.S_IFLNK | stat.S_IMODE(info.st_mode),
                        st_file_attributes=0,
                    )
                if kind == "reparse":
                    return SimpleNamespace(
                        st_mode=info.st_mode,
                        st_file_attributes=0x400,
                    )
                return SimpleNamespace(
                    st_mode=stat.S_IFIFO,
                    st_file_attributes=0,
                )

            def resolve(path, *args, **kwargs):
                target = faults["resolve"]
                if target is not None and path == target[0]:
                    return target[1]
                return real_resolve(path, *args, **kwargs)

            def read_text(path, *args, **kwargs):
                if (
                    faults["read_text"] is not None
                    and path == faults["read_text"]
                ):
                    raise OSError("synthetic state-read failure")
                return real_read_text(path, *args, **kwargs)

            result = None
            outcome_error = None
            with (
                mock.patch.object(update_engine, "_replace_path", replacing),
                mock.patch.object(update_engine, "_sleep", sleeping),
                mock.patch.object(update_engine, "_is_windows", is_windows),
                mock.patch.object(
                    fixture.engine,
                    "_require_preparing_promotion_candidate",
                    side_effect=validating,
                ),
                mock.patch.object(Path, "lstat", lstat),
                mock.patch.object(Path, "resolve", resolve),
                mock.patch.object(Path, "read_text", read_text),
            ):
                try:
                    result = fixture.prepare()
                except Exception as error:
                    outcome_error = error

            active_value = None
            active_error = None
            if paths.active.exists():
                try:
                    active_value = read_active_transaction(paths.active)
                except Exception as error:
                    active_error = error
            events = tuple(fixture.recording.events)
            return {
                "result": result,
                "error": outcome_error,
                "cause": (
                    outcome_error.__cause__
                    if outcome_error is not None
                    else None
                ),
                "attempts": len(replace_calls),
                "replace_calls": tuple(replace_calls),
                "expected_replace": (
                    paths.preparing_root,
                    paths.transaction_root,
                ),
                "replacement_errors": tuple(replacement_errors),
                "delays": tuple(delays),
                "validations": validation_count,
                "sequence": tuple(sequence),
                "candidate_snapshot": candidate_snapshot,
                "preparing_snapshot": self._tree_snapshot(paths.preparing_root),
                "final_snapshot": self._tree_snapshot(paths.transaction_root),
                "preparing_exists": paths.preparing_root.exists(),
                "final_exists": paths.transaction_root.exists(),
                "active_exists": paths.active.exists(),
                "active": active_value,
                "active_error": active_error,
                "live_before": live_before,
                "live_after": live_snapshot(fixture.install),
                "hook_before": sum(
                    kind == "before" and label == self.PROMOTION_LABEL
                    for kind, label in events
                ),
                "hook_after": sum(
                    kind == "after" and label == self.PROMOTION_LABEL
                    for kind, label in events
                ),
            }

    def _assert_replace_calls(self, case, count, label):
        self.assertEqual(
            case["replace_calls"],
            (case["expected_replace"],) * count,
            label,
        )

    def _assert_active_is_exact(self, case, label):
        self.assertIsNone(case["active_error"], label)
        self.assertEqual(
            case["active"],
            ActiveTransaction(1, TX, f"transactions/{TX}/journal.json"),
            label,
        )

    def _assert_first_success(self, case, label):
        self.assertIsNone(case["error"], label)
        self.assertEqual(case["result"].phase, JournalPhase.PREPARED, label)
        self.assertEqual(case["attempts"], 1, label)
        self.assertEqual(case["delays"], (), label)
        self.assertEqual(case["validations"], 1, label)
        self._assert_replace_calls(case, 1, label)
        self.assertFalse(case["preparing_exists"], label)
        self.assertTrue(case["final_exists"], label)
        self.assertEqual(case["final_snapshot"], case["candidate_snapshot"], label)
        self.assertTrue(case["active_exists"], label)
        self._assert_active_is_exact(case, label)
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 1, label)

    def _assert_retry_success(self, case, label):
        self.assertIsNone(case["error"], label)
        self.assertEqual(case["result"].phase, JournalPhase.PREPARED, label)
        self.assertEqual(case["attempts"], 2, label)
        self.assertEqual(case["delays"], (0.05,), label)
        self.assertEqual(case["validations"], 3, label)
        self._assert_replace_calls(case, 2, label)
        self.assertFalse(case["preparing_exists"], label)
        self.assertTrue(case["final_exists"], label)
        self.assertEqual(case["final_snapshot"], case["candidate_snapshot"], label)
        self.assertTrue(case["active_exists"], label)
        self._assert_active_is_exact(case, label)
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 1, label)

    def _assert_exhausted(self, case, label):
        self.assertEqual(case["attempts"], 3, label)
        self.assertEqual(case["delays"], (0.05, 0.2), label)
        self.assertEqual(case["validations"], 5, label)
        self._assert_replace_calls(case, 3, label)
        self.assertIs(type(case["error"]), PreparedTransactionConflict, label)
        self.assertEqual(len(case["replacement_errors"]), 3, label)
        self.assertIs(case["cause"], case["replacement_errors"][-1], label)
        self.assertTrue(case["preparing_exists"], label)
        self.assertFalse(case["final_exists"], label)
        self.assertFalse(case["active_exists"], label)
        self.assertEqual(
            case["preparing_snapshot"],
            case["candidate_snapshot"],
            label,
        )
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 0, label)

    def _assert_not_retried(self, case, original_error, label):
        self.assertEqual(case["attempts"], 1, label)
        self.assertEqual(case["delays"], (), label)
        self.assertEqual(case["validations"], 1, label)
        self._assert_replace_calls(case, 1, label)
        self.assertIs(type(case["error"]), PreparedTransactionConflict, label)
        self.assertIs(case["cause"], original_error, label)
        self.assertTrue(case["preparing_exists"], label)
        self.assertFalse(case["final_exists"], label)
        self.assertFalse(case["active_exists"], label)
        self.assertEqual(
            case["preparing_snapshot"],
            case["candidate_snapshot"],
            label,
        )
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 0, label)

    def _write_promotion_evidence(self, value):
        raw_path = os.environ.get("DH_PROMOTION_EVIDENCE")
        if raw_path is None:
            return
        path = Path(raw_path)
        self.assertTrue(path.is_absolute())
        self.assertTrue(path.parent.is_dir())
        self.assertFalse(path.exists())
        encoded = self._canonical_json_bytes(value)
        self.assertEqual(json.loads(encoded.decode("utf-8")), value)
        with path.open("xb") as stream:
            stream.write(encoded)
            stream.flush()
            os.fsync(stream.fileno())

    def test_windows_access_denied_retries_atomic_preparing_promotion(self):
        self._require_retry_implementation()
        access_denied = self._windows_error(5)
        retry = self._exercise_promotion((access_denied, None))
        self._assert_retry_success(retry, "WinError 5 retry success")
        first_success = self._exercise_promotion((None,))
        self._assert_first_success(first_success, "first-attempt promotion success")
        exhausted = self._exercise_promotion(
            lambda _attempt: self._windows_error(32)
        )
        self._assert_exhausted(exhausted, "aggregate exhausted promotion")
        self._write_promotion_evidence(
            {
                "attempts": {
                    "transient_then_success": retry["attempts"],
                    "exhausted": exhausted["attempts"],
                },
                "delays": {
                    "transient_then_success": list(retry["delays"]),
                    "exhausted": list(exhausted["delays"]),
                },
                "checkpoint_calls": {
                    "first_success": first_success["validations"],
                    "one_retry": retry["validations"],
                    "exhausted": exhausted["validations"],
                },
                "hook_counts": {
                    "retry_success": {
                        "before": retry["hook_before"],
                        "after": retry["hook_after"],
                    },
                    "exhausted": {
                        "before": exhausted["hook_before"],
                        "after": exhausted["hook_after"],
                    },
                },
                "state_and_cause": "passed",
            }
        )

    def test_windows_sharing_errors_32_and_33_are_retryable(self):
        self._require_retry_implementation()
        for winerror in (32, 33):
            injected = self._windows_error(winerror)
            case = self._exercise_promotion((injected, None))
            self._assert_retry_success(case, f"WinError {winerror} retry")
        permission_error = PermissionError("synthetic access denied")
        permission_error.winerror = 5
        permission_case = self._exercise_promotion((permission_error, None))
        self._assert_retry_success(
            permission_case,
            "PermissionError WinError 5 retry",
        )

    def test_persistent_windows_promotion_lock_stops_after_three_attempts(self):
        self._require_retry_implementation()
        case = self._exercise_promotion(lambda _attempt: self._windows_error(32))
        self._assert_exhausted(case, "persistent sharing violation")

    def test_non_windows_or_unlisted_promotion_errors_are_not_retried(self):
        self._require_retry_implementation()

        class IntSubclass(int):
            pass

        non_os_error = RuntimeError("generic promotion failure")
        non_os_error.winerror = 5
        cases = (
            ("non-Windows", False, self._windows_error(5)),
            ("unlisted", True, self._windows_error(87)),
            ("missing-winerror", True, OSError("generic promotion failure")),
            ("non-OSError", True, non_os_error),
            ("boolean-winerror", True, self._windows_error(True)),
            (
                "int-subclass-winerror",
                True,
                self._windows_error(IntSubclass(5)),
            ),
        )
        for label, is_windows, injected in cases:
            case = self._exercise_promotion((injected,), is_windows=is_windows)
            self._assert_not_retried(case, injected, label)

    def test_preparing_promotion_revalidates_before_and_after_sleep(self):
        self._require_retry_implementation()
        first = self._exercise_promotion((None,))
        self.assertEqual(first["sequence"], (("validate", 1), ("replace", 1)))
        self._assert_first_success(first, "first-success sequence")
        retry = self._exercise_promotion((self._windows_error(5), None))
        self.assertEqual(
            retry["sequence"],
            (
                ("validate", 1),
                ("replace", 1),
                ("validate", 2),
                ("sleep", 0.05),
                ("validate", 3),
                ("replace", 2),
            ),
        )
        self._assert_retry_success(retry, "one-retry sequence")
        exhausted = self._exercise_promotion(
            lambda _attempt: self._windows_error(33)
        )
        self.assertEqual(
            exhausted["sequence"],
            (
                ("validate", 1),
                ("replace", 1),
                ("validate", 2),
                ("sleep", 0.05),
                ("validate", 3),
                ("replace", 2),
                ("validate", 4),
                ("sleep", 0.2),
                ("validate", 5),
                ("replace", 3),
            ),
        )
        self._assert_exhausted(exhausted, "exhausted sequence")
        initial_corruption = self._exercise_promotion(
            lambda _attempt: self._windows_error(5),
            mutation=("initial", "extra-workspace-topology"),
        )
        self.assertEqual(initial_corruption["sequence"], (("validate", 1),))
        self.assertIs(
            type(initial_corruption["error"]),
            PreparedTransactionConflict,
        )
        self.assertEqual(initial_corruption["attempts"], 0)
        self.assertEqual(initial_corruption["delays"], ())
        self.assertEqual(initial_corruption["validations"], 1)
        self.assertTrue(initial_corruption["preparing_exists"])
        self.assertFalse(initial_corruption["final_exists"])
        self.assertFalse(initial_corruption["active_exists"])
        self.assertEqual(
            initial_corruption["live_after"],
            initial_corruption["live_before"],
        )
        self.assertEqual(initial_corruption["hook_before"], 1)
        self.assertEqual(initial_corruption["hook_after"], 0)

    def test_preparing_promotion_revalidation_rejects_every_authority_mismatch(
        self,
    ):
        self._require_retry_implementation()
        for checkpoint in ("pre-sleep", "post-sleep"):
            for mutation in self.REVALIDATION_MUTATIONS:
                label = f"{checkpoint}:{mutation}"
                case = self._exercise_promotion(
                    lambda _attempt: self._windows_error(5),
                    mutation=(checkpoint, mutation),
                )
                self.assertIs(
                    type(case["error"]),
                    PreparedTransactionConflict,
                    label,
                )
                self._assert_replace_calls(case, 1, label)
                self.assertEqual(
                    case["delays"],
                    () if checkpoint == "pre-sleep" else (0.05,),
                    label,
                )
                self.assertEqual(
                    case["validations"],
                    2 if checkpoint == "pre-sleep" else 3,
                    label,
                )
                self.assertFalse(case["active_exists"], label)
                self.assertEqual(case["live_after"], case["live_before"], label)
                self.assertEqual(case["hook_before"], 1, label)
                self.assertEqual(case["hook_after"], 0, label)
                self.assertEqual(
                    case["preparing_exists"],
                    mutation != "source-disappears",
                    label,
                )
                self.assertEqual(
                    case["final_exists"],
                    mutation == "destination-created",
                    label,
                )

    def test_preparing_promotion_hooks_wrap_the_logical_operation_once(self):
        self._require_retry_implementation()
        retry = self._exercise_promotion((self._windows_error(5), None))
        self._assert_retry_success(retry, "retry hook counts")
        exhausted = self._exercise_promotion(
            lambda _attempt: self._windows_error(32)
        )
        self._assert_exhausted(exhausted, "exhausted hook counts")
        before_failure = self._exercise_promotion((None,), hook_fault="before")
        self.assertIs(type(before_failure["error"]), PreparedTransactionConflict)
        self.assertIsInstance(before_failure["cause"], InjectedFault)
        self.assertEqual(before_failure["attempts"], 0)
        self.assertEqual(before_failure["delays"], ())
        self.assertEqual(before_failure["validations"], 0)
        self.assertEqual(before_failure["hook_before"], 1)
        self.assertEqual(before_failure["hook_after"], 0)
        self.assertTrue(before_failure["preparing_exists"])
        self.assertFalse(before_failure["final_exists"])
        self.assertFalse(before_failure["active_exists"])
        after_failure = self._exercise_promotion((None,), hook_fault="after")
        self.assertIs(type(after_failure["error"]), PreparedTransactionConflict)
        self.assertIsInstance(after_failure["cause"], InjectedFault)
        self._assert_replace_calls(after_failure, 1, "after-hook failure")
        self.assertEqual(after_failure["attempts"], 1)
        self.assertEqual(after_failure["delays"], ())
        self.assertEqual(after_failure["validations"], 1)
        self.assertEqual(after_failure["hook_before"], 1)
        self.assertEqual(after_failure["hook_after"], 1)
        self.assertFalse(after_failure["preparing_exists"])
        self.assertTrue(after_failure["final_exists"])
        self.assertFalse(after_failure["active_exists"])
        self.assertEqual(after_failure["live_after"], after_failure["live_before"])

    def test_update_engine_constructor_signature_remains_frozen(self):
        signature = inspect.signature(UpdateEngine)
        parameters = signature.parameters
        self.assertEqual(
            tuple(parameters),
            ("install_root", "mutex_factory", "hooks"),
        )
        self.assertIs(
            parameters["install_root"].kind,
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
        )
        self.assertIs(
            parameters["install_root"].default,
            inspect.Parameter.empty,
        )
        self.assertIs(
            parameters["mutex_factory"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        self.assertIs(
            parameters["mutex_factory"].default,
            update_engine.create_windows_mutation_mutex,
        )
        self.assertIs(
            parameters["hooks"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        self.assertIsNone(parameters["hooks"].default)
        self.assertIs(signature.return_annotation, inspect.Signature.empty)
```
<!-- PROMOTION_TEST_CLASS_END -->

Extraction command identity is fixed: absolute Git `cat-file blob
476760dee46de0273d4b3beb2b8e5452e790d6df`, strict UTF-8 marker cardinality one,
and exact byte slice through the LF immediately before the closing fence.

In historical blob `476760dee46de0273d4b3beb2b8e5452e790d6df`, exact LF lines
6331-6381 inclusive are 1,200 bytes with SHA-256
`3fabf4319681a2ca20d315fb6dba013fa64202c68a77aede9efddb4d80749d05`.
Exact LF lines 7146-7152 inclusive are 164 bytes with SHA-256
`90034442966928b182c55bf6e2116a48bc179f467e9e4bbf5f718d70052e780b`.
Recompute both historical regions through absolute `git cat-file blob`, then
require their fenced code payloads to equal the current marked payloads above
and below byte-for-byte. Apply current-file indentation: imports remain at
module column zero; the one class-map string is indented exactly like the
existing set members.

<!-- PROMOTION_CLASS_MAP_EDIT_START -->
```python
"PreparingPromotionRetryTests",
```
<!-- PROMOTION_CLASS_MAP_EDIT_END -->

The payload's eight tests are exactly:
`test_windows_access_denied_retries_atomic_preparing_promotion`,
`test_windows_sharing_errors_32_and_33_are_retryable`,
`test_persistent_windows_promotion_lock_stops_after_three_attempts`,
`test_non_windows_or_unlisted_promotion_errors_are_not_retried`,
`test_preparing_promotion_revalidates_before_and_after_sleep`,
`test_preparing_promotion_revalidation_rejects_every_authority_mismatch`,
`test_preparing_promotion_hooks_wrap_the_logical_operation_once`, and
`test_update_engine_constructor_signature_remains_frozen`. Its helpers/matrices
are the complete accepted behavior; no reduction is permitted.

- [ ] **Step 2: Run RED and prove the failure classification**

Run the class-map constructor control separately, then the following seven
literal stateless RED commands independently. Each command runs one selector,
requires exit `1`, `Ran 1 test`, one assertion `FAIL`, final
`FAILED (failures=1)`, and no import/collection/setup/error/skip/timeout/signal/
zero-match failure. The controller validates that output immediately; the later
promotion producer repeats these commands at immutable RED.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0, str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_update_engine_constructor_signature_remains_frozen" -v
```

Expected: exit `0`, exactly one test and `OK`.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_windows_access_denied_retries_atomic_preparing_promotion" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_windows_sharing_errors_32_and_33_are_retryable" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_persistent_windows_promotion_lock_stops_after_three_attempts" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_non_windows_or_unlisted_promotion_errors_are_not_retried" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_preparing_promotion_revalidates_before_and_after_sleep" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_preparing_promotion_revalidation_rejects_every_authority_mismatch" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.test_preparing_promotion_hooks_wrap_the_logical_operation_once" -v
```

Each command must exit `1` with exactly the required
`FAIL`/`Ran 1 test`/`FAILED (failures=1)` output; any other exit is invalid RED.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0, str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests" -v
```

Expected aggregate diagnostic: exit `1`, `Ran 8 tests`, seven assertion failures, one pass, no
errors/skips; summary remains `FAILED (failures=7)`. Imports and collection
succeed. Before accepting RED, prove the only dirty path is
`host/test_update_engine_resume.py`, the index is empty,
`host/update_engine.py` equals executor-implementation HEAD, and both executor
paths equal their implementation-head blobs.
Reject any untracked third file created by test authoring before the RED commit.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0, str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.OwnershipBoundaryTests.test_unittest_class_map_is_exact" -v
```

Expected: exit `0`, exactly one test and `OK`; the class-map update is complete.

- [ ] **Step 3: Commit the one-path promotion RED**

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "host/test_update_engine_resume.py"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "test(update): cover locked preparing promotion"
```

Reread exact parent, subject, sole path, unchanged production blob, clean
tracked status, and empty index.
Also reread the exact eight-method class and class-map member from the committed
test blob; no helper/selector disappeared during commit normalization.

- [ ] **Step 4: Implement the minimal retry in one production path**

Modify only `host/update_engine.py` with `apply_patch`. Add standard `time` import and exactly
these module-private production seams/constants:

```python
_replace_path = os.replace
_sleep = time.sleep
_is_windows = os.name == "nt"
PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))
PROMOTION_RETRY_DELAYS = (0.05, 0.2)
```

Keep the public `UpdateEngine` constructor byte-for-byte compatible. Add private
`_require_preparing_promotion_candidate(package, candidate, candidate_bytes,
paths, staging) -> None`. It requires absent lexical/canonical destination;
real contained non-reparse install/updates/transactions/preparing parents;
prepared journal equal to complete `transition(staging,
JournalPhase.PREPARED)` including every identity/failure/process/seed field;
exact ownership bytes/digest, probe bytes, Host and Extension tree inventories
and digests; and exact workspace topology containing only `journal.json`,
`ownership.json`, `probe/update-manifest.json`, `staged/host/**`, and
`staged/extension/**` with no unsupported/reparse descendant.

Add private `_promote_preparing_with_retry(package, candidate, candidate_bytes,
paths, staging) -> None`. It:

1. Calls the complete validator before the first attempt.
2. Calls `_replace_path(paths.preparing_root, paths.transaction_root)` at most
   three total times.
3. Retries only when `_is_windows`, the exception is an `OSError`,
   `type(error.winerror) is int`, winerror is exactly `5`, `32`, or `33`, and a
   retry remains.
4. After each classified failure, runs complete validation before sleep, calls
   `_sleep(0.05)` or `_sleep(0.2)`, then runs complete validation again
   immediately before the next replace.
5. On third allowlisted failure, re-raises that original operation error so the
   existing `_run_preparation_operation` wrapper produces the fixed
   `PreparedTransactionConflict` with that error as cause.
6. Lets validation conflict/read/reparse/destination changes fail immediately;
   never retry hook, active write, journal, ownership, copy, probe, candidate,
   or general conflict failures.
The helper returns only after atomic replace succeeds; it does not write active
state or call hooks itself.

Catch only `OSError` around `_replace_path`. The classifier requires
`type(error.winerror) is int`; bool and integer subclasses are rejected. Do not
sleep or revalidate after the final attempt because no next replace remains.

The complete validator runs exactly once on first-attempt success, three times
for one retry, and five times for exhausted three attempts. A validation failure
is already the existing fixed `PreparedTransactionConflict`; an allowlisted
operation failure is wrapped once by the existing preparation wrapper with its
final original error as cause. No raw OS message is persisted, returned, or
newly logged.

Keep exact source comments `# promotion-checkpoint: initial`,
`# promotion-checkpoint: pre-sleep`, and
`# promotion-checkpoint: post-sleep` immediately above the three validator call
sites; the five mutation transformations and semantic source audit bind those
markers plus AST call placement.
Retry delays are constants, not elapsed-time assertions; tests inject `_sleep`
and compare exact calls without waiting in real time.

The validator may reuse existing strict journal/ownership/tree parsers and path
classifiers but must not weaken them. Keep validation in one private method so
initial, pre-sleep, and post-sleep checkpoints cannot drift.

Replace only the existing promotion lambda's `os.replace` call with the private
retry helper inside the same one logical `_run_preparation_operation` call.
Before/after hooks therefore execute once around logical promotion. Active state
is written only after success. Never copy/delete/rebuild the verified candidate
or introduce a non-atomic fallback.
Do not alter labels, journal transitions, ownership/probe/staging logic, active
record shape, or any later update phase.

- [ ] **Step 5: Run GREEN, full resume module, and compile**

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0, str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests" -v
```

Expected: all eight tests pass, no skips.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest discover -s "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host" -p "test_update_engine_resume.py" -v
```

Expected: every current test in the complete module passes, including the exact
class-map test. Record the observed total rather than hard-coding it in prose.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "from pathlib import Path; compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\update_engine.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\update_engine.py', 'exec'); compile(Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_update_engine_resume.py').read_bytes(), r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\test_update_engine_resume.py', 'exec')"
```

Expected: exit `0`, no output.

No authoring-time mutation of `host/update_engine.py` is permitted. The five
promotion mutation definitions belong to the tracked
`host/test_plan_e_evidence.py` contract and are executed only by the promotion
producer after both promotion commits exist. The exact matrix remains:

| Mutation ID | Temporary source mutation | Required failing selector |
|---|---|---|
| `classification` | Disable the exact Windows/int/allowlist classification | `test_windows_access_denied_retries_atomic_preparing_promotion` |
| `bound` | Add a third delay/permit a fourth attempt | `test_persistent_windows_promotion_lock_stops_after_three_attempts` |
| `initial` | Omit initial complete validation | `test_preparing_promotion_revalidates_before_and_after_sleep` |
| `pre-sleep` | Omit validation after classified failure and before sleep | `test_preparing_promotion_revalidation_rejects_every_authority_mismatch` |
| `post-sleep` | Omit validation after sleep and before replace | `test_preparing_promotion_revalidation_rejects_every_authority_mismatch` |

The temporary transformations are exact and each source region must occur once:

- `classification`: replace
  `if not _is_windows or type(winerror) is not int or winerror not in
  PROMOTION_TRANSIENT_WINERRORS or attempt >= len(PROMOTION_RETRY_DELAYS):`
  with `if True:`.
- `bound`: replace `PROMOTION_RETRY_DELAYS = (0.05, 0.2)` with
  `PROMOTION_RETRY_DELAYS = (0.05, 0.2, 0.4)`.
- `initial`: replace the `# promotion-checkpoint: initial` marker plus its one
  complete validator call with `pass  # mutation: omit initial revalidation` at
  the same indentation.
- `pre-sleep`: replace the matching marker plus call with
  `pass  # mutation: omit pre-sleep revalidation`.
- `post-sleep`: replace the matching marker plus call with
  `pass  # mutation: omit post-sleep revalidation`.

`test_promotion_result_requires_red_replay_green_mutations_and_sources` and
`test_promotion_source_semantics_lock_seams_checkpoints_and_atomic_callsite`
in the tracked `host/test_plan_e_evidence.py` lock all five exact
transformations, their one-match AST/text anchors, selector mapping, expected
assertion-only failure, restored GREEN result, transcript paths, and
original/restored blob hashes. The production `promotion` handler
creates one owner-bound detached worktree at reviewed HEAD, records its exact
clean source blobs, temporarily materializes the exact immutable-RED test and
production blobs for RED replay, and restores reviewed-head blobs in `finally`
before GREEN. It then applies all five rows sequentially inside the same
foreground CLI invocation.
For each row it writes only the allowed worktree source, runs the fixed selector,
requires exit `1` with one `FAIL`/`Ran 1 test` and no error/skip, and restores
the original bytes in the handler's `finally` before the next row. It reruns the
selector GREEN, proves exact blob/SHA-256 identity, and records the two
transcripts. After all rows, the same invocation reruns all eight GREEN tests,
requires clean detached status/exact head, removes the worktree non-force through
the tested owner lifecycle, and only then publishes the terminal receipt. Any
mutation, selector, restoration, cleanup, or removal failure retains the
lease/owner/worktree and blocks; it never touches the primary checkout. There is
no authoring-time mutation command, external mutation script execution, or
cross-process restoration claim.

- [ ] **Step 6: Commit the one-path promotion implementation**

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" add -- "host/update_engine.py"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --cached --check
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "fix(update): retry locked preparing promotion"
```

Reread exact direct parent, subject, sole production path, unchanged RED test
blob, clean tracked worktree, and empty index. This commit is the initial
reviewed product/tool head unless a separately accepted fix is later committed.
Rerun all eight promotion selectors from the committed implementation head and
the complete `host.test_update_engine_resume` module before selecting that head.
Use the exact class/module commands printed in Step 5; record observed totals.
Run the read-only CLI `preflight` next; evidence production cannot start until
it returns `preflight_ok` for this literal head.

### 9.7 Scripted Evidence Execution

Each head-bearing command resolves `HEAD` once through the absolute system Git
executable in that same one-line invocation. PowerShell evaluates the
subexpression before starting Python, so the CLI receives one concrete full
40-hex argument; the CLI independently requires that object to remain the
current exact reviewed/final head before mutation. No command depends on a prior
variable, external environment value, branch-name argument, or controller
memory.
The command-level Git lookup is a controller preargument read; the CLI's own
closed preflight still performs all authoritative Git/config/state validation.

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD
```

Expected: one lowercase 40-hex reviewed-head line. Each command below resolves
and passes that same current object independently.

Run preflight and status first. Both are read-only.
If either command returns nonzero, do not run any producer.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" preflight
```

Expected: exit `0`; one canonical JSON line with `schema_version: 1`,
`command: "preflight"`, `status: "ok"`, `code: "preflight_ok"`, exact plan/spec chronology, clean
source/index, six report hashes, Task 6/7 absence, and no incompatible state.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" status
```

Expected before production: exit `0`; `command: "status"`, `status: "ok"`,
`code: "state_absent"`, and an empty authority-path list. Between producers,
expected code is `state_ready` with exact succeeded/rejected terminal producer
IDs and candidate hashes. Malformed/unknown retained state is exit `3`, code
`retained_state`, with only fixed classifications and authority paths.

Run each producer as a separate foreground process in this dependency order.
After each succeeds, run `status` read-only and require `state_ready` with the
new exact terminal ID plus all prior expected IDs before launching the next.
Use the one-line `status` command printed above; it has no head argument or prior
shell dependency.
Producers and review ingestions never stage/commit/change HEAD/ref/index; only
`finalize` owns the final Git mutation.
Do not rerun an already-succeeded producer; status supplies its terminal proof.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind promotion --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind focused-extension --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind full-extension --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind host --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind static --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind task-audits --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind plan-e-review-package --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" produce --kind whole-review-package --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

Expected for each producer: exit `0`; one canonical object with
`command: "produce"`, `status: "ok"`, `code: "producer_succeeded"`, the exact
kind/reviewed head, closed receipt path, exact sorted candidate map, and command
receipt summary. It must not print raw child output. A test/evidence mismatch is
exit `4`; process/I/O failure is exit `5`; both preserve owned state as required.
For `promotion`, this one command is the sole GREEN/mutation evidence operation:
its receipt must prove one owner/lease, one detached-worktree lifecycle, all
seven RED replays plus constructor control, all eight GREEN selectors, all five
mutation failures and restored GREEN reruns, exact source restoration, non-force
worktree removal, and no primary-checkout mutation. Do not run a separate
mutation command before or after it.

Producer output maps each logical final artifact name to its fixed head-scoped
candidate authority and hash. Review dispatch reads the package, diff, and audit
bytes only from those receipt-authorized candidate authorities after `status`
revalidation; `.superpowers/sdd` fixed paths do not exist yet. The controller
does not invent or relocate a candidate path.
Candidate absolute paths are output-only fixed-map resolutions, not accepted
back as arbitrary CLI arguments; ingestion identifies dependencies by kind/head.

Dispatch reviews only after both package producers and frozen audits succeed.
Give each fresh review session the exact package and diff for its range, both
audit files/hashes, both latest scripted/build-Vitest specs, evidence-loss and
Windows retry specs, this
plan, all 70 reviewed paths, relevant source/tests, and the criteria in section
9.8. The controller records the opaque session
ID returned by the orchestration platform and writes the exact returned review
text, byte zero through EOF, to an approved absolute input path. Review input is
outside the repository and is not a candidate. The two commands below contain
the permitted session placeholders; replace each with observed literal values
before execution. Do not trust a remembered summary: the CLI
strictly validates complete input bytes, package/diff/audit hashes, head/range,
grammar, disposition, and the different-session rule.
The CLI's package-producer success JSON supplies the exact candidate paths to
dispatch; the controller uses those observed literal paths only after matching
kind/head/hash, without treating them as later cleanup authority.
Review sessions receive read-only copies/attachments from those exact bytes if
the orchestration system cannot attach Git-common paths directly; the controller
hashes any transport copy and requires equality before dispatch, and the CLI
still validates original candidate hashes during ingestion/finalization.

The two review session markers plus the one validated pre-CAS reviewed-head
marker are the complete command-placeholder allowlist. The controller replaces
the reviewed-head marker from `status.reviewed_head`; it is not review input.
Before replacement, validate each observed session ID against exact regex
`^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$`, require the IDs differ, and place
each observed validated literal between the existing single quotes. Leading
hyphen and apostrophe are excluded, so the value is neither an option nor a
PowerShell expression and no cross-process escaping helper or shell variable is
needed.
The fixed absolute review input paths are populated with exact observed response
bytes; each path is already literal and is not a marker. The controller verifies
each populated input is a regular non-reparse file outside the repository before
calling the CLI. No placeholder is passed literally to the CLI.
Before execution, require no marker prefix remains in the command text.
Review input must be a drive-qualified local path under the approved temporary
parent, never UNC/device/alternate-stream or inside the repository.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" ingest-review --kind plan-e --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD) --session-id 'REPLACE_WITH_OBSERVED_PLAN_E_SESSION_ID' --input "C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-review-returned.md"
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" ingest-review --kind whole --reviewed-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD) --session-id 'REPLACE_WITH_OBSERVED_WHOLE_SESSION_ID' --input "C:\Users\zhaobo\AppData\Local\Temp\opencode\whole-review-returned.md"
```

Expected accepted Plan-E review: exit `0`, `command: "ingest-review"`,
`status: "ok"`, `code: "review_ingested"`, kind `plan-e`, disposition `PASS`,
and exact findings/input/package/diff/audit hashes. Expected accepted whole
review: same status/code with kind `whole` and disposition
`INTERIM PASS THROUGH PLAN E`. Rejected review: exit `4`, `status: "blocked"`,
`code: "review_rejected"`, no findings candidate, and one clean terminal
rejected record.
Only the two accepted/succeeded records proceed to finalization; rejection
requires an accepted correction/regeneration or leaves Plan E blocked.
The CLI reads the complete input once as strict UTF-8 bytes, hashes those exact
bytes, validates byte zero through EOF, and never follows a symlink/reparse
input. It records the input hash but not the external input path as cleanup
authority.
After each accepted/rejected ingestion, run `status`: accepted state is
`state_ready` with the corresponding review terminal and findings hash; clean
rejection is `state_ready` with `rejected` and no candidate, while any retained
owner/temp is `retained_state` and blocks.
Use the fixed one-line status command already printed; no review text/session
value is carried into that invocation.

If a separately accepted fix creates a later reviewed head, first leave old
state untouched for inspection and obtain explicit operator authorization. Then
retire the complete old-head dependency closure in one call. Do not run
retirement for the initial
head, an unapproved descendant, or crash-retained state.
Before running the command, populate `old-head` from the strict `status` record
and `new-head` from the same-command fresh Git resolution; compare the status
record and current head with the accepted fix spec before execution.
Retire before producing any candidate for the new head; fixed-path publication
still waits for finalization, so retirement moves only Git-common head-scoped
authority and never deletes tracked final evidence.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" retire --old-head $((& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" status | ConvertFrom-Json).reviewed_head) --new-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

Expected: exit `0`, `command: "retire"`, `status: "ok"`, code
`head_retired`, both literal heads, and exact retired terminal producer IDs.
Any prevalidation failure changes nothing. Post-quarantine deletion failure is
exit `5` with retained quarantine/lease authority and blocks all automation.
Retirement never stages, commits, or changes HEAD/ref/index.
After successful retirement, rerun `status`; expected `state_absent` when the
complete old closure was retired, or `state_ready` only for an exact unretired
compatible terminal subset. Then rerun every producer at the new literal head.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" status
```

After both accepted review ingestions at one immutable reviewed head, run the
single checkpointed final transaction. First run `status`, require
`state_ready`, copy its validated non-null `reviewed_head`, and substitute that
exact immutable 40-hex literal into the command below. Record that literal
outside process memory. Every resume after CAS uses the same reviewed-head
literal; never substitute current `HEAD`, which is then the evidence commit.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" finalize --reviewed-head REPLACE_WITH_VALIDATED_PRE_CAS_REVIEWED_HEAD_40HEX
```

Expected: exit `0`, `command: "finalize"`, `status: "ok"`, code `finalized`,
the immutable reviewed head, prospective evidence subject/tree/staged blob map,
exact staged manifest/report SHA-256 values, artifact count `58`, commit path
count `60`, and prospective union count `130`. It must not emit actual
final-commit or base-to-final-union PASS, or emit/require/place the final commit
SHA in the committed report. If
interrupted, rerun this exact same literal reviewed-head command only after
`status` identifies a strictly resumable same-token finalizer checkpoint;
otherwise stop for manual authorization.
On resumed success, the canonical result additionally reports the resumed
checkpoint and proves no commit/ref transition was repeated.

Resolve the final commit through absolute Git only for the separate read-only
command below. This is a
read-only clean-clone-verifiable gate and does not depend on local producer state.
It may create/remove only its owned disposable clone while the Git/evidence
validation itself is read-only; it never mutates the source checkout, index,
refs, or retained evidence state and does not acquire the mutation mutex.
It reads no ignored `.superpowers/sdd/.gitignore`, local `plan-e-base.txt`, or
producer state and performs no post-commit `git check-ignore`.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" verify-final --final-head $(& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" rev-parse HEAD)
```

Expected: exit `0`, `command: "verify-final"`, `status: "ok"`, code
`final_verified`, exact final head/parent/subject, artifact count `58`, evidence
count `60`, reviewed count `70`, union count `130`, exact committed manifest and
report SHA-256 values, `final_commit_validation: "PASS"`, and
`base_to_final_union_validation: "PASS"`. These are the only actual final-commit
and 130-path-union PASS claims; they are canonical command output, not committed
report text.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\plan_e_evidence.py" status
```

Expected after successful finalization: exit `0`, canonical `status` result with
`status: "ok"`, `code: "state_absent"`, no authority paths, and no retained
lease/owner/quarantine/worktree/candidate state. Committed evidence is tracked
Git content, not state. Any retained-state classification makes completion
`BLOCKED`.

At this point require: latest commit is the exact 60-path evidence child of the
reviewed head; literal-base range is 130 paths; clean clone validates all 58
manifest entries and report/audit/review/machine/history bindings; no later HEAD
change exists. Plan E is review-ready only, with final whole-branch review still
pending the exact post-D rerun.

### 9.8 Independent Reviews

**Ranges and inputs:**

- `plan_e_only`: base `0dbb4852931b50153fb898b03129ae0092c46404`,
  head the immutable reviewed product/tool head, range
  `0dbb4852931b50153fb898b03129ae0092c46404..<reviewed-head>`, exact 70 paths.
- `original_whole_branch_interim`: base
  `0040b1de1bc196b203014a8e4f94a53babb7e9aa`, same head, range
  `0040b1de1bc196b203014a8e4f94a53babb7e9aa..<reviewed-head>`.

Dispatch prompt for `plan_e_only`: review the complete Plan E range and frozen
audits for Critical/Important correctness, security, data-loss, race/crash,
Windows, protocol, regression, and test gaps; apply all five evidence-loss
criteria; return only the exact 17-heading record below with overall `PASS` or
`BLOCKED`. Dispatch prompt for `original_whole_branch_interim`: independently
review the original-base range through the same head under the same criteria,
do not copy the first review, return only the exact 18-heading record, and use
`INTERIM PASS THROUGH PLAN E` or `BLOCKED`; never claim final Plan D coverage.
If an orchestration platform returns an ID outside the safe regex, do not alter
or escape it into acceptance; redispatch in a session whose observed ID satisfies
the subset or stop for a spec/plan revision.

Both reviewers inspect exact package/diff bytes, the latest spec at
`1efb528282a2fd6a5c926f09d417a30d72f45897`, the scripted spec at
`cba1030baf6508d08d6ce67ac40728ebdd47f199`, the evidence-loss spec at
`d51ca4aabd4a40b91818191424993a8d3ab3cd27`, the Windows retry spec at
`249b1a3750b50db1336fb39661db9306355a1a18`, both frozen audit JSON files,
relevant current-state tests, executor tests, and all reviewed implementation.
The Plan-E reviewer must not inspect only the latest commit. The whole reviewer
must independently inspect the original-base range and must not copy the first
review's findings.

The exact Plan-E findings heading order is:

The file starts at byte zero with the first heading and ends immediately after
the disposition body plus one LF; no title, preamble, epilogue, or hidden text.

```text
## Review Session
## Review Base
## Review Head
## Review Range
## Task 6 Audit SHA-256
## Task 7 Audit SHA-256
## Historical-Report Availability Honesty
## No Reconstructed Historical TDD Claim
## Git Lineage and Source-Blob Accuracy
## Current-State Test and Mutation Sufficiency
## Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition
## Critical
## Important
## Minor
## Testing Gaps
## Declared Session Proof Boundary
## Disposition
```

The whole-branch findings use the same first 16 headings, then exactly:

```text
## Plan D Rerun Requirement
## Disposition
```

Expanded, the exact whole-branch order is `Review Session`, `Review Base`,
`Review Head`, `Review Range`, `Task 6 Audit SHA-256`, `Task 7 Audit SHA-256`,
`Historical-Report Availability Honesty`,
`No Reconstructed Historical TDD Claim`,
`Git Lineage and Source-Blob Accuracy`,
`Current-State Test and Mutation Sufficiency`,
`Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory
Composition`, `Critical`, `Important`, `Minor`,
`Testing Gaps`, `Declared Session Proof Boundary`, `Plan D Rerun Requirement`,
and `Disposition`. There are exactly 18 headings and no preamble/epilogue.

Scalar bodies are exact:

- `Review Session`: the controller-observed opaque session ID.
- `Review Base`, `Review Head`, and `Review Range`: exact package literals.
- Task audit sections: lowercase 64-hex hashes of exact frozen audit bytes.
- Each of the five criteria: exactly `PASS` or `FAIL`.
- `Critical` and `Important`: exactly `None.` for acceptance.
- `Minor` and `Testing Gaps`: exactly `None.` or one or more lines matching
  `- [Minor] repository/relative/path:positive-line - finding text`.
- `Declared Session Proof Boundary`: exactly `These records prove only that two
  different declared orchestration session identifiers were recorded; they do
  not prove reviewer identity, dispatch, independence, or non-collusion.`
- Plan-E disposition: exactly `PASS` only when all criteria pass and no
  Critical/Important finding exists; otherwise `BLOCKED`.
- Whole disposition: exactly `INTERIM PASS THROUGH PLAN E` under the same pass
  rule; otherwise `BLOCKED`.
- Whole Plan-D body: exactly `Rerun git diff --full-index --binary
  "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>" and the full
  original-base controller review after Plan D is committed and before any
  final whole-branch/release-readiness claim.`

The five criteria are historical-report availability honesty; no reconstructed
historical TDD claim; Git lineage and source-blob accuracy; current-state test
and mutation sufficiency; and artifact-durability contract adequacy with the
prospective 58-path inventory. Reviews do not claim the later 60-path evidence
commit exists or is durable. Different declared session IDs prove only the two
recorded values, not reviewer identity, dispatch, independence, or non-collusion.
The reviewers also apply ordinary code-review severity: correctness, security,
data loss, concurrency/crash safety, Windows behavior, protocol/Host-Extension
alignment, regression risk, and missing tests. Any such Critical/Important
finding is recorded in its severity section and blocks regardless of the five
evidence-loss criteria.
Each criterion section body is one scalar line exactly; explanatory findings
belong only in severity/testing sections under their fixed grammar.

Any Critical/Important finding, failed criterion, malformed text, stale hash, or
blocked disposition stops finalization. A permitted fix requires a separately
accepted spec and fresh TDD; the reviewed head changes, so retire the complete
old dependency closure only through the approved CLI call, then rerun every
producer, regenerate both audits and packages, dispatch two fresh reviews, and
ingest both. There is no final whole-branch completion before Plan D; after Plan
D, rerun the exact original-base review through the final D head.
Any change to product, test, plan, audit input, package input, or reviewed head
invalidates both audits and both reviews, even if only one reviewer found it.
Minor or Testing Gaps findings do not change a successful disposition, but every
row, count, and combined hash is retained in findings/report and assessed as a
residual risk; the operator may still choose to require a correction spec.
Review ingestion never invokes a reviewer or reads controller memory; it accepts
only the explicit regular input file and literal session ID supplied to that one
CLI process.
The review-input files are controller-owned transport only. The CLI does not
delete them; the controller may remove them after successful ingestion and
receipt verification, outside executor state authority.

### 9.9 Final Report and Evidence Contract

The CLI owns report generation and validation. Do not hand-edit the report,
manifest, audits, findings, maps, ledgers, scripts, or transcripts. The final
report contains no executable implementation fence; it records contracts,
observations, hashes, and command identities only. The final
report title is exactly `# Plan E Extension Data and Request Hardening Report`
and its level-two headings are exactly this ordered set. The report is UTF-8
without BOM/CR and with exactly one final LF:

```text
## Scope and Constraints
## Commit Map
## Requirement-to-Test Matrix
## A-C Prerequisite and Plan D Handoff Evidence
## Historical Report Availability and Current-State Audits
## RED Evidence
## Restored Mutation Evidence
## Focused Extension Results
## Full Extension and Build Results
## Isolated Host Results
## Static and Diff Results
## Plan D Handoff Result
## Plan-E-Only Controller Review Findings
## Original Whole-Branch Interim Review Findings
## Plan D Final Whole-Branch Rerun Requirement
## Plan E Review Readiness
## Skipped Unsafe Operations
## Residual Risks
```

Within `## Plan E Review Readiness`, the generator emits this exact four-line
shape in order. `[0-9a-f]{64}` below is grammar notation: generated report bytes
contain the computed lowercase SHA-256 of the frozen staged canonical manifest
candidate, never the notation itself or author-entered text:

```text
**Final artifact manifest SHA-256:** `[0-9a-f]{64}`
**Base-to-final union candidate contract:** `130 paths after successful final evidence commit validation`
**Final evidence commit candidate contract:** `60 paths - docs(verification): record Plan E hardening evidence`
**Plan E evidence readiness:** `CANDIDATE READY FOR FINALIZE`
```

The report validator requires all these facts, computed from exact receipts,
candidates, staged blobs, Git history, and committed bytes:

- Literal integration base and immutable reviewed product/tool head. Record the
  fixed evidence subject, exact prospective 60-path inventory/count, and
  requirement that the eventual one-parent evidence commit's parent equals
  reviewed head; do not record a prospective/final tree, complete staged blob
  map, report or manifest Git blob ID, report self-hash, or eventual final
  head/SHA in the report. Record the exact SHA-256 of the already-frozen staged
  canonical artifact manifest; the manifest excludes both itself and the report,
  so this value is not recursive.
- Every relevant commit and exact subject/path: original Plan E plan repair and
  Tasks 1-8 implementation/controller-review-fix commits; boundary correction spec
  `d606f4f9468ba8757bb1894368f2326c8183890d`; Windows retry spec
  `249b1a3750b50db1336fb39661db9306355a1a18`; hardened plan revision
  `1a80affe1b61f2138e94db5e18c99adcc1dc0b3f`; evidence-loss spec
  `d51ca4aabd4a40b91818191424993a8d3ab3cd27`; evidence-loss plan revision
  `782e0b091b5d9159f2eea444966abf6b8154899d`; executor-boundary spec
  `d237ab2ea7aee73114476b3eb19db620321d349f`; latest executor spec
  `cba1030baf6508d08d6ce67ac40728ebdd47f199`; build/Vitest correction spec
  `1efb528282a2fd6a5c926f09d417a30d72f45897`; this plan revision; asset RED and
  asset GREEN; executor RED and implementation; promotion RED and
  implementation; every separately accepted review fix; and final evidence
  subject plus exact path inventory/readiness contract. The committed report
  does not include the prospective/final tree, complete staged blob map,
  report or manifest Git blob ID, report self-hash, or final evidence commit SHA.
- Explicitly record that the scripted executor spec superseded the embedded
  executor, and the latest build/Vitest correction further amends asset TDD,
  selector identity, promotion-class restoration, chronology, and path
  arithmetic while preserving retry, evidence-loss, audit, review, and artifact
  contracts.
- Record each commit as full SHA, single parent, tree, exact subject, exact
  sorted paths, and its role; no abbreviation or subject-only identity is
  sufficient.
- Task 1-5/8 historical report hashes from the locked report table in section
  9.2, each report's exact
  original RED classification/failing assertions, GREEN commands/results,
  mutation names/failing assertions, byte restoration, exact commit(s), staged
  allowlist, review/fix notes, and concerns. Report only facts parsed and
  validated from those immutable reports; do not summarize from controller
  memory.
  Historical report evidence is copied semantically without embedding its old
  executable command fences in the new report; include command identities,
  outputs/counts/hashes, and findings, not a second executor.
- The requirement-to-test matrix maps every Plan E product requirement and each
  executor/retry/evidence invariant to exact test files, selectors, producer
  receipt IDs, and artifact hashes; an unmapped requirement or duplicate
  ownership row blocks report generation.
- In `RED Evidence`, exact lines `Task 6 historical report unavailable` and
  `Task 7 historical report unavailable`. Use the same exact lines in
  `Restored Mutation Evidence`; add no Task 6/7 historical RED/GREEN/mutation/
  edit-order/reviewer/TDD reconstruction prose.
- Under the historical/audit heading, these exact Task 6 forms with the actual
  audit hash: `**Task 6 historical report expected SHA-256:**` with
  `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef`,
  `**Task 6 historical report availability:** `UNRECOVERABLE``,
  `**Task 6 audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD
  TIMELINE NOT RECONSTRUCTED``, and `**Task 6 audit evidence SHA-256:**`.
- Equivalent Task 7 forms with expected hash
  `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f`.
  Audit JSON uses `unrecoverable` and scope
  `current_immutable_commit_state_only`; both
  `historical_report_reconstructed` and
  `historical_tdd_timeline_reconstructed` are exactly false.
- Task 6 current-state checks `PASS`, mutations `PASS - 2/2`; Task 7 checks
  `PASS`; Task 7 current-state mutations `PASS - 1/1`; exact lineage, source
  blobs, named assertions, mutation identities, evidence hashes, and the Task 7
  related cleanup commit.
  State that report absence was established from the accepted investigation's
  historical reads, recovery data, Git objects, bundles, rescued workspaces,
  and examined filesystem evidence, without assigning loss time or cause.
- Promotion original RED process attestation as exactly seven behavior assertion
  failures and one constructor pass before production edit, explicitly narrow
  and not signed timing proof. Separately label later results `RED commit replay`;
  include all seven replay failures, constructor pass, eight GREEN selectors,
  five mutations/restorations, source/map/AST/script hashes, attempts `2/3`,
  delays `0.05/0.2`, validation calls `1/3/5`, hook counts, cause/state, and the
  clean complete resume/update/Host reruns.
- Record the original uncontrolled production observation
  `PermissionError: [WinError 5]` at `.preparing` promotion and the controlled
  open-descendant-handle WinError 5 reproduction whose handle close allowed
  immediate replay. State that these support a transient external-handle
  hypothesis but do not identify the owning process.
- Asset TDD evidence: canonical test/asset/attributes blobs and SHA-256 values,
  one-path RED failure after five-test collection while asset was absent/ignored,
  exact three-path GREEN blobs, five passing tests, local TypeScript/Vite build,
  source/dist byte identity, and public/no-credential provenance.
- Executor RED process attestation as 106 collected assertion failures with no
  errors/skips, direct-child shell/source blobs, GREEN module total 106, seven
  single-process test-helper mutations/restorations, five promotion-producer-
  owned detached-worktree mutation/restoration results from its one invocation,
  complete executor module/discovery totals, source compile results, and
  release/PyInstaller exclusion.
- Exact asset RED one-path and GREEN three-path commit identities/blobs; asset
  provenance/build evidence precedes executor chronology and is included in
  reviewed-source/package/release-safety checks.
- Prior-runtime-defect regression map with each defect class, exact passing
  selector(s), source blob, command receipt, and evidence hash.
- Focused Extension aggregate exact observed files/scoped-selector multisets for
  Plan E, Task 6, and Task 7; full Extension exact files/multiset; exact
  multiplicities, fullName consistency, and all failed/pending/deferred counters
  zero; focused multiset equals full restricted to focused files. Record observed
  totals rather than guessed values.
- Host exact observed totals and passed selector lists for focused,
  Task-7-current, full, update-engine, recovery, package, executor, and compile
  phases. Focused, Task-7-current, update-engine, package, executor, and compile
  have zero skips. Full and recovery each have exactly one authorized skip:
  selector
  `host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation`,
  reason `DH_PLAN_C_FROZEN_ONEDIR not set`. No other skip is accepted.
- TypeScript no-emit, Extension production build to isolated output, Host source
  compile, static/AST/no-coercion scans, tested-source blob binding, no Plan D
  sentinels, version/dependency diff absence, and `git diff --check` all `PASS`.
  Record that TypeScript/Vite/Vitest ran through absolute local Node entry points
  with no npm/npx/network fallback; record source/dist public-asset hash equality.
- Plan A-C prerequisites and the frozen Plan D handoff remain intact; Plan D is
  not implemented by this task. State that Plan D must consume the current Plan
  E parser/acquisition/leased-port/prompt/update contracts and rerun final whole
  review after its own implementation.
- For each review: exact kind, declared opaque session ID, base, head, range,
  package/diff/findings SHA-256, both audit SHA-256 values, five `PASS` criteria,
  exact disposition, zero open Critical/Important findings, Minor and Testing
  Gaps counts and combined hash. Include the narrow declared-session proof
  sentence and no stronger independence claim.
  Recompute every summary field from exact staged findings bytes rather than
  ingestion process memory or package prose.
- Final report records both audit-generation receipt identity and the exact
  review-package/ingestion receipt bindings so a matching narrative hash cannot
  substitute for the reviewed candidate bytes.
- Exact line `**Expanded Plan E range:** `PASS` - 70 paths` because that reviewed
  range already exists before finalization.
- Under `Plan E Review Readiness`, the exact prospective scalar lines are
  the `Final artifact manifest SHA-256` scalar with exactly one lowercase
  64-hex value;
  `**Base-to-final union candidate contract:** `130 paths after successful final
  evidence commit validation``; and `**Final evidence commit candidate
  contract:** `60 paths - docs(verification): record Plan E hardening evidence``.
  The generated report substitutes the exact staged manifest-candidate hash for
  the hexadecimal value; the two candidate lines contain no `PASS` token.
- Exact line `**Plan E evidence readiness:** `CANDIDATE READY FOR FINALIZE``;
  no base-to-final/final-commit/committed/post-CAS/final-cleanup PASS line appears
  in the report.
- The report lists each of the exact 70 reviewed repository paths once under the
  requirement/commit scope and each of the exact 60 evidence commit paths once
  under final inventory; validators compare against Git and marked constants.
- The committed report records candidate evidence readiness only: reviewed head,
  fixed evidence subject, exact prospective path inventory/count, validated
  artifact hashes including the exact staged manifest SHA-256, and required
  post-commit verification contract. It contains no prospective/final tree,
  complete staged blob map, report or manifest Git blob ID, report self-hash,
  final evidence commit SHA, post-CAS/current-HEAD claim, or post-cleanup PASS.
  Prospective tree/index blobs appear only in `finalize` output; actual final
  head, parent, committed blobs, clean clone/index/worktrees, and cleanup appear
  only in read-only `verify-final`/status output.
- Exact SHA-256 for focused/full/Host/static results, both audits, both packages,
  both diffs, both findings, and promotion maps/ledger/transcripts. Manifest
  contains exactly the 58 artifact paths and maps each to exact lowercase
  SHA-256. The report records the exact SHA-256 of those frozen canonical
  manifest bytes. The manifest records neither itself nor the report. Finalizer
  output separately records the staged report SHA-256 and both staged hashes;
  `verify-final` records both committed hashes.
- The report does not contain its own SHA-256. `finalize`/`verify-final` compute
  the staged/committed report SHA-256 externally and emit it only in canonical
  CLI output, eliminating report self-hash and commit-ID fixed points.
- `Skipped Unsafe Operations` states exactly that no real Chrome storage,
  registry, `%LOCALAPPDATA%\DynamicsHelper`, update, package, publish, install,
  MyCases, authenticated model, push, tag, or network operation occurred.
- Residual risks include the two unavailable historical Task 6/7 reports, narrow
  declared-session evidence, prospective review limits, Windows filesystem/
  antivirus timing despite bounded retry, environment-authorized frozen-probe
  skip, every accepted Minor/Testing Gaps row, and Plan D/final whole-branch
  review still outstanding.
- The post-D requirement is exactly the whole-review sentence in section 9.8.
  Never state final whole-branch or release readiness before that rerun passes.
- Plan E Review Readiness in the report is exactly `CANDIDATE READY FOR FINALIZE`
  after all pre-CAS inputs pass. It is not post-CAS PASS, release readiness,
  Plan-D completion, or final whole-branch disposition.

Only `verify-final` canonical output may assert actual final-commit and
base-to-final-union PASS. It emits exact fields
`final_commit_validation: "PASS"` and
`base_to_final_union_validation: "PASS"` only after committed-blob, parent,
subject, 60-addition, 130-union, manifest/report-hash, and clean-clone checks all
succeed. Neither field nor equivalent PASS prose is present in the committed
report or `finalize` result.

Finalization validates all producer receipts/candidates, including the auxiliary
current-state mutation candidate outside the manifest, the six report bytes,
Task 6/7 absence, audit/findings immutability, 58-path artifact set, and report
before staging. It creates the manifest first and the report second using the
frozen manifest SHA-256; it creates only those two files, no-clobber materializes
all other non-historical candidates, force-stages exactly the literal 60 paths,
records every index blob, validates staged hashes/report bindings, creates the
fixed one-parent commit object and CAS-updates the branch from the reviewed
head. Post-validation compares every committed blob with the staged map and
validates a clean clone using only committed bytes and literal base. The exact
reviewed/evidence sets are disjoint and their union is 130.
Staging uses an exact literal path list with pathspec terminator, never wildcard
or broad add.
Candidate-to-fixed-path materialization verifies same bytes/hash and does not
consume or mutate the head-scoped candidate before commit/post-validation.
Both selected review terminal records must be `succeeded`; a clean `rejected`
record is retirement authority only and cannot satisfy finalization.
The final commit's tree is the reviewed-head tree plus exactly those staged 60
blobs; all other tree entries remain identical to reviewed head.
Ignore checks are pre-commit safety checks only; committed/clean-clone
validation uses Git blobs/history and never depends on ignore rules.
The final report is generated only after every input/review receipt is frozen
and before staging; it is not incrementally appended or rewritten after its
validated artifact-map snapshot. It cannot include its own future commit SHA or
any value whose computation depends on that report blob.

The final evidence commit is the sole permitted HEAD change after reviews. It
has one parent equal to both audit subjects and both review heads. Any other
post-review head change invalidates final readiness and requires regeneration;
after the evidence commit, any further head change also invalidates readiness.
Finalization verifies the primary branch ref still equals the reviewed head
immediately before tree/commit creation and again as the old value in CAS; a
concurrent head/ref change blocks without overwriting it.
The commit changes all 60 paths as additions relative to reviewed head; none may
exist in the reviewed parent tree.

Before successful state cleanup, finalization atomically renames the complete
selected reviewed-head state directory to its token-bound quarantine and updates
the lease. Cleanup deletes only within that quarantine. Failure before rename
changes no authority; failure after rename leaves quarantine and checkpoint for
inspection and blocks later automation.
Report generation describes only candidate readiness and prospective
commit/cleanup contracts. Post-commit validator and CLI result provide actual
commit/cleanup status; `verify-final` is the completion authority.

### 9.10 Definition of Done and Fail-Stop Rules

- [ ] Latest design authority is exact full SHA
  `1efb528282a2fd6a5c926f09d417a30d72f45897`; this plan is its exact one-path
  direct child with subject `docs(update): integrate Plan E build prerequisites`.
- [ ] Asset RED is the next one-path child with canonical test blob/subject;
  asset GREEN is its exact three-path child with canonical blobs/subject, five
  passing Node tests, and source/dist build identity.
- [ ] Executor RED is a two-path direct child with exactly 106 assertion failures,
  no collection errors; executor GREEN is the next one-path child and passes all
  behavioral tests, helper mutation suites, compile, and release exclusion.
- [ ] Promotion RED is the next one-path child, with seven assertion failures and
  constructor pass; committed class payload is exact 31,014 bytes/759 lines/
  required SHA; promotion implementation is its one-path child and passes the
  full accepted matrix, complete resume suite, and compile. Its later single
  `produce --kind promotion` invocation owns/proves all five mutations and exact
  restoration in one detached-worktree lifecycle before final evidence.
- [ ] The reviewed head contains exactly the sorted 70 paths; the CLI and test
  paths are tested-source roots; no version/dependency or Plan D path changed.
- [ ] No unrelated product/test/doc file or guide changed; release/PyInstaller
  exclusion tests prove the executor is not shipped.
- [ ] Accepted authority specs remain byte-identical to their commits.
- [ ] All eight produce records and both review-ingestion terminal records are
  complete for one immutable reviewed head; Task 6/7 audits predate reviews and
  prove current state only; both review packages and complete review text are
  hash-bound.
- [ ] Plan-E disposition is `PASS`; whole disposition is
  `INTERIM PASS THROUGH PLAN E`; five criteria pass, Critical/Important are
  `None.`, and declared session IDs are valid and different under the narrow
  claim boundary.
- [ ] Session IDs satisfy exact safe regex and are single-quoted literals;
  first character is alphanumeric, leading hyphen/punctuation and shell
  metacharacters are rejected by executor tests, and finalizer/resume uses the
  same validated pre-CAS reviewed-head literal.
- [ ] No clean rejected review remains when finalizing; rejected state is
  retired/regenerated after an accepted fix and both final ingestions are
  succeeded at the selected head.
- [ ] Finalization commits exactly the literal 60 paths with fixed subject and
  parent equal to reviewed head; manifest has exactly 58 entries; clean-clone
  `verify-final` proves all 60 are additions, exact `70/60/130` paths, and
  committed blob hashes. The report contains the exact SHA-256 of the staged
  manifest candidate, which must equal the later committed manifest bytes, but
  no report self-hash or final commit SHA; actual final-commit/union PASS exists
  only in `verify-final` canonical output.
- [ ] `status` after successful finalization reports no retained incompatible
  state; `verify-final` remains independently runnable from a clean clone using
  only the final SHA and committed bytes.
- [ ] Controller-owned review transport inputs are removed after successful
  receipt verification or explicitly retained outside the repository with no
  role in completion evidence; no temporary executor/debug file remains in the
  repository.
- [ ] Final report contains every fact in section 9.9 and no Task 6/7 historical
  overclaim, unresolved marker, guessed total, final commit SHA/self-reference,
  base-to-final/final-commit/post-CAS/cleanup PASS, or final whole-branch claim.
  It includes the staged manifest SHA-256 and candidate-contract wording only.
- [ ] No push, publish, tag, release, install, registry, AppData, browser,
  network, authenticated model, MyCases, real update, broad reset, forced
  worktree removal, prune, or automatic crash cleanup occurred.
- [ ] Primary checkout is exact final HEAD with empty index/status, expected
  committed evidence only, and no extra/prunable linked worktree registration.

On any failure, stop. Preserve the lease, owner, candidate, receipt, worktree
registration, quarantine, index, HEAD, and checkpoint exactly as the CLI left
them. Do not infer ownership from names, inspect PID liveness as cleanup
authority, adopt state, overwrite a candidate, delete a retained path, unstage,
reset, rewrite HEAD, prune, or force-remove. Run the read-only `status` command,
record its canonical classification and exact authority paths, and obtain manual
authorization before any recovery or retirement. `status` never repairs state.
Only an exact same-token finalizer resume or retirement of a dependency-closed
terminal set (including a clean rejected-review record) is automated by this
contract.
Do not rerun a failed ordinary producer with the same or different head while
its crash state remains; status/manual inspection comes first.
Do not use antivirus/process-handle investigation as deletion authority; it may
inform human diagnosis only.

If review findings require a fix, status remains a reporting tool, not approval.
The operator must first accept a new correction spec with exact paths/subject;
only then may code TDD and the explicit old-head retirement/regeneration flow
run. Manual authorization is recorded outside retained state and cannot be
invented by the CLI.
Human recovery of crash-retained state likewise requires a separate accepted
recovery procedure; this plan defines no cleanup command beyond strict
retirement/finalizer resume.

Plan E completion is `DONE` only after `verify-final` returns exit `0` and code
`final_verified` **and** the final `status` returns `state_absent`. It is
`DONE_WITH_CONCERNS` only for explicitly recorded
non-blocking residual risks after all hard gates pass. Any retained/malformed
state, failed test/mutation/review, inventory/hash/chronology mismatch, recovered
Task 6/7 report, unauthorized head change, or forbidden operation is `BLOCKED`.
These status words describe Task 9 execution only. `DONE` does not authorize
push/publish/release/install and does not claim final whole-branch readiness.
The committed report's prospective readiness line is subordinate to these
post-commit CLI gates.
Controller-owned review input files and other approved temporary transport files
must also be removed or explicitly retained outside the repository before the
clean-repository completion claim; they are never evidence authority.

After the evidence commit, the primary checkout must have exact final HEAD,
empty index, no tracked/untracked unexpected repository file, no extra linked
worktree/prunable registration, and only the committed evidence paths under the
fixed final artifact locations.
