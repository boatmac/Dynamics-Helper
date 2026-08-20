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

## Task 9: Final Verification, Evidence, and Plan E Review Readiness

**Files:**
- Authorized modify: `host/update_engine.py`
- Authorized modify: `host/test_update_engine_resume.py`
- Create: `.superpowers/sdd/plan-e-extension-hardening-report.md`
- Create review artifacts that are ignored before final force-add and committed afterward: `.superpowers/sdd/plan-e-only-review-package.txt`, `.superpowers/sdd/plan-e-only-review.diff`, `.superpowers/sdd/plan-e-only-review-findings.md`, `.superpowers/sdd/original-whole-branch-interim-review-package.txt`, `.superpowers/sdd/original-whole-branch-interim-review.diff`, `.superpowers/sdd/original-whole-branch-interim-review-findings.md`
- Create ignored promotion executors/integrity records: `.superpowers/sdd/invoke-promotion-test.ps1`, `.superpowers/sdd/run-promotion-mutations.ps1`, `.superpowers/sdd/promotion-executor.sha256`, `.superpowers/sdd/promotion-mutation-runner.sha256`, `.superpowers/sdd/promotion-ast.sha256`
- Create ignored promotion phase/source records: `.superpowers/sdd/promotion-red-source.sha256`, `.superpowers/sdd/promotion-green-source.sha256`, `.superpowers/sdd/promotion-mutation-source.sha256`, `.superpowers/sdd/promotion-red.sha256.json`, `.superpowers/sdd/promotion-green.sha256.json`, `.superpowers/sdd/promotion-mutation.sha256.json`, `.superpowers/sdd/promotion-transcripts.sha256.json`, `.superpowers/sdd/promotion-observed.json`, `.superpowers/sdd/promotion-ledger.json`
- Create exactly 26 ignored transcript leaves under `.superpowers/sdd/promotion-transcripts/`: eight `red/<method>.txt`, eight `green/<method>.txt`, and two leaves for each of `mutation-classification`, `mutation-bound`, `mutation-initial`, `mutation-pre-sleep`, and `mutation-post-sleep`, with exact names defined in Step 0
- Create final verification/manifest evidence that is ignored before final force-add and committed afterward: `.superpowers/sdd/focused-extension-results.json`, `.superpowers/sdd/full-extension-results.json`, `.superpowers/sdd/host-test-results.json`, `.superpowers/sdd/reviewed-head-verification.json`, `.superpowers/sdd/final-artifacts.sha256.json`
- Create canonical replacement audits: `.superpowers/sdd/task-6-audit-evidence.json`, `.superpowers/sdd/task-7-audit-evidence.json`
- Consume without modifying: `.superpowers/sdd/task-1-report.md` through `.superpowers/sdd/task-5-report.md` and `.superpowers/sdd/task-8-report.md`
- Require absent: `.superpowers/sdd/task-6-report.md`, `.superpowers/sdd/task-7-report.md`

**Interfaces:**
- Consumes: committed Tasks 1-8, the six recovered exact historical reports, the locked but unavailable Task 6/7 report identities, committed Task 6/7 implementation lineage, authoritative specs, the authorized Windows promotion retry correction, and the literal immutable Plan E base `0dbb4852931b50153fb898b03129ae0092c46404`.
- Produces: two canonical current-state audits, reproducible final gate evidence, one Plan-E-only review package/findings record, and one required original-base interim whole-branch package/findings record. Task 9 changes no release or other documentation; blocking review fixes may add focused product/test commits before the evidence-only commit and force complete audit/review regeneration. The interim whole-branch review is not final branch-review completion because Plan D is absent.
- Out of scope: reconstructing reports/TDD, changing Task 6/7 behavior or Windows retry design, Plan D/release/installer/registry/AppData/browser/user/authenticated state, deleting recovery sources, and any push/tag/publish/install/real-update operation.

Tasks 1-8 were completed before this revision. Exact reports 1-5 and 8 remain
historical authority and retain their original hashes. The accepted historical
identities for Tasks 6 and 7 also remain locked, but their exact report paths are
absent and no complete matching bytes were recovered from the historical reads,
recovery data, Git objects, bundles, rescued workspaces, and filesystem evidence
examined by the accepted investigation. `availability: unrecoverable` means only
not recovered from those examined sources as of audit generation; it does not
claim logical impossibility. If either path later appears, execution stops: an
exact hash match requires a contract revision that restores that report, and a
nonmatching file is rejected. Never synthesize, approximate, summarize, or claim
to reconstruct either missing report or its historical RED/GREEN/mutation/TDD
timeline.
The locked hashes were observed historically, but a hash observation is never
treated as recoverable report bytes.
Both exact paths are absent in the recovered checkout and remained absent in all
examined sources.
Never combine a later-recovered exact report with its replacement audit in one
completion set; stop and revise the contract to restore the report as authority.
This is internal engineering evidence loss only: Task 6/7 implementation/test
commits remain reachable, and no user configuration, Chrome storage, prompt,
case, installed product, authentication, or release artifact is affected.

Thus audit `availability: unrecoverable` means only not recovered from those
enumerated and examined sources as of generation. It does not assert
impossibility from an unknown source; the later-recovery stop rule remains
mandatory.

Before Task 9 Step 0, run this planning chronology and historical-report
preflight. It binds the accepted amendment commit, requires this revised plan to
be its direct one-path child with the exact subject, and preserves all eight
locked report hashes while requiring only reports 1-5 and 8 to exist.
Those six surviving reports remain byte-for-byte unchanged throughout Task 9;
generation/reset never rewrites them, and validators recheck locked hashes before
manifest creation and after commit.
They are force-added unchanged in the final evidence set despite the ignore rule.
This editing session is planning only: run no Task 9 executor block until this
one-path revision has been reviewed and committed with the required subject.
No Host or Extension path may be edited until that committed-plan preflight
passes and the worktree is clean.

```powershell
$ErrorActionPreference='Stop'
$expectedTaskReportHashes=[ordered]@{
    '1'='678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba'
    '2'='edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7'
    '3'='5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591'
    '4'='5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2'
    '5'='323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73'
    '6'='3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef'
    '7'='49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f'
    '8'='3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b'
}
if ($expectedTaskReportHashes.Count -ne 8 -or (@($expectedTaskReportHashes.Keys) -join ',') -cne '1,2,3,4,5,6,7,8') { throw 'Locked Task report hash inventory mismatch' }
$amendmentCommit='d51ca4aabd4a40b91818191424993a8d3ab3cd27'
$amendmentPath='docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md'
$planPath='docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
$planCommit=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $planCommit.Count -ne 1 -or $planCommit[0].Trim() -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve revised Plan E plan commit'
}
$planCommit=$planCommit[0].Trim()
$amendmentSubject=@(& git show -s --format=%s $amendmentCommit)
$amendmentPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $amendmentCommit)
$planSubject=@(& git show -s --format=%s $planCommit)
$planParent=@(& git rev-parse "$planCommit^")
$planPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $planCommit)
if (
    $LASTEXITCODE -ne 0 -or
    $amendmentSubject.Count -ne 1 -or
    $amendmentSubject[0] -cne 'docs(evidence): define Plan E report-loss boundary' -or
    $amendmentPaths.Count -ne 1 -or $amendmentPaths[0] -cne $amendmentPath -or
    $planSubject.Count -ne 1 -or
    $planSubject[0] -cne 'docs(update): integrate Plan E evidence-loss audit' -or
    $planParent.Count -ne 1 -or $planParent[0].Trim() -cne $amendmentCommit -or
    $planPaths.Count -ne 1 -or $planPaths[0] -cne $planPath
) { throw 'Plan E amendment -> revised-plan chronology is invalid' }
foreach ($number in @(1,2,3,4,5,8)) {
    $path=".superpowers/sdd/task-$number-report.md"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "BLOCKED: exact surviving historical report is missing: $path"
    }
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -cne $expectedTaskReportHashes[[string]$number]) {
        throw "BLOCKED: historical Task $number report does not match its locked SHA-256"
    }
}
foreach ($number in @(6,7)) {
    $path=".superpowers/sdd/task-$number-report.md"
    if (Test-Path -LiteralPath $path) {
        $actual=if (Test-Path -LiteralPath $path -PathType Leaf) {
            (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
        } else { '' }
        if ($actual -ceq $expectedTaskReportHashes[[string]$number]) {
            throw "BLOCKED: exact Task $number report was recovered; revise the evidence contract before proceeding"
        }
        throw "BLOCKED: unexpected nonmatching Task $number report path exists"
    }
}
$recoveryPath='.superpowers/sdd/2026-07-18-hardening-e-extension-data/task-report-recovery.md'
if (Test-Path -LiteralPath $recoveryPath) {
    $recoveryHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $recoveryPath).Hash.ToLowerInvariant()
    if ($recoveryHash -cne '0c2905ea665ee190cd9725c63385e402dcdf490e71154097b2285fd674d1266f') {
        throw 'Diagnostic recovery record hash mismatch'
    }
}
```

The diagnostic recovery record, when present and hash-valid, may be cited only
as investigation context. It is not promoted, not included in the 58-artifact
manifest, and not a substitute historical report; final readiness does not
depend on its continued local availability.

Task 9 may maintain an ignored narrative verification log for diagnostics, but
it is not an authority and no completion gate trusts its prose. The authoritative
inputs are the committed code/spec/plan, canonical promotion ledger, hash-bound
scripts/transcripts, freshly regenerated review packages/diffs, controller
findings, and the final committed evidence report. Historical BLOCKED logs remain
diagnostic only and are summarized honestly in final evidence.

Step 0 also creates `.superpowers/sdd/promotion-ledger.json` as canonical JSON
(UTF-8 without BOM, sorted keys, compact separators). Its exact schema is:

```json
{
  "schema_version": 1,
  "plan_commit": "<40hex>",
  "spec_commit": "249b1a3750b50db1336fb39661db9306355a1a18",
  "executor_sha256": "<64hex>",
  "mutation_runner_sha256": "<64hex>",
  "red_methods": ["<7 exact method names>"],
  "constructor_red_phase": "passed",
  "green_methods": ["<8 exact method names>"],
  "mutation_passes": ["classification","bound","initial","pre-sleep","post-sleep"],
  "attempts": {"transient_then_success": 2,"exhausted": 3},
  "delays": {"transient_then_success": [0.05],"exhausted": [0.05,0.2]},
  "checkpoint_calls": {"first_success": 1,"one_retry": 3,"exhausted": 5},
  "hook_counts": {"retry_success": {"before": 1,"after": 1},"exhausted": {"before": 1,"after": 0}},
  "state_and_cause": "passed",
  "test_commit": "<40hex>",
  "promotion_commit": "<40hex-or-empty-before-commit>",
  "update_engine_sha256": "<64hex>",
  "update_engine_test_sha256": "<64hex>",
  "observed_sha256": "<64hex>",
  "transcript_map_sha256": "<64hex>",
  "red_map_sha256": "<64hex>",
  "green_map_sha256": "<64hex>",
  "mutation_map_sha256": "<64hex>",
  "red_source_record_sha256": "<64hex>",
  "green_source_record_sha256": "<64hex>",
  "mutation_source_record_sha256": "<64hex>",
  "ast_record_sha256": "<64hex>"
}
```

The ledger is a post-commit aggregation. Chronology is anchored separately by
the pre-implementation RED map, pre-commit GREEN map, pre-commit mutation map,
and pre-commit AST record. After the promotion commit, construct the ledger once
from those immutable phase maps plus the observed JSON and commit SHA, then
strict-reread every exact key/value before Step 1. Both ignored script hashes and
all transcript hashes are stored in the canonical maps and summarized in final
evidence.

After the read-only planning/report preflight above and before **any** Task 9
write, reset, temporary, owner record, child writer, mutation, staging, or
commit, run this exact bootstrap block. It acquires the one fixed mutex and then
creates the fixed canonical run lease as the first write. Only after the lease
is durably reread does it create the token root and temporary owner. There is no
mutex-only Step 0 and no owner-before-lease interval.

The lease has one fixed closed schema in both phases. `phase=step0` binds the
revised-plan start head and has `reviewed_head: null`; after the direct
plan -> RED -> implementation chain is committed, it transitions atomically to
`phase=evidence`, records all 40 Step 0 artifact hashes, and binds the resolved
immutable reviewed product head. A rerun after an allowed focused controller fix
starts directly in `phase=evidence` after read-only validation of that same
chronology and the pre-existing Step 0 hashes. Keep the foreground controller,
lease, owner, and mutex alive through Step 11 and owner-only release.

```powershell
$ErrorActionPreference='Stop'
$script:PlanECanonicalRepository='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'
$actualRepository=[IO.Path]::GetFullPath((Resolve-Path -LiteralPath '.').Path).TrimEnd('\')
if ($actualRepository -cne $script:PlanECanonicalRepository) { throw 'BLOCKED: Plan E canonical repository identity mismatch' }
$identityHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($script:PlanECanonicalRepository.ToLowerInvariant()))).ToLowerInvariant()
if ($identityHash -cne '06c4d8bd3362d15338256bedfa50915d338721b89391276e9d05ac57ccbffe7c') { throw 'BLOCKED: canonical repository mutex identity hash mismatch' }
$script:PlanEMutexName='Local\DynamicsHelper.PlanE.06c4d8bd3362d15338256bedfa50915d338721b89391276e9d05ac57ccbffe7c'
$script:PlanEMutex=[Threading.Mutex]::new($false,$script:PlanEMutexName)
$script:PlanEMutexOwned=$false
$script:PlanEMutexAbandoned=$false
$script:PlanEToken=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(16)).ToLowerInvariant()
$script:PlanESurvivingReportHashes=[ordered]@{
    '.superpowers/sdd/task-1-report.md'='678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba'
    '.superpowers/sdd/task-2-report.md'='edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7'
    '.superpowers/sdd/task-3-report.md'='5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591'
    '.superpowers/sdd/task-4-report.md'='5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2'
    '.superpowers/sdd/task-5-report.md'='323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73'
    '.superpowers/sdd/task-8-report.md'='3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b'
}
$script:PlanESurvivingReportPaths=@($script:PlanESurvivingReportHashes.Keys | Sort-Object)
$script:PlanEDiagnosticRelativePaths=@('child-edit-map.md','progress.md','recovery-fix-round-1.diff','recovery-review-working.diff','recovery-task-1-report.md','task-report-recovery.md') | Sort-Object
$script:PlanEDiagnosticPrefix='.superpowers/sdd/2026-07-18-hardening-e-extension-data/'
$script:PlanEDiagnosticPaths=@($script:PlanEDiagnosticRelativePaths | ForEach-Object { $script:PlanEDiagnosticPrefix + $_ })
$script:PlanEOptionalLocalSafetyPaths=@('.superpowers/sdd/plan-e-base.txt')
$gitCommon=@(& git rev-parse --git-common-dir)
if ($LASTEXITCODE -ne 0 -or $gitCommon.Count -ne 1) { throw 'Could not resolve Git common directory' }
$gitCommonPath=[IO.Path]::GetFullPath((Join-Path $script:PlanECanonicalRepository $gitCommon[0].Trim()))
$script:PlanELeasePath=Join-Path $gitCommonPath 'plan-e-evidence-run-lease.json'
$script:PlanELeaseTransitionPath=Join-Path $gitCommonPath "plan-e-evidence-run-lease.$script:PlanEToken.transition.tmp"
$knownTempParent='C:\MyWorkbench\Repository\.Dynamics-Helper-prompt-scope-spec-plan-e-audit'
$leaseKeys=@('allowed_relative_paths','audit_temporaries','canonical_repository','lease_token','lease_transition_temporary','mutable_artifacts','mutation_source_paths','mutation_worktrees','phase','pid','process_creation_utc_ticks','reviewed_head','run_start_head','schema_version','step0_artifact_sha256','step0_artifacts','step0_temporaries','temporary_owner_record','temporary_root','worktree_owner_records')
$ownerKeys=@('allowed_relative_paths','canonical_repository','external_temporaries','lease_token','phase','primary_branch','reviewed_head','run_start_head','schema_version','temporary_root')
function ConvertTo-PlanEBootstrapCanonicalBytes {
    param([Parameter(Mandatory=$true)]$Value)
    $json=$Value | ConvertTo-Json -Depth 40 -Compress
    return ,([Text.UTF8Encoding]::new($false).GetBytes($json + "`n"))
}
function Assert-PlanEJsonElementCanonical {
    param([Parameter(Mandatory=$true)][Text.Json.JsonElement]$Element,[string]$Path='$')
    if ($Element.ValueKind -eq [Text.Json.JsonValueKind]::Object) {
        $names=@()
        foreach ($property in $Element.EnumerateObject()) {
            if ($names -ccontains $property.Name) { throw "Duplicate JSON key at $Path.$($property.Name)" }
            $names += $property.Name
            Assert-PlanEJsonElementCanonical -Element $property.Value -Path "$Path.$($property.Name)"
        }
        if (($names -join "`n") -cne ((@($names | Sort-Object -CaseSensitive)) -join "`n")) { throw "JSON object keys are not ordinal-sorted at $Path" }
    } elseif ($Element.ValueKind -eq [Text.Json.JsonValueKind]::Array) {
        $index=0
        foreach ($item in $Element.EnumerateArray()) { Assert-PlanEJsonElementCanonical -Element $item -Path "$Path[$index]"; $index++ }
    } elseif ($Element.ValueKind -eq [Text.Json.JsonValueKind]::Number) {
        $number=$Element.GetRawText()
        if ($number -match '(?i)nan|infinity') { throw "Non-finite JSON number at $Path" }
    }
}
function Read-PlanEStrictCanonicalRecord {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string[]]$ExpectedKeys)
    $bytes=[IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { throw "Record has a BOM: $Path" }
    $text=[Text.UTF8Encoding]::new($false,$true).GetString($bytes)
    if ($text.Contains("`r") -or -not $text.EndsWith("`n") -or $text.EndsWith("`n`n")) { throw "Record encoding/newline is noncanonical: $Path" }
    $document=$null
    try {
        $document=[Text.Json.JsonDocument]::Parse($text)
        Assert-PlanEJsonElementCanonical -Element $document.RootElement
    } catch { throw "Record JSON is invalid, duplicate, non-finite, or unsorted: $Path" }
    finally { if ($null -ne $document) { $document.Dispose() } }
    $value=$text | ConvertFrom-Json -AsHashtable
    $actualKeys=@($value.Keys)
    if ($actualKeys.Count -ne $ExpectedKeys.Count -or @($actualKeys | Where-Object { $_ -isnot [string] -or $ExpectedKeys -cnotcontains $_ }).Count -ne 0) { throw "Record closed-key mismatch: $Path" }
    $canonical=[byte[]](ConvertTo-PlanEBootstrapCanonicalBytes -Value $value)
    if ([Convert]::ToHexString($bytes) -cne [Convert]::ToHexString($canonical)) { throw "Record canonical-byte mismatch: $Path" }
    return $value
}
function Test-PlanEExactStringArray {
    param([AllowNull()]$Actual,[Parameter(Mandatory=$true)][string[]]$Expected)
    if ($Actual -isnot [object[]] -or @($Actual).Count -ne $Expected.Count -or @($Actual | Where-Object { $_ -isnot [string] }).Count -ne 0) { return $false }
    for ($index=0; $index -lt $Expected.Count; $index++) { if ($Actual[$index] -cne $Expected[$index]) { return $false } }
    return $true
}
function Test-PlanEStringFields {
    param([Parameter(Mandatory=$true)][Collections.IDictionary]$Value,[Parameter(Mandatory=$true)][string[]]$Keys)
    return @($Keys | Where-Object { $Value[$_] -isnot [string] }).Count -eq 0
}
function Get-PlanEPathInventoryDelta {
    param([string[]]$Actual,[string[]]$Allowed,[string[]]$Required)
    return [ordered]@{
        missing=@($Required | Where-Object { $Actual -cnotcontains $_ })
        extra=@($Actual | Where-Object { $Allowed -cnotcontains $_ })
    }
}
function Assert-PlanEIgnoredTopology {
    param(
        [Parameter(Mandatory=$true)][string]$Context,
        [string[]]$ExpectedStep0Artifacts=@(),
        [string[]]$CurrentRunArtifacts=@(),
        [string[]]$AllowedOptionalPaths=@(),
        [bool]$RequireSurvivingReports=$true
    )
    foreach ($path in @('.superpowers/sdd/task-6-report.md','.superpowers/sdd/task-7-report.md')) {
        if (Test-Path -LiteralPath $path) { throw "BLOCKED: unavailable historical report path exists during $Context`: $path" }
    }
    foreach ($entry in $script:PlanESurvivingReportHashes.GetEnumerator()) {
        if (-not (Test-Path -LiteralPath $entry.Key -PathType Leaf)) { if ($RequireSurvivingReports) { throw "BLOCKED: surviving report is missing during $Context`: $($entry.Key)" }; continue }
        $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Key).Hash.ToLowerInvariant()
        if ($actual -cne $entry.Value) { throw "BLOCKED: surviving report hash mismatch during $Context`: $($entry.Key)" }
    }
    $records=@(& git status --porcelain=v1 --ignored --untracked-files=all -- '.superpowers/sdd')
    if ($LASTEXITCODE -ne 0) { throw "BLOCKED: could not inspect ignored topology during $Context" }
    $ignoredPaths=@()
    foreach ($record in $records) {
        if ($record -notmatch '^!! (.+)$') { throw "BLOCKED: non-ignored/unexpected evidence status during $Context`: $record" }
        $ignoredPaths += $Matches[1].Replace('\','/')
    }
    $allowed=@('.superpowers/sdd/.gitignore') + $script:PlanESurvivingReportPaths + $script:PlanEDiagnosticPaths + $script:PlanEOptionalLocalSafetyPaths + @($ExpectedStep0Artifacts) + @($CurrentRunArtifacts) + @($AllowedOptionalPaths)
    $allowed=@($allowed | Sort-Object -Unique)
    $required=@('.superpowers/sdd/.gitignore') + @($ExpectedStep0Artifacts) + @($CurrentRunArtifacts)
    if ($RequireSurvivingReports) { $required += $script:PlanESurvivingReportPaths }
    $required=@($required | Sort-Object -Unique)
    $delta=Get-PlanEPathInventoryDelta -Actual $ignoredPaths -Allowed $allowed -Required $required
    if ($delta.missing.Count -ne 0 -or $delta.extra.Count -ne 0) { throw "BLOCKED: ignored topology mismatch during $Context. Missing: $($delta.missing -join ', '); Extra: $($delta.extra -join ', ')" }
    $basePath='.superpowers/sdd/plan-e-base.txt'
    if ($ignoredPaths -ccontains $basePath) {
        $expected=[Text.UTF8Encoding]::new($false).GetBytes('0dbb4852931b50153fb898b03129ae0092c46404' + "`n")
        if ([Convert]::ToHexString([IO.File]::ReadAllBytes($basePath)) -cne [Convert]::ToHexString($expected)) { throw "BLOCKED: local base evidence hash mismatch during $Context" }
    }
    $recoveryPath=$script:PlanEDiagnosticPrefix + 'task-report-recovery.md'
    if ($ignoredPaths -ccontains $recoveryPath -and (Get-FileHash -Algorithm SHA256 -LiteralPath $recoveryPath).Hash.ToLowerInvariant() -cne '0c2905ea665ee190cd9725c63385e402dcdf490e71154097b2285fd674d1266f') { throw "BLOCKED: recovery diagnostic hash mismatch during $Context" }
    return @($ignoredPaths | Sort-Object)
}
function Get-PlanERetainedPathDiagnostics {
    param([Parameter(Mandatory=$true)][string]$Root)
    $paths=@()
    if (-not (Test-Path -LiteralPath $Root)) { return $paths }
    $pending=[Collections.Generic.Stack[string]]::new()
    $pending.Push([IO.Path]::GetFullPath($Root))
    while ($pending.Count -gt 0) {
        $current=$pending.Pop()
        $paths += $current
        $info=Get-Item -LiteralPath $current -Force
        if ($info -is [IO.DirectoryInfo] -and ($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            foreach ($child in @(Get-ChildItem -LiteralPath $current -Force)) { $pending.Push([IO.Path]::GetFullPath($child.FullName)) }
        }
    }
    return @($paths | Sort-Object -Unique)
}
function Get-PlanERetainedWorktreeRegistrations {
    param([Parameter(Mandatory=$true)][string]$Root)
    $lines=@(& git worktree list --porcelain 2>$null)
    if ($LASTEXITCODE -ne 0) { return @('<worktree-list-unavailable>') }
    $paths=@()
    foreach ($line in @($lines | Where-Object { $_ -like 'worktree *' })) {
        try {
            $path=[IO.Path]::GetFullPath($line.Substring(9))
            if ($path -ceq $Root -or $path.StartsWith($Root + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { $paths += $path }
        } catch { $paths += '<invalid-worktree-registration>' }
    }
    return @($paths | Sort-Object -Unique)
}
function Get-PlanERetainedRunDiagnostic {
    param([Parameter(Mandatory=$true)][string]$Classification)
    $diagnostic=@($Classification,$script:PlanELeasePath,$knownTempParent)
    foreach ($entry in @(Get-ChildItem -LiteralPath $gitCommonPath -Force -Filter 'plan-e-evidence-run-lease.*.transition.tmp' -ErrorAction SilentlyContinue)) { $diagnostic += $entry.FullName }
    if (Test-Path -LiteralPath $script:PlanELeasePath) {
        try {
            $retained=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $leaseKeys
            if (-not (Test-PlanEStringFields -Value $retained -Keys @('canonical_repository','lease_token','lease_transition_temporary','phase','run_start_head','temporary_owner_record','temporary_root')) -or $retained.lease_token -notmatch '^[0-9a-f]{32}$') { throw 'invalid retained lease scalar types' }
            $expectedTransition=Join-Path $gitCommonPath "plan-e-evidence-run-lease.$($retained.lease_token).transition.tmp"
            $expectedAuditTemporaries=@((Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-6-audit-evidence.$($retained.lease_token).tmp"),(Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-7-audit-evidence.$($retained.lease_token).tmp")) | Sort-Object
            if ($retained.canonical_repository -cne $script:PlanECanonicalRepository -or $retained.temporary_root -cne (Join-Path $knownTempParent $retained.lease_token) -or $retained.temporary_owner_record -cne (Join-Path $retained.temporary_root 'owner.json') -or $retained.lease_transition_temporary -cne $expectedTransition -or -not (Test-PlanEExactStringArray -Actual $retained.audit_temporaries -Expected $expectedAuditTemporaries)) { throw 'invalid retained lease binding' }
            $diagnostic += @($expectedTransition,$retained.temporary_root,$retained.temporary_owner_record)
            $diagnostic += $expectedAuditTemporaries
            $diagnostic += @(Get-PlanERetainedPathDiagnostics -Root $retained.temporary_root)
            if (Test-Path -LiteralPath $retained.temporary_owner_record) {
                try {
                    $retainedOwner=Read-PlanEStrictCanonicalRecord -Path $retained.temporary_owner_record -ExpectedKeys $ownerKeys
                    $expectedExternal=@($expectedTransition) + @($expectedAuditTemporaries)
                    $expectedExternal=@($expectedExternal | Sort-Object)
                    if (-not (Test-PlanEStringFields -Value $retainedOwner -Keys @('canonical_repository','lease_token','phase','primary_branch','run_start_head','temporary_root')) -or -not (Test-PlanEExactStringArray -Actual $retainedOwner.external_temporaries -Expected $expectedExternal) -or $retainedOwner.lease_token -cne $retained.lease_token -or $retainedOwner.canonical_repository -cne $script:PlanECanonicalRepository -or $retainedOwner.temporary_root -cne $retained.temporary_root) { throw 'invalid retained owner binding' }
                } catch { $diagnostic += '<owner-record-malformed>' }
            } else { $diagnostic += '<owner-record-missing>' }
        } catch { $diagnostic += '<lease-record-malformed>' }
    } else { $diagnostic += '<lease-record-missing>' }
    if (Test-Path -LiteralPath $knownTempParent) {
        $diagnostic += @(Get-PlanERetainedPathDiagnostics -Root $knownTempParent)
        $parentInfo=Get-Item -LiteralPath $knownTempParent -Force
        if ($parentInfo -is [IO.DirectoryInfo] -and ($parentInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            foreach ($tokenRoot in @(Get-ChildItem -LiteralPath $knownTempParent -Directory -Force | Where-Object { $_.Name -cmatch '^[0-9a-f]{32}$' })) {
                $ownerPath=Join-Path $tokenRoot.FullName 'owner.json'
                $diagnostic += $ownerPath
                if (Test-Path -LiteralPath $ownerPath) {
                    try {
                        $ownerValue=Read-PlanEStrictCanonicalRecord -Path $ownerPath -ExpectedKeys $ownerKeys
                        $expectedTransition=Join-Path $gitCommonPath "plan-e-evidence-run-lease.$($tokenRoot.Name).transition.tmp"
                        $expectedExternal=@($expectedTransition,(Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-6-audit-evidence.$($tokenRoot.Name).tmp"),(Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-7-audit-evidence.$($tokenRoot.Name).tmp")) | Sort-Object
                        if (-not (Test-PlanEStringFields -Value $ownerValue -Keys @('canonical_repository','lease_token','phase','primary_branch','run_start_head','temporary_root')) -or $ownerValue.lease_token -cne $tokenRoot.Name -or $ownerValue.canonical_repository -cne $script:PlanECanonicalRepository -or $ownerValue.temporary_root -cne $tokenRoot.FullName -or -not (Test-PlanEExactStringArray -Actual $ownerValue.external_temporaries -Expected $expectedExternal)) { throw 'invalid retained owner binding' }
                    } catch { $diagnostic += '<owner-record-malformed>' }
                } else { $diagnostic += '<owner-record-missing>' }
            }
        } else { $diagnostic += '<temporary-parent-unsafe>' }
    }
    $diagnostic += @(Get-PlanERetainedWorktreeRegistrations -Root $knownTempParent)
    return @($diagnostic | Sort-Object -Unique)
}
function Release-PlanEBlockedStartMutex {
    if ($script:PlanEMutexOwned) { $script:PlanEMutex.ReleaseMutex(); $script:PlanEMutexOwned=$false }
    $script:PlanEMutex.Dispose()
}
$script:PlanEProspectiveStep0TranscriptMethods=@('test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen')
$script:PlanEProspectiveStep0MutationMethods=[ordered]@{classification='test_windows_access_denied_retries_atomic_preparing_promotion';bound='test_persistent_windows_promotion_lock_stops_after_three_attempts';initial='test_preparing_promotion_revalidates_before_and_after_sleep';'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch';'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'}
$script:PlanEProspectiveStep0Artifacts=@('.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1','.superpowers/sdd/promotion-executor.sha256','.superpowers/sdd/promotion-mutation-runner.sha256','.superpowers/sdd/promotion-red-source.sha256','.superpowers/sdd/promotion-green-source.sha256','.superpowers/sdd/promotion-mutation-source.sha256','.superpowers/sdd/promotion-observed.json','.superpowers/sdd/promotion-ledger.json','.superpowers/sdd/promotion-transcripts.sha256.json','.superpowers/sdd/promotion-red.sha256.json','.superpowers/sdd/promotion-green.sha256.json','.superpowers/sdd/promotion-mutation.sha256.json','.superpowers/sdd/promotion-ast.sha256')
foreach ($method in $script:PlanEProspectiveStep0TranscriptMethods) { $script:PlanEProspectiveStep0Artifacts += ".superpowers/sdd/promotion-transcripts/red/$method.txt"; $script:PlanEProspectiveStep0Artifacts += ".superpowers/sdd/promotion-transcripts/green/$method.txt" }
foreach ($entry in $script:PlanEProspectiveStep0MutationMethods.GetEnumerator()) { $script:PlanEProspectiveStep0Artifacts += ".superpowers/sdd/promotion-transcripts/mutation-$($entry.Key)/$($entry.Value).txt"; $script:PlanEProspectiveStep0Artifacts += ".superpowers/sdd/promotion-transcripts/mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$script:PlanEProspectiveStep0Artifacts=@($script:PlanEProspectiveStep0Artifacts | Sort-Object -Unique)
if ($script:PlanEProspectiveStep0Artifacts.Count -ne 40) { throw 'BLOCKED: prospective Step 0 artifact inventory mismatch' }
$preLeaseStep0Present=@($script:PlanEProspectiveStep0Artifacts | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
if ($preLeaseStep0Present.Count -notin @(0,40)) { throw "BLOCKED: partial Step 0 evidence exists before lease acquisition: $($preLeaseStep0Present.Count)/40" }
$preLeaseExpectedStep0=if ($preLeaseStep0Present.Count -eq 40) { $script:PlanEProspectiveStep0Artifacts } else { @() }
$pathSetSelfTest=Get-PlanEPathInventoryDelta -Actual @('required','unexpected') -Allowed @('required') -Required @('required','missing')
if ($pathSetSelfTest.missing.Count -ne 1 -or $pathSetSelfTest.missing[0] -cne 'missing' -or $pathSetSelfTest.extra.Count -ne 1 -or $pathSetSelfTest.extra[0] -cne 'unexpected') { throw 'BLOCKED: exact ignored-topology allowlist self-test failed' }
$script:PlanEPreLeaseIgnoredPaths=Assert-PlanEIgnoredTopology -Context 'pre-lease bootstrap' -ExpectedStep0Artifacts $preLeaseExpectedStep0 -CurrentRunArtifacts @() -AllowedOptionalPaths @() -RequireSurvivingReports $true
$script:PlanEBlockedDiagnosticClasses=@('<abandoned-mutex-acquired>','<diagnostic-read-failed>','<mutex-held-by-another-owner>','<retained-lease>','<retained-path-without-lease>','<lease-record-malformed>','<lease-record-missing>','<owner-record-malformed>','<owner-record-missing>','<temporary-parent-unsafe>')
if ($script:PlanEBlockedDiagnosticClasses.Count -ne 10 -or $script:PlanEBlockedDiagnosticClasses -cnotcontains '<lease-record-malformed>' -or $script:PlanEBlockedDiagnosticClasses -cnotcontains '<owner-record-malformed>') { throw 'BLOCKED: retained-run diagnostic classification contract mismatch' }
try {
    try { $script:PlanEMutexOwned=$script:PlanEMutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] {
        $script:PlanEMutexOwned=$true
        $script:PlanEMutexAbandoned=$true
        try { $diagnostic=Get-PlanERetainedRunDiagnostic -Classification '<abandoned-mutex-acquired>' }
        catch { $diagnostic=@('<abandoned-mutex-acquired>','<diagnostic-read-failed>',$script:PlanELeasePath,$knownTempParent) }
        finally { Release-PlanEBlockedStartMutex }
        throw "BLOCKED: abandoned Plan E evidence mutex requires human inspection; no cleanup performed: $($diagnostic -join ', ')"
    }
    if (-not $script:PlanEMutexOwned) {
        try { $diagnostic=Get-PlanERetainedRunDiagnostic -Classification '<mutex-held-by-another-owner>' } catch { $diagnostic=@('<mutex-held-by-another-owner>','<diagnostic-read-failed>',$script:PlanELeasePath,$knownTempParent) }
        $script:PlanEMutex.Dispose()
        throw "BLOCKED: Plan E evidence mutex is already held; no cleanup performed: $($diagnostic -join ', ')"
    }
    if (Test-Path -LiteralPath $script:PlanELeasePath) {
        try { $diagnostic=Get-PlanERetainedRunDiagnostic -Classification '<retained-lease>' } catch { $diagnostic=@('<retained-lease>','<diagnostic-read-failed>',$script:PlanELeasePath,$knownTempParent) }
        Release-PlanEBlockedStartMutex
        throw "BLOCKED: retained Plan E run requires operator inspection; no cleanup performed: $($diagnostic -join ', ')"
    }
    $retainedTransitions=@(Get-ChildItem -LiteralPath $gitCommonPath -Force -Filter 'plan-e-evidence-run-lease.*.transition.tmp' -ErrorAction SilentlyContinue)
    if ($retainedTransitions.Count -ne 0 -or (Test-Path -LiteralPath $knownTempParent)) {
        try { $diagnostic=Get-PlanERetainedRunDiagnostic -Classification '<retained-path-without-lease>' } catch { $diagnostic=@('<retained-path-without-lease>','<diagnostic-read-failed>',$script:PlanELeasePath,$knownTempParent) }
        Release-PlanEBlockedStartMutex
        throw "BLOCKED: retained Plan E paths require operator inspection; no cleanup performed: $($diagnostic -join ', ')"
    }
} catch {
    if ($script:PlanEMutexOwned) { Release-PlanEBlockedStartMutex }
    throw
}
function Assert-PlanEMutexOwner { if (-not $script:PlanEMutexOwned) { throw 'BLOCKED: Plan E mutex ownership was lost' } }
Assert-PlanEMutexOwner
$script:PlanEGitCommand=(Get-Command git.exe -ErrorAction Stop).Source
$script:PlanENpmCommand=(Get-Command npm.cmd -ErrorAction Stop).Source
$script:PlanENodeCommand=(Get-Command node.exe -ErrorAction Stop).Source
$script:PlanEPythonCommand=(Resolve-Path -LiteralPath 'host\venv\Scripts\python.exe').Path
$script:PlanEPowerShellCommand=(Get-Process -Id $PID).Path
foreach ($toolPath in @($script:PlanEGitCommand,$script:PlanENpmCommand,$script:PlanENodeCommand,$script:PlanEPythonCommand,$script:PlanEPowerShellCommand)) {
    $tool=Get-Item -LiteralPath $toolPath -Force
    if ($tool -isnot [IO.FileInfo] -or ($tool.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: Plan E tool is missing or a reparse point: $toolPath" }
}
$script:PlanERunStartHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $script:PlanERunStartHead.Count -ne 1 -or $script:PlanERunStartHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'BLOCKED: could not resolve Task 9 run start head' }
$script:PlanERunStartHead=$script:PlanERunStartHead[0].Trim()
$script:PlanEPlanPath='docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
$script:PlanEAmendmentCommit='d51ca4aabd4a40b91818191424993a8d3ab3cd27'
$script:PlanEPlanCommit=@(& git log -1 --format=%H $script:PlanERunStartHead -- $script:PlanEPlanPath)
if ($LASTEXITCODE -ne 0 -or $script:PlanEPlanCommit.Count -ne 1) { throw 'BLOCKED: could not resolve the amendment plan commit' }
$script:PlanEPlanCommit=$script:PlanEPlanCommit[0].Trim()
$planCommitCandidates=@(& git rev-list --reverse "$script:PlanEAmendmentCommit..$script:PlanERunStartHead" -- $script:PlanEPlanPath)
if ($LASTEXITCODE -ne 0 -or $planCommitCandidates.Count -ne 1 -or $planCommitCandidates[0].Trim() -cne $script:PlanEPlanCommit) { throw 'BLOCKED: reviewed history contains a later Plan E plan rewrite' }
$planParent=@(& git rev-parse "$script:PlanEPlanCommit^")
$planSubject=@(& git show -s --format=%s $script:PlanEPlanCommit)
$planPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $script:PlanEPlanCommit)
if ($LASTEXITCODE -ne 0 -or $planParent.Count -ne 1 -or $planParent[0].Trim() -cne $script:PlanEAmendmentCommit -or $planSubject.Count -ne 1 -or $planSubject[0] -cne 'docs(update): integrate Plan E evidence-loss audit' -or $planPaths.Count -ne 1 -or $planPaths[0] -cne $script:PlanEPlanPath) { throw 'BLOCKED: amendment Plan E plan commit is not the exact one-path amendment child' }
$script:PlanEStep0TranscriptMethods=@($script:PlanEProspectiveStep0TranscriptMethods)
$script:PlanEStep0MutationMethods=[ordered]@{};foreach ($entry in $script:PlanEProspectiveStep0MutationMethods.GetEnumerator()) { $script:PlanEStep0MutationMethods[$entry.Key]=$entry.Value }
$script:PlanEStep0Artifacts=@($script:PlanEProspectiveStep0Artifacts)
if ($script:PlanEStep0Artifacts.Count -ne 40) { throw 'BLOCKED: bootstrap Step 0 artifact inventory mismatch' }
$script:PlanETempParent=$knownTempParent
$script:PlanETempRoot=Join-Path $script:PlanETempParent $script:PlanEToken
$script:PlanETempOwnerPath=Join-Path $script:PlanETempRoot 'owner.json'
$script:PlanEStep0TempRoot=Join-Path $script:PlanETempRoot 'step0-temporaries'
$script:PlanEStep0Temporaries=@(
    (Join-Path $script:PlanEStep0TempRoot 'env-class-red'),
    (Join-Path $script:PlanEStep0TempRoot 'env-selector'),
    (Join-Path $script:PlanEStep0TempRoot 'env-green-suite'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-executor-sha256.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-red-map.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-red-source.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-green-map.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-green-source.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-map.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-runner-sha256.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-source.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-ast.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-observed.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-transcript-map.tmp'),
    (Join-Path $script:PlanEStep0TempRoot 'promotion-ledger.tmp')
)
foreach ($method in $script:PlanEStep0TranscriptMethods) { $script:PlanEStep0Temporaries += Join-Path $script:PlanEStep0TempRoot "red-$method.tmp"; $script:PlanEStep0Temporaries += Join-Path $script:PlanEStep0TempRoot "green-$method.tmp" }
foreach ($entry in $script:PlanEStep0MutationMethods.GetEnumerator()) { $script:PlanEStep0Temporaries += Join-Path $script:PlanEStep0TempRoot "mutation-$($entry.Key)-failure.tmp"; $script:PlanEStep0Temporaries += Join-Path $script:PlanEStep0TempRoot "mutation-$($entry.Key)-restored.tmp" }
$script:PlanEStep0Temporaries=@($script:PlanEStep0Temporaries | Sort-Object -Unique)
if ($script:PlanEStep0Temporaries.Count -ne 41 -or @($script:PlanEStep0Temporaries | Where-Object { Test-Path -LiteralPath $_ }).Count -ne 0) { throw 'BLOCKED: bootstrap Step 0 temporary inventory mismatch' }
$presentStep0=@($script:PlanEStep0Artifacts | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
$script:PlanERunPhase=if ($presentStep0.Count -eq 0 -and $script:PlanERunStartHead -ceq $script:PlanEPlanCommit) { 'step0' } elseif ($presentStep0.Count -eq 40) { 'evidence' } else { throw 'BLOCKED: partial Step 0 artifact inventory requires operator inspection' }
$script:PlanEReviewedHead=if ($script:PlanERunPhase -ceq 'evidence') { $script:PlanERunStartHead } else { $null }
$postPlan=@(& git rev-list --reverse "$script:PlanEPlanCommit..$script:PlanERunStartHead")
if ($script:PlanERunPhase -ceq 'step0' -and $postPlan.Count -ne 0) { throw 'BLOCKED: fresh Step 0 head contains unexpected descendants' }
if ($script:PlanERunPhase -ceq 'evidence') {
    if ($postPlan.Count -lt 2) { throw 'BLOCKED: evidence rerun lacks direct RED/implementation commits' }
    $redCommit=$postPlan[0]; $implementationCommit=$postPlan[1]
    if ((@(& git rev-parse "$redCommit^")[0].Trim()) -cne $script:PlanEPlanCommit -or (@(& git show -s --format=%s $redCommit)[0]) -cne 'test(update): cover locked preparing promotion' -or (@(& git rev-parse "$implementationCommit^")[0].Trim()) -cne $redCommit -or (@(& git show -s --format=%s $implementationCommit)[0]) -cne 'fix(update): retry locked preparing promotion') { throw 'BLOCKED: plan -> RED -> implementation chronology mismatch' }
    $integrationPaths=@(& git diff --name-only --no-renames "0dbb4852931b50153fb898b03129ae0092c46404..$implementationCommit")
    $previousFixParent=$implementationCommit
    foreach ($fixCommit in @($postPlan | Select-Object -Skip 2)) {
        $parents=@(& git show -s --format=%P $fixCommit); $subject=@(& git show -s --format=%s $fixCommit); $paths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $fixCommit)
        if ($LASTEXITCODE -ne 0 -or $parents.Count -ne 1 -or $parents[0].Trim() -cne $previousFixParent -or $subject.Count -ne 1 -or $subject[0] -cnotmatch '^(test|fix|docs)\(review\): .+' -or @($paths | Where-Object { $integrationPaths -cnotcontains $_ }).Count -ne 0 -or @($paths | Where-Object { $_ -in @($script:PlanEPlanPath,'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md','docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md','docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md','host/update_engine.py','host/test_update_engine_resume.py') }).Count -ne 0) { throw "BLOCKED: unauthorized focused controller-fix commit: $fixCommit" }
        $previousFixParent=$fixCommit
    }
}
$script:PlanEAuditTemporaries=@((Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-6-audit-evidence.$script:PlanEToken.tmp"),(Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-7-audit-evidence.$script:PlanEToken.tmp")) | Sort-Object
$script:PlanEExternalTemporaries=@($script:PlanELeaseTransitionPath) + @($script:PlanEAuditTemporaries)
$script:PlanEExternalTemporaries=@($script:PlanEExternalTemporaries | Sort-Object)
$script:PlanEMutationSourcePaths=@('host/test_update_engine_resume.py','host/update_engine.py') | Sort-Object
$script:PlanEMutableArtifacts=@('.superpowers/sdd/focused-extension-results.json','.superpowers/sdd/full-extension-results.json','.superpowers/sdd/host-test-results.json','.superpowers/sdd/reviewed-head-verification.json','.superpowers/sdd/final-artifacts.sha256.json','.superpowers/sdd/plan-e-only-review-package.txt','.superpowers/sdd/plan-e-only-review.diff','.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-package.txt','.superpowers/sdd/original-whole-branch-interim-review.diff','.superpowers/sdd/original-whole-branch-interim-review-findings.md','.superpowers/sdd/plan-e-extension-hardening-report.md','.superpowers/sdd/task-6-audit-evidence.json','.superpowers/sdd/task-7-audit-evidence.json') | Sort-Object
$preexistingMutableAtBootstrap=@($script:PlanEMutableArtifacts | Where-Object { Test-Path -LiteralPath $_ })
if ($preexistingMutableAtBootstrap.Count -ne 0) { throw "BLOCKED: pre-existing mutable evidence exists before lease creation; adoption forbidden: $($preexistingMutableAtBootstrap -join ', ')" }
$script:PlanEMutationWorktrees=@((Join-Path $script:PlanETempRoot 'worktrees\promotion-red-replay'),(Join-Path $script:PlanETempRoot 'worktrees\task-6-accessor'),(Join-Path $script:PlanETempRoot 'worktrees\task-6-busy'),(Join-Path $script:PlanETempRoot 'worktrees\task-7-explicit-empty')) | Sort-Object
$script:PlanEWorktreeOwnerRecords=@((Join-Path $script:PlanETempRoot 'worktree-owners\promotion-red-replay.json'),(Join-Path $script:PlanETempRoot 'worktree-owners\task-6-accessor.json'),(Join-Path $script:PlanETempRoot 'worktree-owners\task-6-busy.json'),(Join-Path $script:PlanETempRoot 'worktree-owners\task-7-explicit-empty.json')) | Sort-Object
$script:PlanEAllowedTempRelativePaths=@('audit-mutations.json','build-output','build-output/<owned-subtree>','clean-clone','clean-clone/<owned-subtree>','focused-extension-results.canonical.tmp','focused-extension-results.mutation-bound.tmp','focused-extension-raw','focused-extension-raw/<owned-subtree>','full-extension-results.canonical.tmp','full-extension-results.raw.tmp','host-environments','host-environments/<owned-subtree>','host-current-check','host-current-check/<owned-subtree>','host-test-results.tmp','mutation-output','mutation-output/<owned-subtree>','original-whole-branch-interim-review.diff.tmp','original-whole-branch-interim-review-package.tmp',('owner.'+$script:PlanEToken+'.transition.tmp'),'plan-e-only-review.diff.tmp','plan-e-only-review-package.tmp','promotion-red-replay-environment','promotion-red-replay-environment/<owned-subtree>','recheck-plan-e.diff','recheck-whole.diff','reviewed-head-verification.tmp','reviewed-head-verification.mutation-bound.tmp','final-artifacts.sha256.tmp','step0-temporaries','step0-temporaries/env-class-red','step0-temporaries/env-class-red/<owned-subtree>','step0-temporaries/env-selector','step0-temporaries/env-selector/<owned-subtree>','step0-temporaries/env-green-suite','step0-temporaries/env-green-suite/<owned-subtree>','tsbuildinfo-step-3.tmp','tsbuildinfo-reviewed-head.tmp','worktrees','worktrees/promotion-red-replay','worktrees/promotion-red-replay/<owned-subtree>','worktrees/task-6-accessor','worktrees/task-6-accessor/<owned-subtree>','worktrees/task-6-busy','worktrees/task-6-busy/<owned-subtree>','worktrees/task-7-explicit-empty','worktrees/task-7-explicit-empty/<owned-subtree>','worktree-owners','worktree-owners/promotion-red-replay.json','worktree-owners/task-6-accessor.json','worktree-owners/task-6-busy.json','worktree-owners/task-7-explicit-empty.json',('worktree-owners/.promotion-red-replay.'+$script:PlanEToken+'.tmp'),('worktree-owners/.task-6-accessor.'+$script:PlanEToken+'.tmp'),('worktree-owners/.task-6-busy.'+$script:PlanEToken+'.tmp'),('worktree-owners/.task-7-explicit-empty.'+$script:PlanEToken+'.tmp'))
$script:PlanEAllowedTempRelativePaths += @($script:PlanEStep0Temporaries | ForEach-Object { [IO.Path]::GetRelativePath($script:PlanETempRoot,$_).Replace('\','/') })
$script:PlanEAllowedTempRelativePaths=@($script:PlanEAllowedTempRelativePaths | Sort-Object -Unique)
$script:PlanEStep0ArtifactHashes=[ordered]@{}
if ($script:PlanERunPhase -ceq 'evidence') { foreach ($path in $script:PlanEStep0Artifacts) { $script:PlanEStep0ArtifactHashes[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant() } }
$script:PlanEPrimaryBranch=@(& git symbolic-ref --short HEAD)
if ($LASTEXITCODE -ne 0 -or $script:PlanEPrimaryBranch.Count -ne 1) { throw 'BLOCKED: primary checkout is detached at Task 9 bootstrap' }
$script:PlanEPrimaryBranch=$script:PlanEPrimaryBranch[0]
$script:PlanEPrimaryLocation=(Get-Location).Path
$creationTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks
# PLAN_E_BOOTSTRAP_MUTATIONS_START
$lease=[ordered]@{allowed_relative_paths=$script:PlanEAllowedTempRelativePaths;audit_temporaries=$script:PlanEAuditTemporaries;canonical_repository=$script:PlanECanonicalRepository;lease_token=$script:PlanEToken;lease_transition_temporary=$script:PlanELeaseTransitionPath;mutable_artifacts=$script:PlanEMutableArtifacts;mutation_source_paths=$script:PlanEMutationSourcePaths;mutation_worktrees=$script:PlanEMutationWorktrees;phase=$script:PlanERunPhase;pid=[int]$PID;process_creation_utc_ticks=[long]$creationTicks;reviewed_head=$script:PlanEReviewedHead;run_start_head=$script:PlanERunStartHead;schema_version=1;step0_artifact_sha256=$script:PlanEStep0ArtifactHashes;step0_artifacts=$script:PlanEStep0Artifacts;step0_temporaries=$script:PlanEStep0Temporaries;temporary_owner_record=$script:PlanETempOwnerPath;temporary_root=$script:PlanETempRoot;worktree_owner_records=$script:PlanEWorktreeOwnerRecords}
$leaseBytes=[byte[]](ConvertTo-PlanEBootstrapCanonicalBytes -Value $lease)
$leaseStream=$null
try { $leaseStream=[IO.FileStream]::new($script:PlanELeasePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);$leaseStream.Write($leaseBytes,0,$leaseBytes.Length);$leaseStream.Flush($true) } finally { if ($null-ne$leaseStream){$leaseStream.Dispose()} }
function Assert-PlanERunLease {
    param([ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase)
    Assert-PlanEMutexOwner
    if ($ExpectedPhase -ceq 'evidence' -and $null -eq (Get-Variable -Name PlanEFinalEvidenceHead -Scope Script -ErrorAction SilentlyContinue)) { $script:PlanEFinalEvidenceHead=$null }
    if ($ExpectedPhase -ceq 'evidence' -and $null -eq (Get-Variable -Name PlanEAuthorizedReviewFixHead -Scope Script -ErrorAction SilentlyContinue)) { $script:PlanEAuthorizedReviewFixHead=$null }
    $keys=@('allowed_relative_paths','audit_temporaries','canonical_repository','lease_token','lease_transition_temporary','mutable_artifacts','mutation_source_paths','mutation_worktrees','phase','pid','process_creation_utc_ticks','reviewed_head','run_start_head','schema_version','step0_artifact_sha256','step0_artifacts','step0_temporaries','temporary_owner_record','temporary_root','worktree_owner_records')
    $value=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $keys
    if ($value.schema_version -isnot [long] -or $value.schema_version -ne 1 -or $value.pid -isnot [long] -or $value.process_creation_utc_ticks -isnot [long] -or $value.step0_artifact_sha256 -isnot [Collections.IDictionary] -or -not (Test-PlanEStringFields -Value $value -Keys @('canonical_repository','lease_token','lease_transition_temporary','phase','run_start_head','temporary_owner_record','temporary_root')) -or $value.phase -cne $ExpectedPhase -or $value.lease_token -cne $script:PlanEToken -or $value.pid -ne $PID -or $value.process_creation_utc_ticks -ne (Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks -or $value.canonical_repository -cne $script:PlanECanonicalRepository -or $value.run_start_head -cne $script:PlanERunStartHead -or $value.temporary_root -cne $script:PlanETempRoot -or $value.temporary_owner_record -cne $script:PlanETempOwnerPath -or $value.lease_transition_temporary -cne $script:PlanELeaseTransitionPath -or -not (Test-PlanEExactStringArray -Actual $value.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or -not (Test-PlanEExactStringArray -Actual $value.audit_temporaries -Expected $script:PlanEAuditTemporaries) -or -not (Test-PlanEExactStringArray -Actual $value.mutable_artifacts -Expected $script:PlanEMutableArtifacts) -or -not (Test-PlanEExactStringArray -Actual $value.mutation_source_paths -Expected $script:PlanEMutationSourcePaths) -or -not (Test-PlanEExactStringArray -Actual $value.step0_artifacts -Expected $script:PlanEStep0Artifacts) -or -not (Test-PlanEExactStringArray -Actual $value.step0_temporaries -Expected $script:PlanEStep0Temporaries) -or -not (Test-PlanEExactStringArray -Actual $value.mutation_worktrees -Expected $script:PlanEMutationWorktrees) -or -not (Test-PlanEExactStringArray -Actual $value.worktree_owner_records -Expected $script:PlanEWorktreeOwnerRecords)) { throw 'BLOCKED: Plan E run lease ownership mismatch' }
    if ($ExpectedPhase -ceq 'step0' -and ($null -ne $value.reviewed_head -or $value.step0_artifact_sha256.Count -ne 0)) { throw 'BLOCKED: Step 0 lease unexpectedly has a reviewed head or artifact hash' }
    if ($ExpectedPhase -ceq 'evidence') {
        if ($value.reviewed_head -isnot [string] -or $value.reviewed_head -cne $script:PlanEReviewedHead -or $value.reviewed_head -notmatch '^[0-9a-f]{40}$' -or $value.step0_artifact_sha256.Count -ne 40) { throw 'BLOCKED: evidence lease reviewed-head/hash inventory mismatch' }
        foreach ($path in $script:PlanEStep0Artifacts) {
            if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "BLOCKED: evidence lease Step 0 artifact missing: $path" }
            $actualHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
            $recordedHash=$value.step0_artifact_sha256[$path]
            if ($recordedHash -isnot [string] -or $recordedHash -notmatch '^[0-9a-f]{64}$' -or $recordedHash -cne $actualHash) { throw "BLOCKED: evidence lease Step 0 artifact drift: $path" }
        }
        $head=@(& git rev-parse HEAD)
        $branch=@(& git symbolic-ref --short HEAD)
        $allowedHeads=@($script:PlanEReviewedHead)
        if (-not [string]::IsNullOrWhiteSpace([string]$script:PlanEFinalEvidenceHead)) { $allowedHeads += $script:PlanEFinalEvidenceHead }
        if (-not [string]::IsNullOrWhiteSpace([string]$script:PlanEAuthorizedReviewFixHead)) { $allowedHeads += $script:PlanEAuthorizedReviewFixHead }
        if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or $branch.Count -ne 1 -or $branch[0] -cne $script:PlanEPrimaryBranch -or $allowedHeads -cnotcontains $head[0].Trim()) { throw 'BLOCKED: HEAD/branch changed outside the evidence lease' }
    }
}
Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
if (Test-Path -LiteralPath $script:PlanETempParent) {
    $existingTempParentInfo=Get-Item -LiteralPath $script:PlanETempParent -Force
    if ($existingTempParentInfo -isnot [IO.DirectoryInfo] -or ($existingTempParentInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: existing temporary parent is unsafe' }
    $entries=@(Get-ChildItem -LiteralPath $script:PlanETempParent -Force)
    if ($entries.Count -ne 0) { throw "BLOCKED: retained token-root parent requires operator inspection: $($entries.FullName -join ', ')" }
} else {
    Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
    $leaseRootParent=[IO.Path]::GetFullPath((Split-Path -Parent $script:PlanETempRoot)).TrimEnd('\')
    if ($leaseRootParent -cne [IO.Path]::GetFullPath($script:PlanETempParent).TrimEnd('\')) { throw 'BLOCKED: temporary parent is not registered by the lease root' }
    New-Item -ItemType Directory -Path $script:PlanETempParent | Out-Null
}
$tempParentInfo=Get-Item -LiteralPath $script:PlanETempParent -Force
if ($tempParentInfo -isnot [IO.DirectoryInfo] -or ($tempParentInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or [IO.Path]::GetFullPath($tempParentInfo.FullName).TrimEnd('\') -cne [IO.Path]::GetFullPath($script:PlanETempParent).TrimEnd('\')) { throw 'BLOCKED: temporary parent is unsafe after creation' }
Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
if ([IO.Path]::GetFullPath($script:PlanETempRoot) -cne [IO.Path]::GetFullPath((Join-Path $script:PlanETempParent $script:PlanEToken))) { throw 'BLOCKED: temporary root is not the lease-token registration' }
New-Item -ItemType Directory -Path $script:PlanETempRoot | Out-Null
$tempParentInfo=Get-Item -LiteralPath $script:PlanETempParent -Force
$tempRootInfo=Get-Item -LiteralPath $script:PlanETempRoot -Force
$canonicalTempParent=[IO.Path]::GetFullPath($script:PlanETempParent).TrimEnd('\')
$canonicalTempRoot=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
if ($tempParentInfo -isnot [IO.DirectoryInfo] -or ($tempParentInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $tempRootInfo -isnot [IO.DirectoryInfo] -or ($tempRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $canonicalTempRoot -cne (Join-Path $canonicalTempParent $script:PlanEToken) -or -not $canonicalTempRoot.StartsWith($canonicalTempParent + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'BLOCKED: canonical temporary-root containment mismatch' }
$owner=[ordered]@{allowed_relative_paths=$script:PlanEAllowedTempRelativePaths;canonical_repository=$script:PlanECanonicalRepository;external_temporaries=$script:PlanEExternalTemporaries;lease_token=$script:PlanEToken;phase=$script:PlanERunPhase;primary_branch=$script:PlanEPrimaryBranch;reviewed_head=$script:PlanEReviewedHead;run_start_head=$script:PlanERunStartHead;schema_version=1;temporary_root=$script:PlanETempRoot}
$ownerBytes=[byte[]](ConvertTo-PlanEBootstrapCanonicalBytes -Value $owner)
$ownerStream=$null
Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
if ([IO.Path]::GetFullPath($script:PlanETempOwnerPath) -cne [IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot 'owner.json'))) { throw 'BLOCKED: temporary owner path is not lease-registered' }
try { $ownerStream=[IO.FileStream]::new($script:PlanETempOwnerPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);$ownerStream.Write($ownerBytes,0,$ownerBytes.Length);$ownerStream.Flush($true) } finally { if ($null-ne$ownerStream){$ownerStream.Dispose()} }
$initialOwnerCheck=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
if ($initialOwnerCheck.schema_version -isnot [long] -or $initialOwnerCheck.schema_version -ne 1 -or -not (Test-PlanEStringFields -Value $initialOwnerCheck -Keys @('canonical_repository','lease_token','phase','primary_branch','run_start_head','temporary_root')) -or $initialOwnerCheck.phase -cne $script:PlanERunPhase -or $initialOwnerCheck.lease_token -cne $script:PlanEToken -or $initialOwnerCheck.canonical_repository -cne $script:PlanECanonicalRepository -or $initialOwnerCheck.primary_branch -cne $script:PlanEPrimaryBranch -or $initialOwnerCheck.run_start_head -cne $script:PlanERunStartHead -or $initialOwnerCheck.reviewed_head -cne $script:PlanEReviewedHead -or $initialOwnerCheck.temporary_root -cne $script:PlanETempRoot -or -not (Test-PlanEExactStringArray -Actual $initialOwnerCheck.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or -not (Test-PlanEExactStringArray -Actual $initialOwnerCheck.external_temporaries -Expected $script:PlanEExternalTemporaries)) { throw 'BLOCKED: initial temporary-owner durable reread mismatch' }
# PLAN_E_BOOTSTRAP_MUTATIONS_END
function Assert-PlanERegisteredMutationPath {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,
        [ValidateSet('step0','evidence')][string]$OwnerPhase=$ExpectedPhase
    )
    Assert-PlanERunLease -ExpectedPhase $ExpectedPhase
    $full=if ([IO.Path]::IsPathFullyQualified($Path)) { [IO.Path]::GetFullPath($Path) } else { [IO.Path]::GetFullPath((Join-Path (Get-Location) $Path)) }
    $root=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
    $repository=[IO.Path]::GetFullPath($script:PlanECanonicalRepository).TrimEnd('\')
    $ownerValue=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
    if ($ownerValue.lease_token -cne $script:PlanEToken -or $ownerValue.phase -cne $OwnerPhase -or $ownerValue.temporary_root -cne $script:PlanETempRoot -or -not (Test-PlanEExactStringArray -Actual $ownerValue.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or -not (Test-PlanEExactStringArray -Actual $ownerValue.external_temporaries -Expected $script:PlanEExternalTemporaries)) { throw "BLOCKED: temporary owner registration mismatch before mutation: $Path" }
    if ($full -ceq [IO.Path]::GetFullPath($script:PlanELeasePath) -or $full -ceq [IO.Path]::GetFullPath($script:PlanETempRoot) -or $full -ceq [IO.Path]::GetFullPath($script:PlanETempOwnerPath) -or $script:PlanEExternalTemporaries -ccontains $full) { return $full }
    $repositoryRelative=if ($full.StartsWith($repository + '\',[StringComparison]::OrdinalIgnoreCase)) { [IO.Path]::GetRelativePath($repository,$full).Replace('\','/') } else { $null }
    if ($null -ne $repositoryRelative -and ($script:PlanEStep0Artifacts -ccontains $repositoryRelative -or $script:PlanEMutableArtifacts -ccontains $repositoryRelative -or $script:PlanEMutationSourcePaths -ccontains $repositoryRelative)) { return $full }
    if ($null -ne $repositoryRelative -and @($script:PlanEStep0Artifacts | Where-Object { $_.StartsWith($repositoryRelative + '/', [StringComparison]::Ordinal) }).Count -gt 0) { return $full }
    if (@($script:PlanEAuditTemporaries | Where-Object { [IO.Path]::GetFullPath($_) -ceq $full }).Count -eq 1) { return $full }
    if ($full.StartsWith($root + '\',[StringComparison]::OrdinalIgnoreCase)) {
        $relative=[IO.Path]::GetRelativePath($root,$full).Replace('\','/')
        $exact=$script:PlanEAllowedTempRelativePaths -ccontains $relative
        $subtree=@($script:PlanEAllowedTempRelativePaths | Where-Object {
            if ($_ -notlike '*/<owned-subtree>') { return $false }
            $subtreeRoot=$_.Substring(0,$_.Length - '/<owned-subtree>'.Length)
            return $relative.StartsWith($subtreeRoot + '/', [StringComparison]::Ordinal)
        }).Count -gt 0
        if ($exact -or $subtree) { return $full }
    }
    throw "BLOCKED: filesystem mutation path is not in the closed lease/owner inventory: $Path"
}
function New-PlanERegisteredDirectory {
    param([Parameter(Mandatory=$true)][string]$Path,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,[switch]$Parents)
    $full=Assert-PlanERegisteredMutationPath -Path $Path -ExpectedPhase $ExpectedPhase
    if ($Parents) { New-Item -ItemType Directory -Path $full -Force | Out-Null } else { New-Item -ItemType Directory -Path $full | Out-Null }
}
function Write-PlanERegisteredText {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase)
    Write-PlanERegisteredExclusiveText -Path $Path -Text $Text -ExpectedPhase $ExpectedPhase
}
function Write-PlanERegisteredExclusiveText {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,[ValidateSet('step0','evidence')][string]$OwnerPhase=$ExpectedPhase)
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes($Text)
    Write-PlanERegisteredExclusiveBytes -Path $Path -Bytes $bytes -ExpectedPhase $ExpectedPhase -OwnerPhase $OwnerPhase
}
function Write-PlanERegisteredExclusiveBytes {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][byte[]]$Bytes,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,[ValidateSet('step0','evidence')][string]$OwnerPhase=$ExpectedPhase)
    $full=Assert-PlanERegisteredMutationPath -Path $Path -ExpectedPhase $ExpectedPhase -OwnerPhase $OwnerPhase
    $stream=$null
    try { $stream=[IO.FileStream]::new($full,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);$stream.Write($Bytes,0,$Bytes.Length);$stream.Flush($true) } finally { if ($null-ne$stream){$stream.Dispose()} }
}
function Write-PlanERegisteredBytes {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][byte[]]$Bytes,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase)
    Write-PlanERegisteredExclusiveBytes -Path $Path -Bytes $Bytes -ExpectedPhase $ExpectedPhase
}
function Set-PlanERegisteredText {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase)
    $full=Assert-PlanERegisteredMutationPath -Path $Path -ExpectedPhase $ExpectedPhase
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "BLOCKED: registered replacement target is not an existing file: $Path" }
    [IO.File]::WriteAllText($full,$Text,[Text.UTF8Encoding]::new($false))
}
function Set-PlanERegisteredBytes {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][byte[]]$Bytes,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase)
    $full=Assert-PlanERegisteredMutationPath -Path $Path -ExpectedPhase $ExpectedPhase
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "BLOCKED: registered replacement target is not an existing file: $Path" }
    [IO.File]::WriteAllBytes($full,$Bytes)
}
function Move-PlanERegisteredPath {
    param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Destination,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,[ValidateSet('step0','evidence')][string]$OwnerPhase=$ExpectedPhase,[switch]$Replace)
    $sourceFull=Assert-PlanERegisteredMutationPath -Path $Source -ExpectedPhase $ExpectedPhase -OwnerPhase $OwnerPhase
    $destinationFull=Assert-PlanERegisteredMutationPath -Path $Destination -ExpectedPhase $ExpectedPhase -OwnerPhase $OwnerPhase
    [IO.File]::Move($sourceFull,$destinationFull,$Replace.IsPresent)
}
function Remove-PlanERegisteredPath {
    param([Parameter(Mandatory=$true)][string]$Path,[ValidateSet('step0','evidence')][string]$ExpectedPhase=$script:PlanERunPhase,[switch]$Recurse,[switch]$MissingOk)
    $full=Assert-PlanERegisteredMutationPath -Path $Path -ExpectedPhase $ExpectedPhase
    if (-not (Test-Path -LiteralPath $full)) { if ($MissingOk) { return }; throw "BLOCKED: registered deletion path is absent: $Path" }
    Remove-Item -LiteralPath $full -Force -Recurse:$Recurse
}
$null=Assert-PlanERegisteredMutationPath -Path $script:PlanEStep0TempRoot -ExpectedPhase $script:PlanERunPhase
New-PlanERegisteredDirectory -Path $script:PlanEStep0TempRoot -ExpectedPhase $script:PlanERunPhase
$script:PlanECurrentRunArtifacts=[ordered]@{}
$script:PlanECurrentRunArtifactsFrozen=$false
$script:PlanELaunchedWriters=@()
$bootstrapStep0Allowed=if ($script:PlanERunPhase -ceq 'evidence') { @($script:PlanEStep0Artifacts) } else { @() }
$bootstrapIgnoredPaths=Assert-PlanEIgnoredTopology -Context 'post-lease bootstrap' -ExpectedStep0Artifacts $bootstrapStep0Allowed -CurrentRunArtifacts @() -RequireSurvivingReports $true
function Invoke-PlanEEnvironmentScope {
    param(
        [Parameter(Mandatory=$true)][scriptblock]$Body,
        [Parameter(Mandatory=$true)][hashtable]$Overrides,
        [Parameter(Mandatory=$true)][string]$Context
    )
    $names=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    [void]$names.Add('TEMP');[void]$names.Add('TMP')
    foreach ($entry in [Environment]::GetEnvironmentVariables('Process').GetEnumerator()) { if ([string]$entry.Key -like 'DH_*') { [void]$names.Add([string]$entry.Key) } }
    foreach ($name in $Overrides.Keys) { [void]$names.Add([string]$name) }
    $saved=[ordered]@{}
    foreach ($name in @($names | Sort-Object)) {
        if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "BLOCKED: unsafe environment variable name: $name" }
        $envPath=Join-Path -Path 'Env:\' -ChildPath $name
        $present=Test-Path -LiteralPath $envPath
        $value=[Environment]::GetEnvironmentVariable($name,'Process')
        if ($present -and $null -eq $value) { throw "BLOCKED: inconsistent environment presence before scope: $name" }
        $saved[$name]=[ordered]@{present=$present;value=$value}
    }
    $primaryError=$null;$restoreErrors=[Collections.Generic.List[Exception]]::new();$result=$null
    try {
        foreach ($name in $Overrides.Keys) {
            $safeName=[string]$name
            if ($safeName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "BLOCKED: unsafe environment override name: $safeName" }
            $envPath=Join-Path -Path 'Env:\' -ChildPath $safeName
            if ($null -eq $Overrides[$name]) {
                if (Test-Path -LiteralPath $envPath) { Remove-Item -LiteralPath $envPath -Force -ErrorAction Stop }
            } else { [Environment]::SetEnvironmentVariable($safeName,[string]$Overrides[$name],'Process') }
        }
        $result=& $Body
    } catch { $primaryError=$_ } finally {
        foreach ($name in @($saved.Keys)) {
            try {
                $envPath=Join-Path -Path 'Env:\' -ChildPath $name
                if ($saved[$name].present) { [Environment]::SetEnvironmentVariable($name,[string]$saved[$name].value,'Process') }
                else { if (Test-Path -LiteralPath $envPath) { Remove-Item -LiteralPath $envPath -Force -ErrorAction Stop } }
                $afterPresent=Test-Path -LiteralPath $envPath
                $afterValue=[Environment]::GetEnvironmentVariable($name,'Process')
                if ($afterPresent -ne [bool]$saved[$name].present -or ($saved[$name].present -and $afterValue -cne [string]$saved[$name].value) -or (-not $saved[$name].present -and $null -ne $afterValue)) { throw "environment restore verification mismatch: $name" }
            } catch { $restoreErrors.Add($_.Exception) }
        }
    }
    if ($restoreErrors.Count -ne 0) {
        $primaryClass=if ($null -ne $primaryError) { $primaryError.Exception.GetType().FullName } else { '<none>' }
        $allErrors=[Collections.Generic.List[Exception]]::new()
        if ($null -ne $primaryError) { $allErrors.Add($primaryError.Exception) }
        foreach ($restoreError in $restoreErrors) { $allErrors.Add($restoreError) }
        throw [AggregateException]::new("BLOCKED: environment restoration failed; context=$Context; primary=$primaryClass; restoration_count=$($restoreErrors.Count)",$allErrors.ToArray())
    }
    if ($null -ne $primaryError) { throw $primaryError }
    return $result
}
$environmentSelfTestAbsent=$null
do {
    $environmentSelfTestAbsent='DH_PLAN_E_ENV_ABSENT_SELF_TEST_' + [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(8))
    if ($environmentSelfTestAbsent -notmatch '^DH_[A-Z0-9_]+$') { throw 'BLOCKED: unsafe environment self-test name' }
} while ((Test-Path -LiteralPath (Join-Path -Path 'Env:\' -ChildPath $environmentSelfTestAbsent)) -or $null -ne [Environment]::GetEnvironmentVariable($environmentSelfTestAbsent,'Process'))
$environmentSelfTestNames=@('TEMP','TMP',$environmentSelfTestAbsent)
$environmentSelfTestBefore=[ordered]@{};foreach ($name in $environmentSelfTestNames) { $environmentSelfTestBefore[$name]=[ordered]@{present=(Test-Path -LiteralPath (Join-Path -Path 'Env:\' -ChildPath $name));value=[Environment]::GetEnvironmentVariable($name,'Process')} }
$environmentSelfTestFailed=$false
$environmentSelfTestOverrides=[ordered]@{TEMP=$script:PlanETempRoot;TMP=$script:PlanETempRoot};$environmentSelfTestOverrides[$environmentSelfTestAbsent]='mutated'
try { Invoke-PlanEEnvironmentScope -Context 'environment restoration self-test' -Overrides $environmentSelfTestOverrides -Body { throw 'expected environment self-test failure' } }
catch { $environmentSelfTestFailed=$true }
$environmentSelfTestAfter=[ordered]@{};foreach ($name in $environmentSelfTestNames) { $environmentSelfTestAfter[$name]=[ordered]@{present=(Test-Path -LiteralPath (Join-Path -Path 'Env:\' -ChildPath $name));value=[Environment]::GetEnvironmentVariable($name,'Process')} }
if (-not $environmentSelfTestFailed -or @($environmentSelfTestNames | Where-Object { $environmentSelfTestAfter[$_].present -ne $environmentSelfTestBefore[$_].present -or $environmentSelfTestAfter[$_].value -cne $environmentSelfTestBefore[$_].value }).Count -ne 0 -or $environmentSelfTestAfter[$environmentSelfTestAbsent].present -or $null -ne $environmentSelfTestAfter[$environmentSelfTestAbsent].value) { throw 'BLOCKED: environment restoration self-test failed' }
$script:PlanEWriterEnvironment=[ordered]@{TEMP=$script:PlanETempRoot;TMP=$script:PlanETempRoot;DH_PLAN_E_RUN_TOKEN=$script:PlanEToken;DH_PLAN_E_TEMP_ROOT=$script:PlanETempRoot}
function Get-PlanEWriterEnvironmentOverrides {
    param([ValidateSet('step0','evidence')][string]$ExpectedPhase)
    $overrides=[ordered]@{DH_PLAN_E_RUN_TOKEN=$script:PlanEToken;DH_PLAN_E_TEMP_ROOT=$script:PlanETempRoot}
    foreach ($name in @('TEMP','TMP')) {
        $selected=$script:PlanETempRoot
        $candidate=[Environment]::GetEnvironmentVariable($name,'Process')
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            try {
                $full=Assert-PlanERegisteredMutationPath -Path $candidate -ExpectedPhase $ExpectedPhase
                $info=Get-Item -LiteralPath $full -Force
                if ($info -is [IO.DirectoryInfo] -and ($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) { $selected=$full }
            } catch { $selected=$script:PlanETempRoot }
        }
        $overrides[$name]=$selected
    }
    return $overrides
}
function Assert-PlanEWriterOutputRegistrations {
    param([Parameter(Mandatory=$true)][string[]]$ArgumentList,[ValidateSet('step0','evidence')][string]$ExpectedPhase,[AllowNull()][string]$EvidencePath=$null)
    foreach ($argument in $ArgumentList) {
        $candidate=$null
        if ($argument -like '--output=*') { $candidate=$argument.Substring('--output='.Length) }
        elseif ($argument -like '--outputFile.json=*') { $candidate=$argument.Substring('--outputFile.json='.Length) }
        if (-not [string]::IsNullOrWhiteSpace($candidate)) { $null=Assert-PlanERegisteredMutationPath -Path $candidate -ExpectedPhase $ExpectedPhase }
    }
    foreach ($argument in $ArgumentList) {
        if ([string]::IsNullOrWhiteSpace($argument)) { continue }
        $candidate=$argument.Trim('"')
        if ($candidate -match '(?i)(?:^|[\\/])(?:step0-temporaries|build-output|focused-extension-raw|host-environments|host-current-check|mutation-output|worktrees|clean-clone)(?:[\\/]|$)' -or $candidate -match '(?i)\.(?:tmp|diff|json|tsbuildinfo)$') {
            try {
                $fullCandidate=if ([IO.Path]::IsPathFullyQualified($candidate)) { [IO.Path]::GetFullPath($candidate) } else { [IO.Path]::GetFullPath((Join-Path (Get-Location) $candidate)) }
                $repository=[IO.Path]::GetFullPath($script:PlanECanonicalRepository).TrimEnd('\')
                $root=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
                if ($fullCandidate.StartsWith($root + '\',[StringComparison]::OrdinalIgnoreCase) -or $script:PlanEExternalTemporaries -ccontains $fullCandidate -or $fullCandidate.StartsWith($repository + '\.superpowers\sdd\',[StringComparison]::OrdinalIgnoreCase)) { $null=Assert-PlanERegisteredMutationPath -Path $fullCandidate -ExpectedPhase $ExpectedPhase }
            } catch { throw "BLOCKED: writer path argument registration failed: $argument" }
        }
    }
    if ($ArgumentList.Count -ge 2 -and $ArgumentList[0] -ceq 'clone') { $null=Assert-PlanERegisteredMutationPath -Path $ArgumentList[-1] -ExpectedPhase $ExpectedPhase }
    if ($ArgumentList.Count -ge 4 -and $ArgumentList[0] -ceq 'worktree' -and $ArgumentList[1] -ceq 'add') { $null=Assert-PlanERegisteredMutationPath -Path $ArgumentList[-2] -ExpectedPhase $ExpectedPhase }
    if ($ArgumentList.Count -ge 3 -and $ArgumentList[0] -ceq 'worktree' -and $ArgumentList[1] -ceq 'remove') { $null=Assert-PlanERegisteredMutationPath -Path $ArgumentList[2] -ExpectedPhase $ExpectedPhase }
    if ($ArgumentList.Count -ge 2 -and $ArgumentList[0] -ceq '-C' -and [IO.Path]::IsPathFullyQualified($ArgumentList[1])) { $null=Assert-PlanERegisteredMutationPath -Path $ArgumentList[1] -ExpectedPhase $ExpectedPhase }
    foreach ($name in @('TEMP','TMP')) {
        $temporaryRoot=[Environment]::GetEnvironmentVariable($name,'Process')
        $null=Assert-PlanERegisteredMutationPath -Path $temporaryRoot -ExpectedPhase $ExpectedPhase
        $temporaryRootInfo=Get-Item -LiteralPath $temporaryRoot -Force
        if ($temporaryRootInfo -isnot [IO.DirectoryInfo] -or ($temporaryRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: writer $name registered directory is unsafe" }
    }
    if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) { $null=Assert-PlanERegisteredMutationPath -Path $EvidencePath -ExpectedPhase $ExpectedPhase }
}
function Invoke-PlanEStep0Writer {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$ArgumentList,
        [Parameter(Mandatory=$true)][string]$ExpectedWorkingDirectory
    )
    Assert-PlanERunLease -ExpectedPhase 'step0'
    Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'step0'
    if ((Get-Location).Path -cne $ExpectedWorkingDirectory) { throw 'Step 0 writer working directory mismatch' }
    $resolvedFilePath=[IO.Path]::GetFullPath($FilePath)
    if (-not @($script:PlanEGitCommand,$script:PlanENpmCommand,$script:PlanENodeCommand,$script:PlanEPythonCommand,$script:PlanEPowerShellCommand).Contains($resolvedFilePath)) { throw "Step 0 writer command is outside the fixed tool allowlist: $resolvedFilePath" }
    $record=[ordered]@{file_path=$FilePath;arguments=$ArgumentList;cwd=$ExpectedWorkingDirectory;started=$false;terminated=$false;exit_code=$null}
    $script:PlanELaunchedWriters += $record
    $startInfo=[Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName=$FilePath
    $startInfo.WorkingDirectory=$ExpectedWorkingDirectory
    $startInfo.UseShellExecute=$false
    foreach ($argument in $ArgumentList) { [void]$startInfo.ArgumentList.Add($argument) }
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$startInfo
    try {
        $writerEnvironment=Get-PlanEWriterEnvironmentOverrides -ExpectedPhase 'step0'
        return Invoke-PlanEEnvironmentScope -Context 'Step 0 writer' -Overrides $writerEnvironment -Body {
            Assert-PlanERunLease -ExpectedPhase 'step0'
            Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'step0'
            if (-not $process.Start()) { throw 'Step 0 writer process did not start' }
            $record.started=$true
            $process.WaitForExit()
            $record.exit_code=$process.ExitCode
            $record.terminated=$true
            return [int]$record.exit_code
        }
    } finally {
        if ($record.started -and -not $process.HasExited) { $process.WaitForExit() }
        $process.Dispose()
    }
}
function Invoke-PlanEStep0RedirectedWriter {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$ArgumentList,
        [Parameter(Mandatory=$true)][string]$ExpectedWorkingDirectory,
        [AllowNull()][string]$StandardInput=$null
    )
    Assert-PlanERunLease -ExpectedPhase 'step0'
    Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'step0'
    if ((Get-Location).Path -cne $ExpectedWorkingDirectory) { throw 'Step 0 redirected writer working directory mismatch' }
    $resolvedFilePath=[IO.Path]::GetFullPath($FilePath)
    if (-not @($script:PlanEGitCommand,$script:PlanENpmCommand,$script:PlanENodeCommand,$script:PlanEPythonCommand,$script:PlanEPowerShellCommand).Contains($resolvedFilePath)) { throw "Step 0 redirected writer command is outside the fixed tool allowlist: $resolvedFilePath" }
    $record=[ordered]@{file_path=$FilePath;arguments=$ArgumentList;cwd=$ExpectedWorkingDirectory;started=$false;terminated=$false;exit_code=$null}
    $script:PlanELaunchedWriters += $record
    $startInfo=[Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName=$FilePath
    $startInfo.WorkingDirectory=$ExpectedWorkingDirectory
    $startInfo.UseShellExecute=$false
    $startInfo.RedirectStandardOutput=$true
    $startInfo.RedirectStandardError=$true
    $startInfo.RedirectStandardInput=$null -ne $StandardInput
    foreach ($argument in $ArgumentList) { [void]$startInfo.ArgumentList.Add($argument) }
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$startInfo
    try {
        $writerEnvironment=Get-PlanEWriterEnvironmentOverrides -ExpectedPhase 'step0'
        return Invoke-PlanEEnvironmentScope -Context 'Step 0 redirected writer' -Overrides $writerEnvironment -Body {
            Assert-PlanERunLease -ExpectedPhase 'step0'
            Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'step0'
            if (-not $process.Start()) { throw 'Step 0 redirected writer process did not start' }
            $record.started=$true
            $stdoutTask=$process.StandardOutput.ReadToEndAsync()
            $stderrTask=$process.StandardError.ReadToEndAsync()
            if ($null -ne $StandardInput) { $process.StandardInput.Write($StandardInput); $process.StandardInput.Close() }
            $process.WaitForExit()
            [Threading.Tasks.Task]::WaitAll(@($stdoutTask,$stderrTask))
            $record.exit_code=$process.ExitCode
            $record.terminated=$true
            return [ordered]@{exit_code=[int]$record.exit_code;stdout=$stdoutTask.Result;stderr=$stderrTask.Result}
        }
    } finally {
        if ($record.started -and -not $process.HasExited) { $process.WaitForExit() }
        $process.Dispose()
    }
}
```

`Local\DynamicsHelper.PlanE.06c4d8bd3362d15338256bedfa50915d338721b89391276e9d05ac57ccbffe7c`
is the one and only Plan E mutex name; no per-step/per-token mutex is created.
No reset, lease operation, child launch, temporary creation, worktree action, or
cleanup occurs outside ownership of that mutex; after the lease's exclusive
creation, none occurs without a successful phase-specific lease reread first.

The mutex is a Windows kernel named mutex created through .NET. This fixed
`Local\...` name is scoped to the current logon session and canonical repository
identity; no lock file or mutable current-directory string substitutes for it.

Step 0 is the already-authorized TDD sequence preserved semantically; its exact
tests, mutations, arguments, assertions, and commits are unchanged, while child
launches are mechanically routed through the lease-and-mutex owner's
retained-handle helpers required by the amendment. Its existing
fresh temporary roots remain same-block, foreground, synchronously cleaned
inside the token root. If Step 0 fails, the retained `step0` lease, token root,
owner, and exact paths remain diagnostic evidence; the controller does not
release only the mutex or perform an unleased cleanup. Only the owner-only normal
release after Step 11 or an explicitly authorized review-fix release is scripted.

- [ ] **Step 0: Implement the authorized Windows promotion retry with TDD**

The human authorization and accepted design are committed in
`docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`.
This revised implementation plan must also be committed and clean before either
authorized Host path is edited. Resolve and record all three full planning SHAs, then
require the promotion spec, evidence amendment, and revised plan SHAs as HEAD
ancestors. Before RED, require
`git diff --quiet HEAD -- host/update_engine.py host/test_update_engine_resume.py`
and require the base-to-HEAD Host diff to be absent; after implementation these
two paths are the only newly authorized Host delta.

Run this fail-closed precondition before writing tests:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$base='0dbb4852931b50153fb898b03129ae0092c46404'
$acceptedSpecCommit='249b1a3750b50db1336fb39661db9306355a1a18'
$acceptedAmendmentCommit='d51ca4aabd4a40b91818191424993a8d3ab3cd27'
$plan='docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
$spec='docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md'
$amendment='docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md'
foreach ($path in @($plan,$spec,$amendment)) {
    & git cat-file -e "HEAD:$path"
    if ($LASTEXITCODE -ne 0) { throw "Promotion authorization path is not committed: $path" }
    & git diff --quiet -- $path
    if ($LASTEXITCODE -ne 0) { throw "Promotion authorization path has unstaged changes: $path" }
    & git diff --cached --quiet -- $path
    if ($LASTEXITCODE -ne 0) { throw "Promotion authorization path is staged: $path" }
}
$head=@(& git rev-parse HEAD)
$planHead=@(& git log -1 --format=%H HEAD -- $plan)
$specHead=@(& git log -1 --format=%H HEAD -- $spec)
$amendmentHead=@(& git log -1 --format=%H HEAD -- $amendment)
if (
    $LASTEXITCODE -ne 0 -or
    $head.Count -ne 1 -or
    $planHead.Count -ne 1 -or
    $specHead.Count -ne 1 -or
    $amendmentHead.Count -ne 1 -or
    $head[0].Trim() -cne $planHead[0].Trim()
) { throw 'The revised Plan E plan is not the current committed HEAD' }
$planPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $planHead[0].Trim())
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion plan commit paths' }
$planSubject=@(& git show -s --format=%s $planHead[0].Trim())
$planParent=@(& git rev-parse "$($planHead[0].Trim())^")
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion plan commit subject' }
if (
    $planPaths.Count -ne 1 -or $planPaths[0] -cne $plan -or
    $planSubject.Count -ne 1 -or $planSubject[0] -cne 'docs(update): integrate Plan E evidence-loss audit' -or
    $planParent.Count -ne 1 -or $planParent[0].Trim() -cne $acceptedAmendmentCommit
) { throw 'Promotion plan commit path or subject is invalid' }
foreach ($commit in @($planHead[0].Trim(),$specHead[0].Trim(),$amendmentHead[0].Trim())) {
    if ($commit -notmatch '^[0-9a-f]{40}$') { throw 'Invalid promotion planning SHA' }
    & git merge-base --is-ancestor $commit HEAD
    if ($LASTEXITCODE -ne 0) { throw "Promotion planning SHA is not a HEAD ancestor: $commit" }
    "Promotion planning commit: $commit"
}
if ($specHead[0].Trim() -cne $acceptedSpecCommit) {
    throw 'Windows promotion retry spec is not the accepted commit'
}
if ($amendmentHead[0].Trim() -cne $acceptedAmendmentCommit) { throw 'Evidence-loss amendment is not the accepted commit' }
$amendmentSubject=@(& git show -s --format=%s $acceptedAmendmentCommit)
$amendmentPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $acceptedAmendmentCommit)
if ($LASTEXITCODE -ne 0 -or $amendmentSubject.Count -ne 1 -or $amendmentSubject[0] -cne 'docs(evidence): define Plan E report-loss boundary' -or $amendmentPaths.Count -ne 1 -or $amendmentPaths[0] -cne $amendment) { throw 'Accepted evidence-loss amendment commit is invalid' }
& git cat-file -e "$acceptedSpecCommit`:$spec"
if ($LASTEXITCODE -ne 0) { throw 'Accepted promotion spec commit does not contain the spec' }
& git merge-base --is-ancestor $base HEAD
if ($LASTEXITCODE -ne 0) { throw 'Plan E base is not a HEAD ancestor' }
$authorized=@('host/update_engine.py','host/test_update_engine_resume.py')
foreach ($path in $authorized) {
    & git cat-file -e "$base`:$path"
    if ($LASTEXITCODE -ne 0) { throw "Authorized Host path is absent at base: $path" }
}
$hostDelta=@(& git diff --name-only --no-renames "$base..HEAD" -- $authorized)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect authorized Host baseline' }
if ($hostDelta.Count -ne 0) { throw 'Authorized Host paths changed before Step 0 RED' }
& git diff --quiet -- $authorized
if ($LASTEXITCODE -ne 0) { throw 'Authorized Host paths have unstaged changes before Step 0 RED' }
& git diff --cached --quiet -- $authorized
if ($LASTEXITCODE -ne 0) { throw 'Authorized Host paths are staged before Step 0 RED' }
```
Before editing production, add a focused `PreparingPromotionRetryTests` class to
`host/test_update_engine_resume.py` with these exact tests:

```text
test_windows_access_denied_retries_atomic_preparing_promotion
test_windows_sharing_errors_32_and_33_are_retryable
test_persistent_windows_promotion_lock_stops_after_three_attempts
test_non_windows_or_unlisted_promotion_errors_are_not_retried
test_preparing_promotion_revalidates_before_and_after_sleep
test_preparing_promotion_revalidation_rejects_every_authority_mismatch
test_preparing_promotion_hooks_wrap_the_logical_operation_once
test_update_engine_constructor_signature_remains_frozen
```

Update the existing `test_unittest_class_map_is_exact` expected class set in the
same test-first edit to include `PreparingPromotionRetryTests`. That existing
meta-test must remain GREEN while the seven new behavior selectors provide RED.

The revalidation mismatch matrix covers at both failure/pre-sleep and post-sleep
checkpoints: every field of `transition(staging, PREPARED)` independently
(schema version, transaction ID, phase, initiator, target/prior version,
fresh-install, ownership digest, failure/reason/original failure, rollback-from,
initiating process, `ownership_path`, and `seed_receipt`),
ownership bytes/digest, probe manifest, Host tree, Extension tree, extra
workspace topology, `updates_root`/`transactions_root`/preparing/descendant
symlink or reparse classification, destination creation, and state-read error.
Pre-sleep rows assert zero sleeper calls. Exact helper-call counts are one for
first-attempt success, three for one-retry success, and five for exhausted three
attempts. Constructor signature is positional `install_root` plus keyword-only
`mutex_factory` and `hooks` only.

Every success/failure row asserts `_replace_path` receives exactly
`(paths.preparing_root, paths.transaction_root)`. Retry success asserts final
workspace exact, preparing absent, active exact, and a byte snapshot of every
live product path unchanged. Exhaustion asserts active/final absent, preparing
still exact, live snapshot unchanged, outer exception exactly
`PreparedTransactionConflict`, and `exception.__cause__ is final_os_error`.
Source disappearance/target appearance/revalidation errors assert no subsequent
replace and no sleeper when they occur before sleep. Hook tests assert one
before and one after event on success, one before and zero after on exhausted
failure, regardless of replace attempts.

Replace the test module's complete leading import section with this exact block:

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

Insert this exact complete class immediately before
`class OwnershipBoundaryTests`. It is the complete test and evidence-writer
contract; do not add, omit, or rewrite helpers or methods:

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

In `OwnershipBoundaryTests.test_unittest_class_map_is_exact`, add this exact
member to the expected class-name set:

```python
"PreparingPromotionRetryTests",
```

Run the focused RED from the repository root in a fresh isolated six-directory
environment with `PYTHONPATH=host`:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$root=Join-Path $script:PlanEStep0TempRoot 'env-class-red'
$environment=[ordered]@{PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path;PYTHONDONTWRITEBYTECODE='1';DH_PROMOTION_EVIDENCE=$null}
$exit=99
try {
    New-PlanERegisteredDirectory -Path $root -ExpectedPhase 'step0'
    foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
        $value=Join-Path $root $name.ToLowerInvariant()
        New-PlanERegisteredDirectory -Path $value -ExpectedPhase 'step0'
        $environment[$name]=$value
    }
    $exit=Invoke-PlanEEnvironmentScope -Context 'Step 0 class RED' -Overrides $environment -Body { Invoke-PlanEStep0Writer -FilePath $script:PlanEPythonCommand -ArgumentList @('-m','unittest','host.test_update_engine_resume.PreparingPromotionRetryTests','-v') -ExpectedWorkingDirectory (Get-Location).Path }
} finally {
    if (Test-Path -LiteralPath $root) { $rootInfo=Get-Item -LiteralPath $root -Force; if ($rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: unsafe Step 0 class temp cleanup' }; Remove-PlanERegisteredPath -Path $root -ExpectedPhase 'step0' -Recurse }
}
if ($exit -eq 0) { throw 'Promotion retry RED unexpectedly passed' }
if ($exit -ne 1) { throw "Promotion retry RED returned unexpected exit code: $exit" }
```

The class-level command above is inventory only. Capture valid RED evidence by
running each of these seven behavior selectors independently in a fresh copy of
the same environment block and capturing `2>&1` output:

```text
test_windows_access_denied_retries_atomic_preparing_promotion
test_windows_sharing_errors_32_and_33_are_retryable
test_persistent_windows_promotion_lock_stops_after_three_attempts
test_non_windows_or_unlisted_promotion_errors_are_not_retried
test_preparing_promotion_revalidates_before_and_after_sleep
test_preparing_promotion_revalidation_rejects_every_authority_mismatch
test_preparing_promotion_hooks_wrap_the_logical_operation_once
```

For each selector, require exit 1, one verbose line containing the exact selector
and `... FAIL`, `Ran 1 test`, and `FAILED (failures=1)`. Reject output containing
`ERROR`, `ImportError`, `ModuleNotFoundError`, or `skipped`. Run
`test_update_engine_constructor_signature_remains_frozen` separately and require
exit 0, exact selector plus `... ok`, `Ran 1 test`, and final `OK`. Thus seven
behavior failures and one constructor pass are mandatory; missing/skipped/setup
tests cannot count as RED.

Use this self-contained executor for every per-selector RED, GREEN, and mutation
run; each tool call gets a new function definition and fresh environment:

<!-- PROMOTION_EXECUTOR_START -->
```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
function Invoke-PromotionTest {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][int]$ExpectedExit,
        [Parameter(Mandatory=$true)][string]$ExpectedStatus,
        [string]$EvidencePath
    )
    if (-not (Get-Command Invoke-PlanEStep0RedirectedWriter -CommandType Function -ErrorAction SilentlyContinue)) { throw 'Plan E Step 0 redirected writer is unavailable' }
    if ([string]::IsNullOrWhiteSpace([string]$script:PlanEPythonCommand)) { throw 'Plan E Python command is unavailable' }
    Assert-PlanERunLease -ExpectedPhase 'step0'
    $root=Join-Path $script:PlanEStep0TempRoot 'env-selector'
    $environment=[ordered]@{PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path;PYTHONDONTWRITEBYTECODE='1';DH_PROMOTION_EVIDENCE=$EvidencePath}
    $lines=@()
    $exit=99
    try {
        New-PlanERegisteredDirectory -Path $root -ExpectedPhase 'step0'
        foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
            $value=Join-Path $root $name.ToLowerInvariant()
            New-PlanERegisteredDirectory -Path $value -ExpectedPhase 'step0'
            $environment[$name]=$value
        }
        if ($EvidencePath) { $null=Assert-PlanERegisteredMutationPath -Path $EvidencePath -ExpectedPhase 'step0' }
        $selector="host.test_update_engine_resume.PreparingPromotionRetryTests.$Method"
        $execution=Invoke-PlanEEnvironmentScope -Context "Step 0 selector $Method" -Overrides $environment -Body { Invoke-PlanEStep0RedirectedWriter -FilePath $script:PlanEPythonCommand -ArgumentList @('-m','unittest',$selector,'-v') -ExpectedWorkingDirectory (Get-Location).Path }
        $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
        $exit=$execution.exit_code
    } finally {
        if (Test-Path -LiteralPath $root) { $rootInfo=Get-Item -LiteralPath $root -Force; if ($rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: unsafe Step 0 selector temp cleanup' }; Remove-PlanERegisteredPath -Path $root -ExpectedPhase 'step0' -Recurse }
    }
    $text=$lines -join "`n"
    if ($exit -ne $ExpectedExit) { throw "$Method returned $exit instead of $ExpectedExit`n$text" }
    $statusPattern='(?m)^' + [regex]::Escape($Method) + ' .* \.\.\. ' + [regex]::Escape($ExpectedStatus) + '\r?$'
    if ([regex]::Matches($text,$statusPattern).Count -ne 1) { throw "$Method status line mismatch`n$text" }
    if ($text -cnotmatch '(?m)^Ran 1 test in [0-9.]+s\r?$') { throw "$Method did not run exactly one test`n$text" }
    if ($ExpectedStatus -eq 'FAIL') {
        if ($text -cnotmatch '(?m)^FAILED \(failures=1\)\r?$') { throw "$Method failure summary mismatch`n$text" }
    } elseif ($text -cnotmatch '(?m)^OK\r?$') { throw "$Method OK summary missing`n$text" }
    if ($text -cmatch '(?m)(^ERROR:|^ImportError:|^ModuleNotFoundError:|\bskipped\b)') { throw "$Method had invalid test output`n$text" }
    return $text
}
```
<!-- PROMOTION_EXECUTOR_END -->

Create the exact executor through the current lease/owner registration before
the first import:

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
$executor='.superpowers/sdd/invoke-promotion-test.ps1'
if (Test-Path -LiteralPath $executor) { throw 'Promotion executor already exists' }
$planText=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for executor creation' }
$executorMatch=[regex]::Match($planText,'(?s)<!-- PROMOTION_EXECUTOR_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_EXECUTOR_END -->')
if (-not $executorMatch.Success) { throw 'Committed promotion executor contract is missing' }
Write-PlanERegisteredExclusiveText -Path $executor -Text ($executorMatch.Groups[1].Value + "`n") -ExpectedPhase 'step0'
```

Before invoking any later Step 0 command region, create the ignored UTF-8-no-BOM
script `.superpowers/sdd/invoke-promotion-test.ps1` only after
`Assert-PlanERunLease -ExpectedPhase 'step0'`. Its complete contents are the
exact function fence between the two promotion-executor markers above and
nothing else. Use exclusive `FileMode.CreateNew`, flush/reread it, and never use
an editor or `apply_patch` during execution. Read it back,
require exactly one `function Invoke-PromotionTest`, compute SHA-256, and record
the hash. Every later RED/GREEN/mutation block begins with:

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
function Import-PromotionExecutor {
    $executor='.superpowers/sdd/invoke-promotion-test.ps1'
    $hashPath='.superpowers/sdd/promotion-executor.sha256'
    $expected=[IO.File]::ReadAllText((Join-Path (Get-Location) $hashPath),[Text.UTF8Encoding]::new($false)).Trim()
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
    if ($expected -notmatch '^[0-9a-f]{64}$' -or $actual -cne $expected) {
        throw 'Promotion executor hash mismatch before import'
    }
    . $executor
    $definition=(Get-Command Invoke-PromotionTest -CommandType Function).Definition
    Set-Item -Path Function:global:Invoke-PromotionTest -Value $definition
}
Import-PromotionExecutor
```

The extracted executor calls only the lease owner's retained-handle Step 0
redirected launcher; dot-sourcing the trusted hash-locked function launches no
child itself. The import verifies the script is a leaf, has no BOM, matches the recorded SHA, and is
ignored with `git check-ignore -q`. The script is a
Task 9 evidence artifact, never staged before the final exact force-add; its
SHA-256 is recorded in the final report and it is committed in the 58-artifact
inventory. This satisfies the fresh-shell rule without relying on prior function
state.

Immediately validate it:

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
$executor='.superpowers/sdd/invoke-promotion-test.ps1'
if (-not (Test-Path -LiteralPath $executor -PathType Leaf)) { throw 'Promotion executor is missing' }
$bytes=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $executor))
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { throw 'Promotion executor has a BOM' }
$text=[Text.UTF8Encoding]::new($false,$true).GetString($bytes)
if ([regex]::Matches($text,'(?m)^function Invoke-PromotionTest \{$').Count -ne 1) { throw 'Promotion executor body is invalid' }
$planText=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed Plan E plan' }
$match=[regex]::Match(
    $planText,
    '(?s)<!-- PROMOTION_EXECUTOR_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_EXECUTOR_END -->'
)
if (-not $match.Success) { throw 'Could not extract committed promotion executor' }
$expectedText=$match.Groups[1].Value + "`n"
$actualText=($text -replace "`r`n","`n").TrimEnd("`n") + "`n"
if ($actualText -cne $expectedText) { throw 'Promotion executor differs from committed plan' }
& git check-ignore -q -- $executor
if ($LASTEXITCODE -ne 0) { throw 'Promotion executor is not ignored' }
$executorHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
$executorHashPath='.superpowers/sdd/promotion-executor.sha256'
$executorHashTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-executor-sha256.tmp'
foreach ($path in @($executorHashPath,$executorHashTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion executor hash-record path already exists: $path" }
}
try {
    $expectedBytes=[Text.UTF8Encoding]::new($false).GetBytes($executorHash + "`n")
    Write-PlanERegisteredExclusiveBytes -Path $executorHashTemp -Bytes $expectedBytes -ExpectedPhase 'step0'
    $tempFullPath=Assert-PlanERegisteredMutationPath -Path $executorHashTemp -ExpectedPhase 'step0'
    $actualBytes=[IO.File]::ReadAllBytes($tempFullPath)
    if ([Convert]::ToHexString($actualBytes) -cne [Convert]::ToHexString($expectedBytes)) { throw 'Promotion executor hash-record temporary validation failed' }
    Move-PlanERegisteredPath -Source $executorHashTemp -Destination $executorHashPath -ExpectedPhase 'step0'
} finally {
    if (Test-Path -LiteralPath $executorHashTemp) { Remove-PlanERegisteredPath -Path $executorHashTemp -ExpectedPhase 'step0' }
}
"Promotion executor SHA-256: $executorHash"
```

Each selector invocation writes its returned text plus LF to an ignored leaf
under `.superpowers/sdd/promotion-transcripts/<phase>/<method>.txt`, using phases
`red`, `green`, and `mutation-<name>`. Transcript directories must be absent
before their phase, are created with `New-Item`, and are hash-inventoried after
the phase. Step 10 reruns the exact status/count/error parser against every
transcript rather than trusting summary prose.

Run and persist the seven RED selectors plus constructor pass:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$executor='.superpowers/sdd/invoke-promotion-test.ps1'
$expectedHash=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) '.superpowers/sdd/promotion-executor.sha256'),
    [Text.UTF8Encoding]::new($false)
).Trim()
$actualHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
if ($actualHash -cne $expectedHash) { throw 'Promotion executor hash changed before RED' }
. $executor
$redDir='.superpowers/sdd/promotion-transcripts/red'
if (Test-Path -LiteralPath $redDir) { throw 'Promotion RED transcript directory already exists' }
$preMapPath='.superpowers/sdd/promotion-red.sha256.json'
$redSourcePath='.superpowers/sdd/promotion-red-source.sha256'
$preMapTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-red-map.tmp'
$redSourceTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-red-source.tmp'
foreach ($path in @($preMapPath,$preMapTemp,$redSourcePath,$redSourceTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion RED chronology path already exists: $path" }
}
New-PlanERegisteredDirectory -Path $redDir -ExpectedPhase 'step0'
$redMethods=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once'
)
foreach ($method in $redMethods) {
    $text=Invoke-PromotionTest -Method $method -ExpectedExit 1 -ExpectedStatus 'FAIL'
    $target=Join-Path $redDir "$method.txt"
    $temporary=Join-Path $script:PlanEStep0TempRoot "red-$method.tmp"
    Write-PlanERegisteredText -Path $temporary -Text ($text + "`n") -ExpectedPhase 'step0'
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw "Promotion RED transcript validation failed: $method" }
    Move-PlanERegisteredPath -Source $temporary -Destination $target -ExpectedPhase 'step0'
}
$constructor='test_update_engine_constructor_signature_remains_frozen'
$text=Invoke-PromotionTest -Method $constructor -ExpectedExit 0 -ExpectedStatus 'ok'
$target=Join-Path $redDir "$constructor.txt"
$temporary=Join-Path $script:PlanEStep0TempRoot "red-$constructor.tmp"
Write-PlanERegisteredText -Path $temporary -Text ($text + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw 'Promotion constructor transcript validation failed' }
Move-PlanERegisteredPath -Source $temporary -Destination $target -ExpectedPhase 'step0'
$expectedRedNames=@($redMethods + $constructor | ForEach-Object { "$_.txt" } | Sort-Object)
$redEntries=@(Get-ChildItem -LiteralPath $redDir -Force)
$unsupportedRed=@($redEntries | Where-Object { $_.PSIsContainer -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualRedNames=@($redEntries | Where-Object { -not $_.PSIsContainer } | ForEach-Object Name | Sort-Object)
$missingRed=@($expectedRedNames | Where-Object { $actualRedNames -cnotcontains $_ })
$extraRed=@($actualRedNames | Where-Object { $expectedRedNames -cnotcontains $_ })
if ($unsupportedRed.Count -ne 0 -or $missingRed.Count -ne 0 -or $extraRed.Count -ne 0 -or $actualRedNames.Count -ne 8) {
    throw "Promotion RED transcript inventory mismatch. Missing: $($missingRed -join ', '); Extra: $($extraRed -join ', ')"
}
$preMap=[ordered]@{}
foreach ($file in @($redEntries | Sort-Object Name)) {
    $preMap[$file.Name]=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
}
$mapCanonicalizer=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$preMapCanonical=@((ConvertTo-Json $preMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $preMapCanonical.Count -ne 1) { throw 'Could not canonicalize promotion RED map' }
Write-PlanERegisteredText -Path $preMapTemp -Text ($preMapCanonical[0] + "`n") -ExpectedPhase 'step0'
$lockedRedMap=[IO.File]::ReadAllText($preMapTemp,[Text.UTF8Encoding]::new($false))
if ($lockedRedMap -cne $preMapCanonical[0] + "`n") { throw 'Promotion RED map bytes are not canonical' }
Move-PlanERegisteredPath -Source $preMapTemp -Destination $preMapPath -ExpectedPhase 'step0'
$redSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
Write-PlanERegisteredText -Path $redSourceTemp -Text ($redSource + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($redSourceTemp,[Text.UTF8Encoding]::new($false)) -cne $redSource + "`n") { throw 'Promotion RED source record validation failed' }
Move-PlanERegisteredPath -Source $redSourceTemp -Destination $redSourcePath -ExpectedPhase 'step0'
& git check-ignore -q -- $preMapPath
if ($LASTEXITCODE -ne 0) { throw 'Promotion RED hash map is not ignored' }
```

Commit the accepted RED tests before touching production. Stage exactly
`host/test_update_engine_resume.py`, require `host/update_engine.py` unchanged
from HEAD, run cached diff check, and commit exact subject
`test(update): cover locked preparing promotion`. Record the full test commit SHA
in the ledger inputs. This commit must contain one path only.

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
$expected=@('host/test_update_engine_resume.py')
& git diff --quiet HEAD -- 'host/update_engine.py'
if ($LASTEXITCODE -ne 0) { throw 'Production changed before RED test commit' }
$stageExit=Invoke-PlanEStep0Writer -FilePath $script:PlanEGitCommand -ArgumentList (@('add','--') + $expected) -ExpectedWorkingDirectory (Get-Location).Path
if ($stageExit -ne 0) { throw 'Could not stage promotion RED tests' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0 -or $actual.Count -ne 1 -or $actual[0] -cne $expected[0]) {
    throw 'Promotion RED test commit path mismatch'
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Promotion RED staged diff check failed' }
$commitExit=Invoke-PlanEStep0Writer -FilePath $script:PlanEGitCommand -ArgumentList @('commit','-m','test(update): cover locked preparing promotion') -ExpectedWorkingDirectory (Get-Location).Path
if ($commitExit -ne 0) { throw 'Promotion RED test commit failed' }
```

Implement exactly the accepted design in `host/update_engine.py`:

```py
import time

_replace_path = os.replace
_sleep = time.sleep
_is_windows = os.name == "nt"

PROMOTION_RETRY_DELAYS = (0.05, 0.2)
PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))
```

Keep `UpdateEngine.__init__` unchanged. Insert this exact validator immediately
after `_verify_prepared_workspace`; Step 5's AST audit compares its complete AST
to this committed contract, not just its name or signature:

<!-- PROMOTION_VALIDATOR_START -->
```py
def _require_preparing_promotion_candidate(
    self,
    package: ValidatedPackage,
    candidate: OwnershipPlan,
    candidate_bytes: bytes,
    paths: TransactionPaths,
    staging: UpdateJournal,
) -> None:
    try:
        prepared = transition(staging, JournalPhase.PREPARED)
        expected_updates_root = self.install_root / "updates"
        expected_transactions_root = expected_updates_root / "transactions"
        expected_preparing_root = (
            expected_transactions_root / f"{staging.transaction_id}.preparing"
        )
        expected_transaction_root = (
            expected_transactions_root / staging.transaction_id
        )
        if (
            paths.install_root != self.install_root
            or paths.updates_root != expected_updates_root
            or paths.transactions_root != expected_transactions_root
            or paths.preparing_root != expected_preparing_root
            or paths.preparing_staged_root != expected_preparing_root / "staged"
            or paths.preparing_staged_host
            != expected_preparing_root / "staged" / "host"
            or paths.preparing_staged_extension
            != expected_preparing_root / "staged" / "extension"
            or paths.preparing_probe_manifest
            != expected_preparing_root / "probe" / UPDATE_MANIFEST_PATH
            or paths.preparing_ownership
            != expected_preparing_root / "ownership.json"
            or paths.preparing_journal != expected_preparing_root / "journal.json"
            or paths.transaction_root != expected_transaction_root
        ):
            raise PreparedTransactionConflict()
        if (
            type(candidate_bytes) is not bytes
            or candidate.transaction_id != staging.transaction_id
            or candidate.target_version != staging.target_version
            or candidate.target_version != package.manifest.package_version
            or candidate.prior_version != staging.prior_version
            or staging.fresh_install != (candidate.source is OwnershipSource.FRESH)
            or ownership_plan_bytes(candidate) != candidate_bytes
            or ownership_plan_sha256(candidate) != prepared.ownership_sha256
        ):
            raise PreparedTransactionConflict()

        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        plain_directories = (
            self.install_root,
            paths.updates_root,
            paths.transactions_root,
            paths.preparing_root,
        )
        canonical_directories: list[Path] = []
        for directory in plain_directories:
            info = directory.lstat()
            attributes = getattr(info, "st_file_attributes", 0)
            if not stat.S_ISDIR(info.st_mode) or attributes & reparse:
                raise PreparedTransactionConflict()
            directory.relative_to(self.install_root)
            canonical = directory.resolve(strict=True)
            canonical.relative_to(self.install_root)
            if canonical != directory:
                raise PreparedTransactionConflict()
            canonical_directories.append(canonical)

        expected_host = tuple(
            sorted(
                (
                    *candidate.host_files,
                    *candidate.seed_files,
                    *candidate.metadata_files,
                )
            )
        )
        expected_files = {
            "journal.json",
            "ownership.json",
            f"probe/{UPDATE_MANIFEST_PATH}",
        }
        expected_files.update(
            f"staged/host/{item.path}" for item in expected_host
        )
        expected_files.update(
            f"staged/extension/{item.path}" for item in candidate.extension_files
        )
        expected_directories = {
            "probe",
            "staged",
            "staged/host",
            "staged/extension",
        }
        for relative in expected_files:
            parts = relative.split("/")
            expected_directories.update(
                "/".join(parts[:index]) for index in range(1, len(parts))
            )

        actual_files: set[str] = set()
        actual_directories: set[str] = set()
        canonical_preparing_root = canonical_directories[-1]

        def visit(directory: Path) -> None:
            for child in sorted(directory.iterdir(), key=lambda item: item.name):
                info = child.lstat()
                attributes = getattr(info, "st_file_attributes", 0)
                if attributes & reparse:
                    raise PreparedTransactionConflict()
                relative = child.relative_to(paths.preparing_root).as_posix()
                canonical_child = child.resolve(strict=True)
                canonical_child.relative_to(canonical_preparing_root)
                if canonical_child != child:
                    raise PreparedTransactionConflict()
                if stat.S_ISDIR(info.st_mode):
                    if relative not in expected_directories:
                        raise PreparedTransactionConflict()
                    actual_directories.add(relative)
                    visit(child)
                elif stat.S_ISREG(info.st_mode):
                    if relative not in expected_files:
                        raise PreparedTransactionConflict()
                    actual_files.add(relative)
                else:
                    raise PreparedTransactionConflict()

        visit(paths.preparing_root)
        if (
            actual_directories != expected_directories
            or actual_files != expected_files
        ):
            raise PreparedTransactionConflict()
        if read_journal(paths.preparing_journal) != prepared:
            raise PreparedTransactionConflict()
        self._verify_prepared_workspace(
            package,
            candidate,
            candidate_bytes,
            paths,
            preparing=True,
        )

        def require_absent(path: Path) -> None:
            try:
                path.lstat()
            except FileNotFoundError:
                return
            raise PreparedTransactionConflict()

        require_absent(paths.transaction_root)
        canonical_destination = paths.transaction_root.resolve(strict=False)
        canonical_destination.relative_to(self.install_root)
        if (
            canonical_destination != expected_transaction_root
            or canonical_destination.parent != canonical_directories[2]
        ):
            raise PreparedTransactionConflict()
        require_absent(canonical_destination)
    except PreparedTransactionConflict:
        raise
    except Exception as error:
        raise PreparedTransactionConflict() from error
```
<!-- PROMOTION_VALIDATOR_END -->

Add the exact single private
`_promote_preparing_with_retry(self,package,candidate,candidate_bytes,paths,staging)`
method below the validator. The logical
`workspace:promote-preparing` operation invokes before/after hooks once around a
call to `_promote_preparing_with_retry`. That method's loop revalidates initially, after each classified
transient failure before sleep, and after sleep immediately before retry. It
uses exact integer `winerror`, `_is_windows`, at most three attempts, and delays
`0.05`, `0.2`; every other error/state change fails through existing
`PreparedTransactionConflict` wrapping without retry. `os.replace` remains the
only atomic publication and active is still written only afterward.

The retry method body is exact so implementation, mutation, and static review
share one contract:

<!-- PROMOTION_METHOD_START -->
```py
def _promote_preparing_with_retry(
    self,
    package: ValidatedPackage,
    candidate: OwnershipPlan,
    candidate_bytes: bytes,
    paths: TransactionPaths,
    staging: UpdateJournal,
) -> None:
    # promotion-checkpoint: initial
    self._require_preparing_promotion_candidate(
        package, candidate, candidate_bytes, paths, staging
    )
    for attempt in range(1 + len(PROMOTION_RETRY_DELAYS)):
        try:
            _replace_path(paths.preparing_root, paths.transaction_root)
            return
        except OSError as error:
            winerror = getattr(error, "winerror", None)
            if not _is_windows or type(winerror) is not int or winerror not in PROMOTION_TRANSIENT_WINERRORS or attempt >= len(PROMOTION_RETRY_DELAYS):
                raise
            # promotion-checkpoint: pre-sleep
            self._require_preparing_promotion_candidate(
                package, candidate, candidate_bytes, paths, staging
            )
            delay = PROMOTION_RETRY_DELAYS[attempt]
            _sleep(delay)
            # promotion-checkpoint: post-sleep
            self._require_preparing_promotion_candidate(
                package, candidate, candidate_bytes, paths, staging
            )
    raise RuntimeError("unreachable promotion retry state")
```
<!-- PROMOTION_METHOD_END -->

Replace the old `transaction_root.exists()`/`preparing_root.exists()` precheck
and direct `os.replace` operation with this exact call site; the validator owns
both source and destination state checks:

```py
self._run_preparation_operation(
    "workspace:promote-preparing",
    lambda: self._promote_preparing_with_retry(
        package,
        candidate,
        candidate_bytes,
        paths,
        staging,
    ),
)
```

Run the focused GREEN as eight independent exact selectors through the executor
below. Each selector must exit 0 with its exact name once, `... ok`, `Ran 1 test`,
final `OK`, and no `FAIL`, `ERROR`, or `skipped`; the eight validated transcripts
together are the focused 8/8 evidence. Then run:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
function Import-PromotionExecutor {
    $executor='.superpowers/sdd/invoke-promotion-test.ps1'
    $expected=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-executor.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
    if ($actual -cne $expected) { throw 'Promotion executor hash changed before GREEN' }
    . $executor
    $definition=(Get-Command Invoke-PromotionTest -CommandType Function).Definition
    Set-Item -Path Function:global:Invoke-PromotionTest -Value $definition
}
Import-PromotionExecutor
$greenDir='.superpowers/sdd/promotion-transcripts/green'
$greenMapPath='.superpowers/sdd/promotion-green.sha256.json'
$greenSourcePath='.superpowers/sdd/promotion-green-source.sha256'
$greenMapTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-green-map.tmp'
$greenSourceTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-green-source.tmp'
foreach ($path in @($greenDir,$greenMapPath,$greenMapTemp,$greenSourcePath,$greenSourceTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion GREEN chronology path already exists: $path" }
}
New-PlanERegisteredDirectory -Path $greenDir -ExpectedPhase 'step0'
$methods=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once',
    'test_update_engine_constructor_signature_remains_frozen'
)
foreach ($method in $methods) {
    $text=Invoke-PromotionTest -Method $method -ExpectedExit 0 -ExpectedStatus 'ok'
    $target=Join-Path $greenDir "$method.txt"
    $temporary=Join-Path $script:PlanEStep0TempRoot "green-$method.tmp"
    Write-PlanERegisteredText -Path $temporary -Text ($text + "`n") -ExpectedPhase 'step0'
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw "Promotion GREEN transcript validation failed: $method" }
    Move-PlanERegisteredPath -Source $temporary -Destination $target -ExpectedPhase 'step0'
}
$expectedGreenNames=@($methods | ForEach-Object { "$_.txt" } | Sort-Object)
$greenEntries=@(Get-ChildItem -LiteralPath $greenDir -Force)
$unsupportedGreen=@($greenEntries | Where-Object { $_.PSIsContainer -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualGreenNames=@($greenEntries | Where-Object { -not $_.PSIsContainer } | ForEach-Object Name | Sort-Object)
$missingGreen=@($expectedGreenNames | Where-Object { $actualGreenNames -cnotcontains $_ })
$extraGreen=@($actualGreenNames | Where-Object { $expectedGreenNames -cnotcontains $_ })
if ($unsupportedGreen.Count -ne 0 -or $missingGreen.Count -ne 0 -or $extraGreen.Count -ne 0 -or $actualGreenNames.Count -ne 8) {
    throw "Promotion GREEN transcript inventory mismatch. Missing: $($missingGreen -join ', '); Extra: $($extraGreen -join ', ')"
}
$greenMap=[ordered]@{}
foreach ($file in @($greenEntries | Sort-Object Name)) {
    $greenMap[$file.Name]=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
}
$mapCanonicalizer=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$greenCanonical=@((ConvertTo-Json $greenMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $greenCanonical.Count -ne 1) { throw 'Could not canonicalize promotion GREEN map' }
Write-PlanERegisteredText -Path $greenMapTemp -Text ($greenCanonical[0] + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($greenMapTemp,[Text.UTF8Encoding]::new($false)) -cne $greenCanonical[0] + "`n") { throw 'Promotion GREEN map bytes are not canonical' }
Move-PlanERegisteredPath -Source $greenMapTemp -Destination $greenMapPath -ExpectedPhase 'step0'
$greenSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
Write-PlanERegisteredText -Path $greenSourceTemp -Text ($greenSource + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($greenSourceTemp,[Text.UTF8Encoding]::new($false)) -cne $greenSource + "`n") { throw 'Promotion GREEN source record validation failed' }
Move-PlanERegisteredPath -Source $greenSourceTemp -Destination $greenSourcePath -ExpectedPhase 'step0'
```

Then run:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$root=Join-Path $script:PlanEStep0TempRoot 'env-green-suite'
$environment=[ordered]@{PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path;PYTHONDONTWRITEBYTECODE='1';DH_PROMOTION_EVIDENCE=$null}
try {
    New-PlanERegisteredDirectory -Path $root -ExpectedPhase 'step0'
    foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
        $value=Join-Path $root $name.ToLowerInvariant()
        New-PlanERegisteredDirectory -Path $value -ExpectedPhase 'step0'
        $environment[$name]=$value
    }
    $suiteExit=Invoke-PlanEEnvironmentScope -Context 'Step 0 GREEN suite' -Overrides $environment -Body { Invoke-PlanEStep0Writer -FilePath $script:PlanEPythonCommand -ArgumentList @('-m','unittest','host.test_update_engine_resume','-v') -ExpectedWorkingDirectory (Get-Location).Path }
    if ($suiteExit -ne 0) { throw 'Update-engine resume suite failed' }
} finally {
    if (Test-Path -LiteralPath $root) { $rootInfo=Get-Item -LiteralPath $root -Force; if ($rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: unsafe Step 0 GREEN temp cleanup' }; Remove-PlanERegisteredPath -Path $root -ExpectedPhase 'step0' -Recurse }
}
```

Mutation proofs independently remove transient classification, change the
three-attempt bound to four, and remove each initial/pre-sleep/post-sleep
revalidation call. For each mutation, save original file bytes, assert one exact
source replacement occurred, run the matching selector through the same fresh
isolated executor, require exit 1 plus the exact `... FAIL`/one-test/failure-only
output, and restore original bytes in `finally`; require byte equality after
restoration. Use these exact selectors:

```text
test_windows_access_denied_retries_atomic_preparing_promotion
test_persistent_windows_promotion_lock_stops_after_three_attempts
test_preparing_promotion_revalidates_before_and_after_sleep
test_preparing_promotion_revalidation_rejects_every_authority_mismatch
```

Each mutation must produce unittest exit 1 for its matching selector, never an
import/setup error. Restore after every run, rerun the exact focused GREEN, and
require `git diff --check`.

The implementation includes checkpoint marker comments
`# promotion-checkpoint: initial`, `# promotion-checkpoint: pre-sleep`, and
`# promotion-checkpoint: post-sleep` immediately before the respective helper
calls; a source-contract test requires each once in this order. The five mutation
replacements are exact and each must match once:

```text
classification: `if not _is_windows or type(winerror) is not int or winerror not in PROMOTION_TRANSIENT_WINERRORS or attempt >= len(PROMOTION_RETRY_DELAYS):` -> `if True:`
bound: `PROMOTION_RETRY_DELAYS = (0.05, 0.2)` -> `PROMOTION_RETRY_DELAYS = (0.05, 0.2, 0.4)`
initial marker plus helper call -> `pass  # mutation: omit initial revalidation`
pre-sleep marker plus helper call -> `pass  # mutation: omit pre-sleep revalidation`
post-sleep marker plus helper call -> `pass  # mutation: omit post-sleep revalidation`
```

For each mutation, read and save original `host/update_engine.py` bytes, decode
strict UTF-8, require the old block occurs exactly once, replace it, write UTF-8
without BOM, invoke the mapped fully qualified selector through
`Invoke-PromotionTest`, then restore the original bytes in `finally`. After
restoration compare SHA-256 and bytes to the original. The exact mapping is:

```text
classification -> test_windows_access_denied_retries_atomic_preparing_promotion
bound -> test_persistent_windows_promotion_lock_stops_after_three_attempts
initial -> test_preparing_promotion_revalidates_before_and_after_sleep
pre-sleep -> test_preparing_promotion_revalidation_rejects_every_authority_mismatch
post-sleep -> test_preparing_promotion_revalidation_rejects_every_authority_mismatch
```

Every mutation tool call begins with `$ErrorActionPreference='Stop'` and dots
`.superpowers/sdd/invoke-promotion-test.ps1`; mappings above are bare method
names because the executor adds the module/class prefix. Mutation output uses
the same case-sensitive status/error checks as RED.

After `Assert-PlanERunLease -ExpectedPhase 'step0'`, create
`.superpowers/sdd/run-promotion-mutations.ps1` with exclusive
`FileMode.CreateNew` as a second ignored UTF-8-no-BOM evidence script. It defines a five-row literal table
with fields `Name`, `Old`, `New`, and `Method`; the `Old` value for each
checkpoint is the complete marker comment plus the full six-argument helper
call, not a description. For each row it:

1. reads original bytes and SHA-256;
2. strict-decodes UTF-8 and requires exactly one ordinal occurrence of `Old`;
3. writes the one replacement without BOM;
4. invokes `Invoke-PromotionTest -Method $row.Method -ExpectedExit 1 -ExpectedStatus 'FAIL'`;
5. restores original bytes in `finally`;
6. rereads and requires byte equality and SHA equality;
7. runs the exact method GREEN after restoration.

The script requires all five rows execute and prints one fixed `MUTATION PASS:
<name>` line per row. It is read back, hashed, ignored, and recorded exactly like
the selector executor. The final report includes both script hashes and all five
fixed PASS lines; neither script is staged before the final exact force-add,
when both are committed as manifest artifacts.

Its complete body is:

<!-- PROMOTION_MUTATION_RUNNER_START -->
```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$executor='.superpowers/sdd/invoke-promotion-test.ps1'
$expectedExecutorHash=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-executor.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
$actualExecutorHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
if ($actualExecutorHash -cne $expectedExecutorHash) { throw 'Promotion executor hash changed before mutation run' }
. $executor
$path='host/update_engine.py'
$initialCall=@'
        # promotion-checkpoint: initial
        self._require_preparing_promotion_candidate(
            package, candidate, candidate_bytes, paths, staging
        )
'@
$preSleepCall=@'
                # promotion-checkpoint: pre-sleep
                self._require_preparing_promotion_candidate(
                    package, candidate, candidate_bytes, paths, staging
                )
'@
$postSleepCall=@'
                # promotion-checkpoint: post-sleep
                self._require_preparing_promotion_candidate(
                    package, candidate, candidate_bytes, paths, staging
                )
'@
$rows=@(
    [ordered]@{Name='classification';Old='if not _is_windows or type(winerror) is not int or winerror not in PROMOTION_TRANSIENT_WINERRORS or attempt >= len(PROMOTION_RETRY_DELAYS):';New='if True:';Method='test_windows_access_denied_retries_atomic_preparing_promotion'},
    [ordered]@{Name='bound';Old='PROMOTION_RETRY_DELAYS = (0.05, 0.2)';New='PROMOTION_RETRY_DELAYS = (0.05, 0.2, 0.4)';Method='test_persistent_windows_promotion_lock_stops_after_three_attempts'},
    [ordered]@{Name='initial';Old=$initialCall;New='        pass  # mutation: omit initial revalidation';Method='test_preparing_promotion_revalidates_before_and_after_sleep'},
    [ordered]@{Name='pre-sleep';Old=$preSleepCall;New='                pass  # mutation: omit pre-sleep revalidation';Method='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'},
    [ordered]@{Name='post-sleep';Old=$postSleepCall;New='                pass  # mutation: omit post-sleep revalidation';Method='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'}
)
$outputRoot='.superpowers/sdd/promotion-transcripts'
$original=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $path))
$originalHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($original))
$mutationMapPath='.superpowers/sdd/promotion-mutation.sha256.json'
if ([string]::IsNullOrWhiteSpace([string]$script:PlanEStep0TempRoot)) { throw 'Plan E Step 0 temporary root is unavailable' }
$mutationMapTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-map.tmp'
if ((Test-Path -LiteralPath $mutationMapPath) -or (Test-Path -LiteralPath $mutationMapTemp)) { throw 'Promotion mutation map or temporary already exists' }
foreach ($row in $rows) {
    $directory=Join-Path $outputRoot ("mutation-" + $row.Name)
    if (Test-Path -LiteralPath $directory) { throw "Mutation transcript exists: $($row.Name)" }
    New-PlanERegisteredDirectory -Path $directory -ExpectedPhase 'step0'
    try {
        $text=[Text.UTF8Encoding]::new($false,$true).GetString($original)
        if ([regex]::Matches($text,[regex]::Escape($row.Old)).Count -ne 1) {
            throw "Mutation source block mismatch: $($row.Name)"
        }
        $mutated=$text.Replace($row.Old,$row.New)
        Set-PlanERegisteredText -Path $path -Text $mutated -ExpectedPhase 'step0'
        $failure=Invoke-PromotionTest -Method $row.Method -ExpectedExit 1 -ExpectedStatus 'FAIL'
        $failureTarget=Join-Path $directory "$($row.Method).txt"
        $failureTemp=Join-Path $script:PlanEStep0TempRoot "mutation-$($row.Name)-failure.tmp"
        Write-PlanERegisteredText -Path $failureTemp -Text ($failure + "`n") -ExpectedPhase 'step0'
        if ([IO.File]::ReadAllText($failureTemp,[Text.UTF8Encoding]::new($false)) -cne $failure + "`n" -or (Test-Path -LiteralPath $failureTarget)) { throw "Promotion mutation transcript validation failed: $($row.Name)" }
        Move-PlanERegisteredPath -Source $failureTemp -Destination $failureTarget -ExpectedPhase 'step0'
    } finally {
        Set-PlanERegisteredBytes -Path $path -Bytes $original -ExpectedPhase 'step0'
    }
    $restored=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $path))
    $restoredHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($restored))
    if ([Convert]::ToHexString($restored) -cne [Convert]::ToHexString($original) -or $restoredHash -cne $originalHash) {
        throw "Mutation restoration mismatch: $($row.Name)"
    }
    $restoredGreen=Invoke-PromotionTest -Method $row.Method -ExpectedExit 0 -ExpectedStatus 'ok'
    $greenTarget=Join-Path $directory "$($row.Method).restored-green.txt"
    $greenTemp=Join-Path $script:PlanEStep0TempRoot "mutation-$($row.Name)-restored.tmp"
    Write-PlanERegisteredText -Path $greenTemp -Text ($restoredGreen + "`n") -ExpectedPhase 'step0'
    if ([IO.File]::ReadAllText($greenTemp,[Text.UTF8Encoding]::new($false)) -cne $restoredGreen + "`n" -or (Test-Path -LiteralPath $greenTarget)) { throw "Promotion restored GREEN transcript validation failed: $($row.Name)" }
    Move-PlanERegisteredPath -Source $greenTemp -Destination $greenTarget -ExpectedPhase 'step0'
    "MUTATION PASS: $($row.Name)"
}
$expectedTranscriptMethods=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen'
)
$expectedMutationMethods=[ordered]@{}
foreach ($row in $rows) { $expectedMutationMethods[$row.Name]=$row.Method }
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@()
foreach ($method in $expectedTranscriptMethods) { $expectedTranscriptFiles += "red/$method.txt"; $expectedTranscriptFiles += "green/$method.txt" }
foreach ($entry in $expectedMutationMethods.GetEnumerator()) { $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"; $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$rootInfo=Get-Item -LiteralPath $outputRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $outputRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath((Join-Path (Get-Location) $outputRoot),$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath((Join-Path (Get-Location) $outputRoot),$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ }); $extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ })
$missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ }); $extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if ($rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $unsupportedTranscriptEntries.Count -ne 0 -or $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0) { throw 'Promotion mutation transcript topology mismatch' }
$mutationMap=[ordered]@{}
foreach ($relative in @($actualTranscriptFiles | Where-Object { $_ -like 'mutation-*/*' })) {
    $fullPath=Join-Path $outputRoot $relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
    $mutationMap[$relative]=(Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash.ToLowerInvariant()
}
$mapCanonicalizer=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$mutationCanonical=@((ConvertTo-Json $mutationMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $mutationCanonical.Count -ne 1) { throw 'Could not canonicalize promotion mutation map' }
Write-PlanERegisteredText -Path $mutationMapTemp -Text ($mutationCanonical[0] + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($mutationMapTemp,[Text.UTF8Encoding]::new($false)) -cne $mutationCanonical[0] + "`n") { throw 'Promotion mutation map bytes are not canonical' }
Move-PlanERegisteredPath -Source $mutationMapTemp -Destination $mutationMapPath -ExpectedPhase 'step0'
```
<!-- PROMOTION_MUTATION_RUNNER_END -->

Create the exact runner through the current lease/owner registration before
invoking it:

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
$runner='.superpowers/sdd/run-promotion-mutations.ps1'
if (Test-Path -LiteralPath $runner) { throw 'Promotion mutation runner already exists' }
$planText=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for mutation-runner creation' }
$runnerMatch=[regex]::Match($planText,'(?s)<!-- PROMOTION_MUTATION_RUNNER_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_MUTATION_RUNNER_END -->')
if (-not $runnerMatch.Success) { throw 'Committed promotion mutation-runner contract is missing' }
Write-PlanERegisteredExclusiveText -Path $runner -Text ($runnerMatch.Groups[1].Value + "`n") -ExpectedPhase 'step0'
```

Invoke and validate the mutation runner in the same mutex-owning controller:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$runner='.superpowers/sdd/run-promotion-mutations.ps1'
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) { throw 'Promotion mutation runner is missing' }
& git check-ignore -q -- $runner
if ($LASTEXITCODE -ne 0) { throw 'Promotion mutation runner is not ignored' }
$runnerText=[IO.File]::ReadAllText((Join-Path (Get-Location) $runner),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n"
$planText=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for mutation runner' }
$runnerMatch=[regex]::Match($planText,'(?s)<!-- PROMOTION_MUTATION_RUNNER_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_MUTATION_RUNNER_END -->')
if (-not $runnerMatch.Success) { throw 'Could not extract committed mutation runner' }
if ($runnerText.TrimEnd("`n") -cne $runnerMatch.Groups[1].Value) { throw 'Mutation runner differs from committed plan' }
$runnerHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $runner).Hash.ToLowerInvariant()
$runnerHashPath='.superpowers/sdd/promotion-mutation-runner.sha256'
$runnerHashTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-runner-sha256.tmp'
foreach ($path in @($runnerHashPath,$runnerHashTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion mutation-runner hash-record path already exists: $path" }
}
try {
    $expectedBytes=[Text.UTF8Encoding]::new($false).GetBytes($runnerHash + "`n")
    Write-PlanERegisteredExclusiveBytes -Path $runnerHashTemp -Bytes $expectedBytes -ExpectedPhase 'step0'
    $tempFullPath=Assert-PlanERegisteredMutationPath -Path $runnerHashTemp -ExpectedPhase 'step0'
    $actualBytes=[IO.File]::ReadAllBytes($tempFullPath)
    if ([Convert]::ToHexString($actualBytes) -cne [Convert]::ToHexString($expectedBytes)) { throw 'Promotion mutation-runner hash-record temporary validation failed' }
    Move-PlanERegisteredPath -Source $runnerHashTemp -Destination $runnerHashPath -ExpectedPhase 'step0'
} finally {
    if (Test-Path -LiteralPath $runnerHashTemp) { Remove-PlanERegisteredPath -Path $runnerHashTemp -ExpectedPhase 'step0' }
}
$mutationSourcePath='.superpowers/sdd/promotion-mutation-source.sha256'
$mutationSourceTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-mutation-source.tmp'
if ((Test-Path -LiteralPath $mutationSourcePath) -or (Test-Path -LiteralPath $mutationSourceTemp)) { throw 'Promotion mutation source record or temporary already exists' }
$lines=@(. $runner 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Promotion mutation runner failed`n$($lines -join "`n")" }
foreach ($name in @('classification','bound','initial','pre-sleep','post-sleep')) {
    if (@($lines | Where-Object { $_ -ceq "MUTATION PASS: $name" }).Count -ne 1) {
        throw "Promotion mutation PASS line mismatch: $name"
    }
}
$mutationSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
Write-PlanERegisteredText -Path $mutationSourceTemp -Text ($mutationSource + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($mutationSourceTemp,[Text.UTF8Encoding]::new($false)) -cne $mutationSource + "`n") { throw 'Promotion mutation source record validation failed' }
Move-PlanERegisteredPath -Source $mutationSourceTemp -Destination $mutationSourcePath -ExpectedPhase 'step0'
"Promotion mutation runner SHA-256: $runnerHash"
```

Commit only the production path after this exact staged-set and diff check:

```text
host/update_engine.py
```

Before staging, execute the committed-plan AST audit block from Step 5 verbatim:
read current committed plan, extract the text between
`PROMOTION_AST_AUDIT_START/END`, pipe it to Host Python, require exit 0, and
require full AST equality for the production validator, retry method, and
complete promotion test class against their marked plan contracts while
retaining every structural audit below. Write
`.superpowers/sdd/promotion-ast.sha256` with audit-program, engine, and test
SHA-256 values. If this audit fails, do not stage or commit; fix through a new
focused RED and rerun all Step 0 evidence. Step 5 later repeats the same audit
against the committed promotion change.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$planText=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for pre-commit AST audit' }
$match=[regex]::Match($planText,'(?s)<!-- PROMOTION_AST_AUDIT_START -->\n```python\n(.*?)\n```\n<!-- PROMOTION_AST_AUDIT_END -->')
if (-not $match.Success) { throw 'Could not extract pre-commit AST audit' }
$audit=$match.Groups[1].Value
$audit | & 'host\venv\Scripts\python.exe' -
if ($LASTEXITCODE -ne 0) { throw 'Pre-commit promotion AST audit failed' }
$auditHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($audit))).ToLowerInvariant()
$engineHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/update_engine.py').Hash.ToLowerInvariant()
$testHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/test_update_engine_resume.py').Hash.ToLowerInvariant()
$astRecordPath='.superpowers/sdd/promotion-ast.sha256'
$astRecordTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-ast.tmp'
if ((Test-Path -LiteralPath $astRecordPath) -or (Test-Path -LiteralPath $astRecordTemp)) { throw 'Promotion pre-commit AST record or temporary already exists' }
$astRecord="$auditHash $engineHash $testHash`n"
Write-PlanERegisteredText -Path $astRecordTemp -Text $astRecord -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($astRecordTemp,[Text.UTF8Encoding]::new($false)) -cne $astRecord) { throw 'Promotion AST record validation failed' }
Move-PlanERegisteredPath -Source $astRecordTemp -Destination $astRecordPath -ExpectedPhase 'step0'
```

Use exact subject `fix(update): retry locked preparing promotion`. Record this
focused RED/GREEN/mutation/commit and the historical uncontrolled/controlled
WinError observations in the final report. Only after this commit continue to
Step 1.

```powershell
Assert-PlanERunLease -ExpectedPhase 'step0'
$expected=@('host/update_engine.py')
$stageExit=Invoke-PlanEStep0Writer -FilePath $script:PlanEGitCommand -ArgumentList (@('add','--') + $expected) -ExpectedWorkingDirectory (Get-Location).Path
if ($stageExit -ne 0) { throw 'Could not stage promotion retry paths' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged promotion paths' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne 1) {
    throw "Promotion staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Promotion staged diff check failed' }
$commitExit=Invoke-PlanEStep0Writer -FilePath $script:PlanEGitCommand -ArgumentList @('commit','-m','fix(update): retry locked preparing promotion') -ExpectedWorkingDirectory (Get-Location).Path
if ($commitExit -ne 0) { throw 'Promotion retry commit failed' }
```

After commit, run the exact focused method
`test_windows_access_denied_retries_atomic_preparing_promotion` with environment
variable `DH_PROMOTION_EVIDENCE` naming an ignored fresh JSON output path. That
selected evidence method runs three fresh internal scenarios: first-attempt
success, WinError 5 then success, and three-attempt exhaustion. It exclusively
creates the canonical JSON after all state, cause, checkpoint, delay, and hook
assertions for all three scenarios pass. Strict-load that JSON with
duplicate-key rejection and require exact values. Then create the canonical
ledger:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'step0'
$observedPath='.superpowers/sdd/promotion-observed.json'
$observedTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-observed.tmp'
if ((Test-Path -LiteralPath $observedPath) -or (Test-Path -LiteralPath $observedTemp)) { throw 'Promotion observed evidence or temporary already exists' }
$executor='.superpowers/sdd/invoke-promotion-test.ps1'
$expected=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-executor.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
$actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $executor).Hash.ToLowerInvariant()
if ($actual -cne $expected) { throw 'Promotion executor hash changed before observed evidence run' }
. $executor
$absoluteObservedTemp=Join-Path (Get-Location) $observedTemp
Invoke-PromotionTest -Method 'test_windows_access_denied_retries_atomic_preparing_promotion' -ExpectedExit 0 -ExpectedStatus 'ok' -EvidencePath $absoluteObservedTemp | Out-Null
if (-not (Test-Path -LiteralPath $observedTemp -PathType Leaf)) { throw 'Promotion observed evidence temporary is missing' }
$python=@'
import json, pathlib, sys
def strict_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate key')
        result[key] = value
    return result
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
def exact(actual, expected, path='root'):
    if type(actual) is not type(expected): raise SystemExit('type mismatch at '+path)
    if isinstance(expected, dict):
        if set(actual)!=set(expected): raise SystemExit('key mismatch at '+path)
        for key in expected: exact(actual[key],expected[key],path+'.'+key)
    elif isinstance(expected, list):
        if len(actual)!=len(expected): raise SystemExit('length mismatch at '+path)
        for index,(left,right) in enumerate(zip(actual,expected)): exact(left,right,f'{path}[{index}]')
    elif actual!=expected: raise SystemExit('value mismatch at '+path)
path = pathlib.Path(sys.argv[1])
value = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=strict_pairs, parse_constant=reject_constant)
expected = {
    'attempts': {'transient_then_success': 2, 'exhausted': 3},
    'delays': {'transient_then_success': [0.05], 'exhausted': [0.05, 0.2]},
    'checkpoint_calls': {'first_success': 1, 'one_retry': 3, 'exhausted': 5},
    'hook_counts': {'retry_success': {'before': 1, 'after': 1}, 'exhausted': {'before': 1, 'after': 0}},
    'state_and_cause': 'passed',
}
exact(value,expected)
print(json.dumps(value, sort_keys=True, separators=(',', ':')))
'@
$observedCanonical=@($python | & 'host\venv\Scripts\python.exe' - $observedTemp)
if ($LASTEXITCODE -ne 0 -or $observedCanonical.Count -ne 1) { throw 'Promotion observed evidence validation failed' }
$observedText=[IO.File]::ReadAllText((Join-Path (Get-Location) $observedTemp),[Text.UTF8Encoding]::new($false))
if ($observedText -cne $observedCanonical[0] + "`n") { throw 'Promotion observed evidence is not canonical' }
Move-PlanERegisteredPath -Source $observedTemp -Destination $observedPath -ExpectedPhase 'step0'
$planCommit=@($script:PlanEPlanCommit)
$promotionCommit=@(& git rev-parse HEAD)
$testCommit=@(& git log -1 --format=%H HEAD -- 'host/test_update_engine_resume.py')
if ($LASTEXITCODE -ne 0 -or $planCommit.Count -ne 1 -or $promotionCommit.Count -ne 1 -or $testCommit.Count -ne 1) { throw 'Could not resolve promotion ledger commits' }
$executorHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/invoke-promotion-test.ps1').Hash.ToLowerInvariant()
$runnerHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/run-promotion-mutations.ps1').Hash.ToLowerInvariant()
$committedPlan=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan at final gate' }
$executorContract=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_EXECUTOR_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_EXECUTOR_END -->')
$runnerContract=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_MUTATION_RUNNER_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_MUTATION_RUNNER_END -->')
if (-not $executorContract.Success -or -not $runnerContract.Success) { throw 'Committed promotion script contracts are missing' }
$actualExecutor=([IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/invoke-promotion-test.ps1'),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n").TrimEnd("`n")
$actualRunner=([IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/run-promotion-mutations.ps1'),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n").TrimEnd("`n")
if ($actualExecutor -cne $executorContract.Groups[1].Value) { throw 'Final promotion executor differs from committed plan' }
if ($actualRunner -cne $runnerContract.Groups[1].Value) { throw 'Final promotion runner differs from committed plan' }
$committedPlan=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for script validation' }
$executorMatch=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_EXECUTOR_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_EXECUTOR_END -->')
$runnerMatch=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_MUTATION_RUNNER_START -->\n```powershell\n(.*?)\n```\n<!-- PROMOTION_MUTATION_RUNNER_END -->')
if (-not $executorMatch.Success -or -not $runnerMatch.Success) { throw 'Committed promotion script contract missing' }
$actualExecutor=([IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/invoke-promotion-test.ps1'),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n").TrimEnd("`n")
$actualRunner=([IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/run-promotion-mutations.ps1'),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n").TrimEnd("`n")
if ($actualExecutor -cne $executorMatch.Groups[1].Value) { throw 'Promotion executor differs from committed plan at final gate' }
if ($actualRunner -cne $runnerMatch.Groups[1].Value) { throw 'Promotion mutation runner differs from committed plan at final gate' }
$executorHashFile=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-executor.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
$runnerHashFile=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-mutation-runner.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
if ($executorHashFile -cne $executorHash -or $runnerHashFile -cne $runnerHash) { throw 'Promotion recorded script hash mismatch' }
$observed=$observedCanonical[0] | ConvertFrom-Json -AsHashtable
$ledger=[ordered]@{
    schema_version=1; plan_commit=$planCommit[0].Trim(); spec_commit='249b1a3750b50db1336fb39661db9306355a1a18'; executor_sha256=$executorHash; mutation_runner_sha256=$runnerHash;
    red_methods=@('test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once'); constructor_red_phase='passed';
    green_methods=@('test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen'); mutation_passes=@('classification','bound','initial','pre-sleep','post-sleep');
    attempts=$observed.attempts; delays=$observed.delays; checkpoint_calls=$observed.checkpoint_calls; hook_counts=$observed.hook_counts; state_and_cause=$observed.state_and_cause; test_commit=$testCommit[0].Trim(); promotion_commit=$promotionCommit[0].Trim(); update_engine_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/update_engine.py').Hash.ToLowerInvariant(); update_engine_test_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/test_update_engine_resume.py').Hash.ToLowerInvariant(); observed_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $observedPath).Hash.ToLowerInvariant(); transcript_map_sha256='pending'; red_map_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-red.sha256.json').Hash.ToLowerInvariant(); green_map_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-green.sha256.json').Hash.ToLowerInvariant(); mutation_map_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-mutation.sha256.json').Hash.ToLowerInvariant(); red_source_record_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-red-source.sha256').Hash.ToLowerInvariant(); green_source_record_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-green-source.sha256').Hash.ToLowerInvariant(); mutation_source_record_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-mutation-source.sha256').Hash.ToLowerInvariant(); ast_record_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-ast.sha256').Hash.ToLowerInvariant()
}
$ledgerPath='.superpowers/sdd/promotion-ledger.json'
$transcriptMapPath='.superpowers/sdd/promotion-transcripts.sha256.json'
$ledgerTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-ledger.tmp'
$transcriptMapTemp=Join-Path $script:PlanEStep0TempRoot 'promotion-transcript-map.tmp'
foreach ($path in @($ledgerPath,$ledgerTemp,$transcriptMapPath,$transcriptMapTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion post-commit chronology path already exists: $path" }
}
$ledgerDraft=$ledger | ConvertTo-Json -Depth 8 -Compress
$canonicalizer=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$ledgerLines=@($ledgerDraft | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $ledgerLines.Count -ne 1) { throw 'Could not canonicalize promotion ledger' }
$transcriptRoot=Join-Path (Get-Location) '.superpowers/sdd/promotion-transcripts'
$expectedTranscriptMethods=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once',
    'test_update_engine_constructor_signature_remains_frozen'
)
$expectedMutationMethods=[ordered]@{
    classification='test_windows_access_denied_retries_atomic_preparing_promotion'
    bound='test_persistent_windows_promotion_lock_stops_after_three_attempts'
    initial='test_preparing_promotion_revalidates_before_and_after_sleep'
    'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'
    'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'
}
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@()
foreach ($method in $expectedTranscriptMethods) {
    $expectedTranscriptFiles += "red/$method.txt"
    $expectedTranscriptFiles += "green/$method.txt"
}
foreach ($entry in $expectedMutationMethods.GetEnumerator()) {
    $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"
    $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt"
}
$rootInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object {
    ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or
    ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
})
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ })
$extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ })
$missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ })
$extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if (
    $rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
    $unsupportedTranscriptEntries.Count -ne 0 -or
    $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or
    $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or
    $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0
) {
    throw "Promotion transcript topology mismatch. Missing directories: $($missingTranscriptDirectories -join ', '); Extra directories: $($extraTranscriptDirectories -join ', '); Missing files: $($missingTranscriptFiles -join ', '); Extra files: $($extraTranscriptFiles -join ', ')"
}
$transcriptMap=[ordered]@{}
foreach ($relative in $actualTranscriptFiles) {
    $fullPath=Join-Path $transcriptRoot $relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
    $transcriptMap[$relative]=(Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash.ToLowerInvariant()
}
if ($transcriptMap.Count -ne 26) { throw "Promotion transcript count mismatch: $($transcriptMap.Count)" }
$transcriptMapCanonical=@((ConvertTo-Json $transcriptMap -Compress) | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $transcriptMapCanonical.Count -ne 1) { throw 'Could not canonicalize promotion transcript map' }
Write-PlanERegisteredText -Path $transcriptMapTemp -Text ($transcriptMapCanonical[0] + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($transcriptMapTemp,[Text.UTF8Encoding]::new($false)) -cne $transcriptMapCanonical[0] + "`n") { throw 'Promotion transcript map bytes are not canonical' }
Move-PlanERegisteredPath -Source $transcriptMapTemp -Destination $transcriptMapPath -ExpectedPhase 'step0'
$ledger.transcript_map_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $transcriptMapPath).Hash.ToLowerInvariant()
$ledgerDraft=$ledger | ConvertTo-Json -Depth 8 -Compress
$ledgerLines=@($ledgerDraft | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $ledgerLines.Count -ne 1) { throw 'Could not finalize promotion ledger' }
Write-PlanERegisteredText -Path $ledgerTemp -Text ($ledgerLines[0] + "`n") -ExpectedPhase 'step0'
if ([IO.File]::ReadAllText($ledgerTemp,[Text.UTF8Encoding]::new($false)) -cne $ledgerLines[0] + "`n") { throw 'Promotion ledger bytes are not canonical' }
Move-PlanERegisteredPath -Source $ledgerTemp -Destination $ledgerPath -ExpectedPhase 'step0'
foreach ($path in @($ledgerPath,$observedPath,$transcriptMapPath,'.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1')) {
    & git check-ignore -q -- $path
    if ($LASTEXITCODE -ne 0) { throw "Promotion evidence artifact is not ignored: $path" }
}
```

The controller writes one `promotion-transcripts.sha256.json` canonical ordered
JSON map of all 26 transcripts: 8 RED-phase, 8 focused GREEN, 5 mutation
failures, and 5 post-restoration mutation GREEN runs. Step 10 recomputes the map
exactly before accepting evidence.

Before Step 1 and before any evidence reset/generation, continue the same
foreground controller and transition the already-owned run from `step0` to
`evidence`. Step 0's authorized promotion sequence is complete and committed at
this point; the resolved immutable HEAD is the reviewed product head unless an
already-validated allowed focused controller-fix descendant was the run start.
The controller retains the same lease, owner, token root, and mutex through
normal final readiness and release. The fixed canonical repository is
`C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`; its lowercase
UTF-8 SHA-256 is
`06c4d8bd3362d15338256bedfa50915d338721b89391276e9d05ac57ccbffe7c`.
The mutex name is therefore exactly
`Local\DynamicsHelper.PlanE.06c4d8bd3362d15338256bedfa50915d338721b89391276e9d05ac57ccbffe7c`.

Immediately before transition, require the working tree has no tracked or staged
changes, the direct promotion implementation is in the current HEAD ancestry,
every later commit is an allowed focused controller fix, all 40 Step 0 artifacts
exist and hash cleanly, and all Step 0 writers have terminated.
Every lease-listed mutable artifact path must be absent at creation. If any is
present, report it and stop; never assume it belongs to this run or delete it.
The remaining allowed ignored baseline is the exact Step 0 promotion artifact
inventory, six surviving reports, and only the six enumerated diagnostic
recovery leaf names plus the local base record in the executable preflight, each
optional and byte-validated when present. The recovery record, when present,
must match its locked hash; any other untracked evidence path under
`.superpowers/sdd` blocks evidence transition for human inspection. Ignored
dependency/toolchain caches outside that evidence root are not inputs.

Later focused controller-fix descendants are allowed only by the bootstrap's
closed commit-subject/path policy. They become the immutable reviewed head and
force complete evidence/audit/review regeneration; they never change the exact
plan -> RED -> implementation direct-child chronology.

Run this transition block once in the already-live bootstrap shell. Every later
Task 9 block starts with `Assert-PlanERunLease -ExpectedPhase 'evidence'`; no
later block reinitializes these variables. An
abandoned mutex or existing lease is `BLOCKED`; abandoned ownership is acquired,
strictly inspected read-only, reported with exact retained fixed paths, and then
released without cleanup. The controller does not inspect PID liveness, infer
staleness, delete anything, or retry. The lease and owner records use canonical
JSON: UTF-8 without BOM, sorted keys, compact separators, no duplicate keys or
non-finite values, no CR, and one final LF.
The fixed lease path is `<git-common-dir>/plan-e-evidence-run-lease.json`, outside
artifact/reset/worktree inventories. It is exclusively created and never a
generic deletion target.
Its token is exactly 128 random bits from `RandomNumberGenerator.GetBytes(16)`,
serialized as 32 lowercase hex characters.
The lease also stores current PID and process start time converted to UTC ticks;
both must match the live owner on every reread.
It is closed over schema version, phase, lease token, run-start/reviewed heads,
PID/ticks, canonical repository, token root/owner record, lease transition
temporary, two audit temporaries, two mutation source paths, four worktrees/owner
records, 40 Step 0 artifacts/hashes, 41 exact Step 0 temporary paths, and 14
mutable artifact paths; no additional key is accepted.
The temporary owner record is closed and contains exactly sorted allowed relative
paths plus the three exact token-bearing external atomic-promotion temporaries,
including explicit current-token-owned subtree registrations for
the clean clone and isolated Host environments, plus canonical repository,
primary branch, reviewed head, schema version, temporary root, and token.

<!-- PLAN_E_RUN_OWNER_START -->
```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
$script:PlanEFinalEvidenceHead=$null
$preTransitionTrackedStatus=@(& git status --porcelain=v1 --untracked-files=no)
$preTransitionStaged=@(& git diff --cached --name-only --no-renames)
if ($LASTEXITCODE -ne 0 -or $preTransitionTrackedStatus.Count -ne 0 -or $preTransitionStaged.Count -ne 0) { throw 'BLOCKED: tracked/staged state exists before evidence transition' }
$expectedStep0Leaves=@($script:PlanEStep0Artifacts)
$transcriptRoot='.superpowers/sdd/promotion-transcripts'
if (-not (Test-Path -LiteralPath $transcriptRoot -PathType Container)) { throw 'BLOCKED: Step 0 transcript root is missing before evidence transition' }
$transcriptInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
if ($transcriptInfo -isnot [IO.DirectoryInfo] -or ($transcriptInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or @($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -ne 0 -or @($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] }).Count -ne 26) { throw 'BLOCKED: Step 0 transcript topology is unsafe before evidence transition' }
$diagnosticPrefix=$script:PlanEDiagnosticPrefix
$allowedDiagnosticRelativeLeaves=$script:PlanEDiagnosticRelativePaths
$diagnosticRoot='.superpowers/sdd/2026-07-18-hardening-e-extension-data'
$actualDiagnosticRelativeLeaves=@()
if (Test-Path -LiteralPath $diagnosticRoot) {
    $diagnosticInfo=Get-Item -LiteralPath $diagnosticRoot -Force
    $diagnosticEntries=@(Get-ChildItem -LiteralPath $diagnosticRoot -Force -Recurse)
    if ($diagnosticInfo -isnot [IO.DirectoryInfo] -or ($diagnosticInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or @($diagnosticEntries | Where-Object { $_ -isnot [IO.FileInfo] -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -ne 0) { throw 'BLOCKED: diagnostic recovery topology is unsafe before evidence transition' }
    $actualDiagnosticRelativeLeaves=@($diagnosticEntries | ForEach-Object { [IO.Path]::GetRelativePath((Join-Path (Get-Location) $diagnosticRoot),$_.FullName).Replace('\','/') } | Sort-Object)
    $extraDiagnosticLeaves=@($actualDiagnosticRelativeLeaves | Where-Object { $allowedDiagnosticRelativeLeaves -cnotcontains $_ })
    if ($extraDiagnosticLeaves.Count -ne 0) { throw "BLOCKED: unexpected diagnostic recovery leaves require human inspection: $($extraDiagnosticLeaves -join ', ')" }
}
$allowedDiagnosticLeaves=@($actualDiagnosticRelativeLeaves | ForEach-Object { $diagnosticPrefix + $_ } | Sort-Object)
$allowedLocalSafetyLeaves=@()
$baseEvidencePath='.superpowers/sdd/plan-e-base.txt'
if (Test-Path -LiteralPath $baseEvidencePath) {
    $expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes('0dbb4852931b50153fb898b03129ae0092c46404' + "`n")
    if ([Convert]::ToHexString([IO.File]::ReadAllBytes($baseEvidencePath)) -cne [Convert]::ToHexString($expectedBaseBytes)) { throw 'BLOCKED: local Plan E base evidence bytes changed' }
    $allowedLocalSafetyLeaves=@($baseEvidencePath)
}
$ignoredPaths=Assert-PlanEIgnoredTopology -Context 'pre-evidence transition' -ExpectedStep0Artifacts $expectedStep0Leaves -CurrentRunArtifacts @() -RequireSurvivingReports $true
$recoveryPath=$diagnosticPrefix + 'task-report-recovery.md'
if ($ignoredPaths -ccontains $recoveryPath -and (Get-FileHash -Algorithm SHA256 -LiteralPath $recoveryPath).Hash.ToLowerInvariant() -cne '0c2905ea665ee190cd9725c63385e402dcdf490e71154097b2285fd674d1266f') { throw 'BLOCKED: diagnostic recovery record hash mismatch before evidence transition' }
$currentHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $currentHead.Count -ne 1) { throw 'BLOCKED: could not resolve reviewed product head' }
$currentHead=$currentHead[0].Trim()
$postPlan=@(& git rev-list --reverse "$script:PlanEPlanCommit..$currentHead")
if ($postPlan.Count -lt 2) { throw 'BLOCKED: missing promotion chronology at evidence transition' }
$redCommit=$postPlan[0];$implementationCommit=$postPlan[1]
if ((@(& git rev-parse "$redCommit^")[0].Trim()) -cne $script:PlanEPlanCommit -or (@(& git show -s --format=%s $redCommit)[0]) -cne 'test(update): cover locked preparing promotion' -or (@(& git rev-parse "$implementationCommit^")[0].Trim()) -cne $redCommit -or (@(& git show -s --format=%s $implementationCommit)[0]) -cne 'fix(update): retry locked preparing promotion') { throw 'BLOCKED: promotion chronology changed before evidence transition' }
$script:PlanEReviewedHead=$currentHead
$script:PlanEStep0ArtifactHashes=[ordered]@{}
foreach ($path in $script:PlanEStep0Artifacts) { if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "BLOCKED: Step 0 artifact missing before transition: $path" };$script:PlanEStep0ArtifactHashes[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant() }
if ($script:PlanEStep0ArtifactHashes.Count -ne 40) { throw 'BLOCKED: Step 0 artifact hash inventory mismatch' }
if (@($script:PlanEStep0Temporaries | Where-Object { (Test-Path -LiteralPath $_) -and [IO.Path]::GetFullPath($_) -cne [IO.Path]::GetFullPath($script:PlanEStep0TempRoot) }).Count -ne 0 -or (Test-Path -LiteralPath $script:PlanELeaseTransitionPath)) { throw 'BLOCKED: Step 0 temporary remains before evidence transition' }
$step0TempRootInfo=Get-Item -LiteralPath $script:PlanEStep0TempRoot -Force
if ($step0TempRootInfo -isnot [IO.DirectoryInfo] -or ($step0TempRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or @(Get-ChildItem -LiteralPath $script:PlanEStep0TempRoot -Force).Count -ne 0) { throw 'BLOCKED: Step 0 temporary root is unsafe or nonempty before evidence transition' }
$currentIgnoredPaths=Assert-PlanEIgnoredTopology -Context 'evidence transition' -ExpectedStep0Artifacts $script:PlanEStep0Artifacts -CurrentRunArtifacts @() -RequireSurvivingReports $true
$script:PlanERunPhase='evidence'
$lease=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys @('allowed_relative_paths','audit_temporaries','canonical_repository','lease_token','lease_transition_temporary','mutable_artifacts','mutation_source_paths','mutation_worktrees','phase','pid','process_creation_utc_ticks','reviewed_head','run_start_head','schema_version','step0_artifact_sha256','step0_artifacts','step0_temporaries','temporary_owner_record','temporary_root','worktree_owner_records')
$lease.phase='evidence';$lease.reviewed_head=$script:PlanEReviewedHead;$lease.step0_artifact_sha256=$script:PlanEStep0ArtifactHashes
$transitionBytes=[byte[]](ConvertTo-PlanEBootstrapCanonicalBytes -Value $lease)
Write-PlanERegisteredExclusiveBytes -Path $script:PlanELeaseTransitionPath -Bytes $transitionBytes -ExpectedPhase 'step0' -OwnerPhase 'step0'
Move-PlanERegisteredPath -Source $script:PlanELeaseTransitionPath -Destination $script:PlanELeasePath -ExpectedPhase 'step0' -OwnerPhase 'step0' -Replace
Assert-PlanERunLease -ExpectedPhase 'evidence'
$owner=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
$owner.phase='evidence';$owner.reviewed_head=$script:PlanEReviewedHead
$ownerTransition=Join-Path $script:PlanETempRoot "owner.$script:PlanEToken.transition.tmp"
$ownerBytes=[byte[]](ConvertTo-PlanEBootstrapCanonicalBytes -Value $owner)
Write-PlanERegisteredExclusiveBytes -Path $ownerTransition -Bytes $ownerBytes -ExpectedPhase 'evidence' -OwnerPhase 'step0'
Move-PlanERegisteredPath -Source $ownerTransition -Destination $script:PlanETempOwnerPath -ExpectedPhase 'evidence' -OwnerPhase 'step0' -Replace
Assert-PlanERunLease -ExpectedPhase 'evidence'
$evidenceOwnerCheck=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
if ($evidenceOwnerCheck.schema_version -isnot [long] -or $evidenceOwnerCheck.schema_version -ne 1 -or -not (Test-PlanEStringFields -Value $evidenceOwnerCheck -Keys @('canonical_repository','lease_token','phase','primary_branch','reviewed_head','run_start_head','temporary_root')) -or $evidenceOwnerCheck.phase -cne 'evidence' -or $evidenceOwnerCheck.lease_token -cne $script:PlanEToken -or $evidenceOwnerCheck.canonical_repository -cne $script:PlanECanonicalRepository -or $evidenceOwnerCheck.primary_branch -cne $script:PlanEPrimaryBranch -or $evidenceOwnerCheck.run_start_head -cne $script:PlanERunStartHead -or $evidenceOwnerCheck.reviewed_head -cne $script:PlanEReviewedHead -or $evidenceOwnerCheck.temporary_root -cne $script:PlanETempRoot -or -not (Test-PlanEExactStringArray -Actual $evidenceOwnerCheck.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or -not (Test-PlanEExactStringArray -Actual $evidenceOwnerCheck.external_temporaries -Expected $script:PlanEExternalTemporaries)) { throw 'BLOCKED: evidence temporary-owner durable reread mismatch' }
$preexistingMutable=@($script:PlanEMutableArtifacts | Where-Object { Test-Path -LiteralPath $_ })
if ($preexistingMutable.Count -ne 0) { throw "BLOCKED: pre-existing mutable artifacts require operator inspection: $($preexistingMutable -join ', ')" }
$script:PlanEPrimaryStatusBaseline=@(& git status --porcelain=v1 --untracked-files=all)
$script:PlanECurrentRunArtifacts=[ordered]@{}
$script:PlanECurrentRunArtifactsFrozen=$false
$script:PlanEAuthorizedReviewFixHead=$null
function ConvertTo-PlanECanonicalJsonBytes {
    param([Parameter(Mandatory=$true)]$Value)
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    $json=$Value | ConvertTo-Json -Depth 40 -Compress
    $canonicalizer=@'
import json,sys
def reject(value): raise ValueError('non-finite JSON number: '+value)
value=json.loads(sys.stdin.read(),parse_constant=reject)
sys.stdout.write(json.dumps(value,ensure_ascii=True,allow_nan=False,sort_keys=True,separators=(',',':')))
'@
    $canonical=@($json | & $script:PlanEPythonCommand -c $canonicalizer)
    if ($LASTEXITCODE -ne 0 -or $canonical.Count -ne 1) { throw 'Could not produce canonical sorted JSON bytes' }
    return ,([Text.UTF8Encoding]::new($false).GetBytes($canonical[0] + "`n"))
}
function Write-PlanEExclusiveCanonicalFile { param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)]$Value);Assert-PlanERunLease -ExpectedPhase 'evidence';$parent=Get-Item -LiteralPath (Split-Path -Parent ([IO.Path]::GetFullPath($Path))) -Force;if($parent-isnot[IO.DirectoryInfo]-or($parent.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Canonical write parent is unsafe: $Path"};$bytes=[byte[]](ConvertTo-PlanECanonicalJsonBytes -Value $Value);Write-PlanERegisteredExclusiveBytes -Path $Path -Bytes $bytes -ExpectedPhase 'evidence' }
function Register-PlanECurrentRunArtifacts {
    param([Parameter(Mandatory=$true)][string[]]$Paths)
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    if ($script:PlanECurrentRunArtifactsFrozen) { throw 'Cannot register artifacts after the final ownership set was frozen' }
    $unique=@($Paths | Sort-Object -Unique)
    if ($unique.Count -ne $Paths.Count -or $unique.Count -lt 1) { throw 'Current-run artifact batch is empty or duplicated' }
    $hashes=[ordered]@{}
    foreach ($Path in $unique) {
        if ($script:PlanEMutableArtifacts -cnotcontains $Path) { throw "Artifact path is outside the lease allowlist: $Path" }
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Current-run artifact is missing: $Path" }
        $tracked=@(& git ls-files -- $Path);if ($LASTEXITCODE -ne 0) { throw "Could not inspect current-run artifact tracking: $Path" }
        $staged=@(& git diff --cached --name-only --no-renames -- $Path);if ($LASTEXITCODE -ne 0) { throw "Could not inspect current-run artifact staging: $Path" }
        if ($tracked.Count -ne 0 -or $staged.Count -ne 0) { throw "Current-run artifact is tracked or staged before final commit: $Path" }
        $hashes[$Path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
        if ($script:PlanECurrentRunArtifacts.ContainsKey($Path) -and $script:PlanECurrentRunArtifacts[$Path] -cne $hashes[$Path]) { throw "Current-run artifact changed after registration: $Path" }
    }
    foreach ($Path in $unique) { $script:PlanECurrentRunArtifacts[$Path]=$hashes[$Path] }
    $null=Assert-PlanEIgnoredTopology -Context "current-run batch registration" -ExpectedStep0Artifacts $script:PlanEStep0Artifacts -CurrentRunArtifacts @($script:PlanECurrentRunArtifacts.Keys) -RequireSurvivingReports $true
}
function Register-PlanECurrentRunArtifact {
    param([Parameter(Mandatory=$true)][string]$Path)
    Register-PlanECurrentRunArtifacts -Paths @($Path)
}
function Update-PlanECurrentRunArtifact {
    param([Parameter(Mandatory=$true)][string]$Path)
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    if ($script:PlanECurrentRunArtifactsFrozen) { throw "Cannot update an artifact after the final ownership set was frozen: $Path" }
    if (-not $script:PlanECurrentRunArtifacts.ContainsKey($Path)) { throw "Cannot update an unowned current-run artifact: $Path" }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Owned current-run artifact is missing: $Path" }
    $tracked=@(& git ls-files -- $Path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect owned current-run artifact tracking: $Path" }
    $staged=@(& git diff --cached --name-only --no-renames -- $Path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect owned current-run artifact staging: $Path" }
    if ($tracked.Count -ne 0 -or $staged.Count -ne 0) { throw "Owned current-run artifact became tracked or staged: $Path" }
    $script:PlanECurrentRunArtifacts[$Path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
    $null=Assert-PlanEIgnoredTopology -Context "current-run update $Path" -ExpectedStep0Artifacts $script:PlanEStep0Artifacts -CurrentRunArtifacts @($script:PlanECurrentRunArtifacts.Keys) -RequireSurvivingReports $true
}
function Invoke-PlanEWriter {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$ArgumentList,
        [Parameter(Mandatory=$true)][string]$ExpectedWorkingDirectory
    )
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'evidence'
    if ((Get-Location).Path -cne $ExpectedWorkingDirectory) { throw 'Writer working directory mismatch' }
    $resolvedFilePath=[IO.Path]::GetFullPath($FilePath)
    if (-not @($script:PlanEGitCommand,$script:PlanENpmCommand,$script:PlanENodeCommand,$script:PlanEPythonCommand).Contains($resolvedFilePath)) { throw "Writer command is outside the fixed tool allowlist: $resolvedFilePath" }
    $record=[ordered]@{file_path=$FilePath;arguments=$ArgumentList;cwd=$ExpectedWorkingDirectory;started=$false;terminated=$false;exit_code=$null}
    $script:PlanELaunchedWriters += $record
    $startInfo=[Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName=$FilePath
    $startInfo.WorkingDirectory=$ExpectedWorkingDirectory
    $startInfo.UseShellExecute=$false
    foreach ($argument in $ArgumentList) { [void]$startInfo.ArgumentList.Add($argument) }
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$startInfo
    try {
        $writerEnvironment=Get-PlanEWriterEnvironmentOverrides -ExpectedPhase 'evidence'
        [void](Invoke-PlanEEnvironmentScope -Context 'evidence writer' -Overrides $writerEnvironment -Body {
            Assert-PlanERunLease -ExpectedPhase 'evidence'
            Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'evidence'
            if (-not $process.Start()) { throw 'Writer process did not start' }
            $record.started=$true
            $process.WaitForExit()
            $record.exit_code=$process.ExitCode
            $record.terminated=$true
        })
    } finally {
        if ($record.started -and -not $process.HasExited) { $process.WaitForExit() }
        $process.Dispose()
    }
    return [int]$record.exit_code
}
function Invoke-PlanERedirectedWriter {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$ArgumentList,
        [Parameter(Mandatory=$true)][string]$ExpectedWorkingDirectory,
        [AllowNull()][string]$StandardInput=$null
    )
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'evidence'
    if ((Get-Location).Path -cne $ExpectedWorkingDirectory) { throw 'Redirected writer working directory mismatch' }
    $resolvedFilePath=[IO.Path]::GetFullPath($FilePath)
    if (-not @($script:PlanEGitCommand,$script:PlanENpmCommand,$script:PlanENodeCommand,$script:PlanEPythonCommand).Contains($resolvedFilePath)) { throw "Redirected writer command is outside the fixed tool allowlist: $resolvedFilePath" }
    $record=[ordered]@{file_path=$FilePath;arguments=$ArgumentList;cwd=$ExpectedWorkingDirectory;started=$false;terminated=$false;exit_code=$null}
    $script:PlanELaunchedWriters += $record
    $startInfo=[Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName=$FilePath
    $startInfo.WorkingDirectory=$ExpectedWorkingDirectory
    $startInfo.UseShellExecute=$false
    $startInfo.RedirectStandardOutput=$true
    $startInfo.RedirectStandardError=$true
    $startInfo.RedirectStandardInput=$null -ne $StandardInput
    foreach ($argument in $ArgumentList) { [void]$startInfo.ArgumentList.Add($argument) }
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$startInfo
    try {
        $writerEnvironment=Get-PlanEWriterEnvironmentOverrides -ExpectedPhase 'evidence'
        return Invoke-PlanEEnvironmentScope -Context 'evidence redirected writer' -Overrides $writerEnvironment -Body {
            Assert-PlanERunLease -ExpectedPhase 'evidence'
            Assert-PlanEWriterOutputRegistrations -ArgumentList $ArgumentList -ExpectedPhase 'evidence'
            if (-not $process.Start()) { throw 'Redirected writer process did not start' }
            $record.started=$true
            $stdoutTask=$process.StandardOutput.ReadToEndAsync()
            $stderrTask=$process.StandardError.ReadToEndAsync()
            if ($null -ne $StandardInput) {
                $process.StandardInput.Write($StandardInput)
                $process.StandardInput.Close()
            }
            $process.WaitForExit()
            [Threading.Tasks.Task]::WaitAll(@($stdoutTask,$stderrTask))
            $record.exit_code=$process.ExitCode
            $record.terminated=$true
            return [ordered]@{exit_code=[int]$record.exit_code;stdout=$stdoutTask.Result;stderr=$stderrTask.Result}
        }
    } finally {
        if ($record.started -and -not $process.HasExited) { $process.WaitForExit() }
        $process.Dispose()
    }
}
Assert-PlanERunLease -ExpectedPhase 'evidence'
```
<!-- PLAN_E_RUN_OWNER_END -->

Every external Git, Node, npm, TypeScript, test, and mutation writer in
Steps 1-11 is launched through `Invoke-PlanEWriter` or
`Invoke-PlanERedirectedWriter`. Python commands that can execute product/tests
or write files use those helpers; strict Python validator/canonicalizer commands
are read-only and remain synchronous. The literal command lines in
the preserved blocks define exact argv/cwd and are not permission to launch a
second unmanaged process. Read-only Git queries and Python validators that only
read immutable evidence may use synchronous `&`; they create no file, worktree,
index, or checkout state.
Thus every writer is synchronous and foreground from the lease owner's point of
view.

Before Step 1, run this executable source audit against the committed Task 9
controller. It rejects any raw file write/move outside the unique lease/owner
bootstrap and registration-wrapper implementations, any GUID/pattern temporary,
or any direct repository-side Step 0 `.tmp` construction:

```powershell
Assert-PlanERunLease -ExpectedPhase $script:PlanERunPhase
$task9Plan=[IO.File]::ReadAllText((Join-Path $script:PlanECanonicalRepository $script:PlanEPlanPath),[Text.UTF8Encoding]::new($false))
$task9Text=$task9Plan.Substring($task9Plan.IndexOf('## Task 9:'))
$forbiddenTemporaryFragments=@(
    ('New' + 'Guid()'),
    ('step0_' + 'temporary_patterns'),
    ('<32-' + 'lowercase-hex>'),
    ('$preMapPath' + '.tmp'),
    ('$greenMapPath' + '.tmp'),
    ('$mutationMapPath' + '.tmp'),
    ('$astRecordPath' + '.tmp'),
    ('$ledgerPath' + '.tmp'),
    ('$transcriptMapPath' + '.tmp'),
    ('.txt' + '.tmp')
)
foreach ($forbidden in $forbiddenTemporaryFragments) {
    if ($task9Text.Contains($forbidden)) { throw "BLOCKED: Task 9 retains a forbidden temporary pattern: $forbidden" }
}
function Test-PlanETask9MutationAst {
    param([Parameter(Mandatory=$true)][string]$Text)
    $violations=[Collections.Generic.List[string]]::new()
    $dangerousCommands=@('Add-Content','Clear-Content','Copy-Item','Move-Item','New-Item','Out-File','Remove-Item','Rename-Item','Set-Content')
    $commandAliases=@{ac='Add-Content';clc='Clear-Content';copy='Copy-Item';cp='Copy-Item';cpi='Copy-Item';mi='Move-Item';move='Move-Item';mv='Move-Item';ni='New-Item';del='Remove-Item';erase='Remove-Item';rd='Remove-Item';ri='Remove-Item';rmdir='Remove-Item';rm='Remove-Item';ren='Rename-Item';rni='Rename-Item';sc='Set-Content'}
    $approvedDynamicCommands=@(
        '<top-level>|Ampersand|(Join-Path $script:PlanECanonicalRepository ''host\venv\Scripts\python.exe'')|-|validate|".superpowers/sdd/task-$task-audit-evidence.json"',
        '<top-level>|Dot|$executor','<top-level>|Dot|$runner','<top-level>|Ampersand|$staticScript',
        'ConvertTo-PlanECanonicalJsonBytes|Ampersand|$script:PlanEPythonCommand|-c|$canonicalizer',
        'Import-PromotionExecutor|Dot|$executor','Invoke-PlanEEnvironmentScope|Ampersand|$Body',
        'Test-PlanETask9EnvironmentAst|Ampersand|$getFunction|$node',
        'Test-PlanETask9EnvironmentAst|Ampersand|$insideExtent|$node|$tryAst.Body',
        'Test-PlanETask9EnvironmentAst|Ampersand|$insideExtent|$node|$tryAst.Finally',
        'Test-PlanETask9MutationAst|Ampersand|$getArguments|$node',
        'Test-PlanETask9MutationAst|Ampersand|$getCommandSignature|$node',
        'Test-PlanETask9MutationAst|Ampersand|$getFunctionName|$node'
    )
    $dangerousFileMembers=@('Copy','Delete','Move','Replace','WriteAllBytes','WriteAllText')
    $dangerousDirectoryMembers=@('CreateDirectory','Delete','Move')
    $getFunctionName={
        param([Management.Automation.Language.Ast]$Node)
        $parent=$Node.Parent
        while ($null -ne $parent) { if ($parent -is [Management.Automation.Language.FunctionDefinitionAst]) { return [string]$parent.Name };$parent=$parent.Parent }
        return '<top-level>'
    }
    $getCommandSignature={ param([Management.Automation.Language.CommandAst]$Node) return (@($Node.CommandElements | ForEach-Object { $_.Extent.Text }) -join '|') }
    $getArguments={ param([Management.Automation.Language.InvokeMemberExpressionAst]$Node) return @($Node.Arguments | ForEach-Object { $_.Extent.Text }) }
    $fences=[regex]::Matches($Text,'(?ms)^```powershell\r?\n(.*?)\r?\n```')
    foreach ($fence in $fences) {
        $fenceText=$fence.Groups[1].Value
        $tokens=$null;$errors=$null
        $ast=[Management.Automation.Language.Parser]::ParseInput($fenceText,[ref]$tokens,[ref]$errors)
        if ($errors.Count -ne 0) { $violations.Add('<powershell-parse-error>'); continue }
        $bootstrapStart=$fenceText.IndexOf('# PLAN_E_BOOTSTRAP_MUTATIONS_START')
        $bootstrapEnd=$fenceText.IndexOf('# PLAN_E_BOOTSTRAP_MUTATIONS_END')
        foreach ($node in $ast.FindAll({ param($item) $item -is [Management.Automation.Language.CommandAst] -or $item -is [Management.Automation.Language.InvokeMemberExpressionAst] -or $item -is [Management.Automation.Language.FileRedirectionAst] },$true)) {
            $source=$node.Extent.Text
            $functionName=& $getFunctionName $node
            if ($node -is [Management.Automation.Language.FileRedirectionAst]) {
                if ($node.Location.Extent.Text -cne '$null') { $violations.Add($source) }
                continue
            }
            if ($node -is [Management.Automation.Language.CommandAst]) {
                $sourceCommand=$node.GetCommandName()
                if ([string]::IsNullOrWhiteSpace($sourceCommand)) {
                    $dynamicKey=$functionName + '|' + [string]$node.InvocationOperator + '|' + (& $getCommandSignature $node)
                    if ($approvedDynamicCommands -cnotcontains $dynamicKey) { $violations.Add($source) }
                    continue
                }
                $sourceCommand=$sourceCommand.Substring($sourceCommand.LastIndexOf('\') + 1)
                $command=@($dangerousCommands | Where-Object { $_ -ieq $sourceCommand })[0]
                if ($null -eq $command -and $commandAliases.ContainsKey($sourceCommand.ToLowerInvariant())) { $command=$commandAliases[$sourceCommand.ToLowerInvariant()] }
                if ($null -eq $command) { continue }
                $signature=& $getCommandSignature $node
                $approved=$false
                if ($command -ceq 'New-Item') {
                    if ($functionName -ceq 'New-PlanERegisteredDirectory' -and $signature -cin @('New-Item|-ItemType|Directory|-Path|$full','New-Item|-ItemType|Directory|-Path|$full|-Force')) { $approved=$true }
                    $inBootstrap=$functionName -ceq '<top-level>' -and $bootstrapStart -ge 0 -and $bootstrapEnd -gt $bootstrapStart -and $node.Extent.StartOffset -gt $bootstrapStart -and $node.Extent.EndOffset -lt $bootstrapEnd
                    if ($inBootstrap -and $signature -cin @('New-Item|-ItemType|Directory|-Path|$script:PlanETempParent','New-Item|-ItemType|Directory|-Path|$script:PlanETempRoot')) { $approved=$true }
                } elseif ($command -ceq 'Remove-Item') {
                    if ($functionName -ceq 'Remove-PlanERegisteredPath' -and $signature -ceq 'Remove-Item|-LiteralPath|$full|-Force|-Recurse:$Recurse') { $approved=$true }
                    if ($functionName -ceq 'Remove-PlanEValidatedCleanupPath' -and $signature -ceq 'Remove-Item|-LiteralPath|$full|-Force|-Recurse:$Recurse') { $approved=$true }
                    if ($functionName -ceq 'Invoke-PlanEEnvironmentScope' -and $signature -ceq 'Remove-Item|-LiteralPath|$envPath|-Force|-ErrorAction|Stop') { $approved=$true }
                }
                if (-not $approved) { $violations.Add($source) }
            } else {
                $receiver=$node.Expression.Extent.Text
                if ($node.Static -and $node.Member -isnot [Management.Automation.Language.StringConstantExpressionAst]) { $violations.Add($source);continue }
                $member=[string]$node.Member.Value
                $receiverType=if ($node.Expression -is [Management.Automation.Language.TypeExpressionAst]) { $node.Expression.TypeName.FullName } else { '' }
                $dangerousMember=$dangerousFileMembers -icontains $member -or $dangerousDirectoryMembers -icontains $member -or $member -ieq 'new'
                $dangerous=($node.Static -and $dangerousMember -and (($receiverType -imatch '^(?:System\.)?IO\.(?:File|Directory|FileStream)$') -or $node.Expression -isnot [Management.Automation.Language.TypeExpressionAst])) -or ($receiverType -imatch '^(?:System\.)?Environment$' -and $member -ieq 'SetEnvironmentVariable')
                if (-not $dangerous) { continue }
                $args=& $getArguments $node
                $approved=$false
                if ($receiver -ceq '[IO.File]' -and $member -ceq 'WriteAllText' -and $functionName -ceq 'Set-PlanERegisteredText' -and ($args -join '|') -ceq '$full|$Text|[Text.UTF8Encoding]::new($false)') { $approved=$true }
                if ($receiver -ceq '[IO.File]' -and $member -ceq 'WriteAllBytes' -and $functionName -ceq 'Set-PlanERegisteredBytes' -and ($args -join '|') -ceq '$full|$Bytes') { $approved=$true }
                if ($receiver -ceq '[IO.File]' -and $member -ceq 'Move' -and $functionName -ceq 'Move-PlanERegisteredPath' -and ($args -join '|') -ceq '$sourceFull|$destinationFull|$Replace.IsPresent') { $approved=$true }
                if ($receiver -ceq '[IO.FileStream]' -and $member -ceq 'new' -and $functionName -ceq 'Write-PlanERegisteredExclusiveBytes' -and ($args -join '|') -ceq '$full|[IO.FileMode]::CreateNew|[IO.FileAccess]::Write|[IO.FileShare]::None') { $approved=$true }
                $inBootstrap=$functionName -ceq '<top-level>' -and $bootstrapStart -ge 0 -and $bootstrapEnd -gt $bootstrapStart -and $node.Extent.StartOffset -gt $bootstrapStart -and $node.Extent.EndOffset -lt $bootstrapEnd
                if ($receiver -ceq '[IO.FileStream]' -and $member -ceq 'new' -and $inBootstrap -and $args.Count -eq 4 -and $args[0] -cin @('$script:PlanELeasePath','$script:PlanETempOwnerPath') -and ($args[1..3] -join '|') -ceq '[IO.FileMode]::CreateNew|[IO.FileAccess]::Write|[IO.FileShare]::None') { $approved=$true }
                if ($receiver -ceq '[Environment]' -and $member -ceq 'SetEnvironmentVariable' -and $functionName -ceq 'Invoke-PlanEEnvironmentScope' -and ($args -join '|') -cin @('$safeName|[string]$Overrides[$name]|''Process''','$name|[string]$saved[$name].value|''Process''')) { $approved=$true }
                if (-not $approved) { $violations.Add($source) }
            }
        }
    }
    return @($violations)
}
$sourceAuditViolations=@(Test-PlanETask9MutationAst -Text $task9Text)
if ($sourceAuditViolations.Count -ne 0) { throw "BLOCKED: Task 9 filesystem mutation bypasses registration: $($sourceAuditViolations -join ' | ')" }
$sourceAuditFenceOpen=('```' + 'powershell')
$sourceAuditFenceClose='```'
$sourceAuditSelfText=$sourceAuditFenceOpen + "`n" + '$literal=''New-Item -ItemType Directory -Path unsafe-self-text'' # [IO.File]::Delete($full)' + "`n# Set-Content unsafe-comment`n" + $sourceAuditFenceClose
if (@(Test-PlanETask9MutationAst -Text $sourceAuditSelfText).Count -ne 0) { throw 'BLOCKED: Task 9 source audit matches its own literal/reference text' }
$unsafeDirectoryText=$sourceAuditFenceOpen + "`nNew-Item -ItemType Directory -Path unsafe-injected`n" + $sourceAuditFenceClose
$unsafeDeleteText=$sourceAuditFenceOpen + "`nRemove-Item -LiteralPath unsafe-injected -Force`n" + $sourceAuditFenceClose
$sourceAuditBypasses=@(
    $unsafeDirectoryText,
    $unsafeDeleteText,
    ($sourceAuditFenceOpen + "`nNew-Item -ItemType Directory -Path `$evilPlanETempRoot`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nRemove-Item -LiteralPath 'C:\unsafe\Env:trap' -Force`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n[IO.File]::WriteAllText(`$full,'unsafe')`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nSet-Content -LiteralPath unsafe -Value x`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nCopy-Item source target`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nMove-Item source target`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n[IO.File]::Delete(`$full)`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nnew-item -ItemType Directory -Path unsafe`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nni -ItemType Directory -Path unsafe`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`nMicrosoft.PowerShell.Management\New-Item -ItemType Directory -Path unsafe`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n[System.IO.File]::Delete(`$full)`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n[IO.File]::delete(`$full)`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n`$fileType=[IO.File]; `$fileType::Delete(`$full)`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n`$command='New-Item'; & `$command -ItemType Directory -Path unsafe`n" + $sourceAuditFenceClose),
    ($sourceAuditFenceOpen + "`n`$fileType=[IO.File]; `$member='Delete'; `$fileType::`$member(`$full)`n" + $sourceAuditFenceClose)
)
foreach ($bypass in $sourceAuditBypasses) { if (@(Test-PlanETask9MutationAst -Text $bypass).Count -ne 1) { throw 'BLOCKED: Task 9 source audit missed or overcounted an injected unsafe command' } }
function Test-PlanETask9EnvironmentAst {
    param([Parameter(Mandatory=$true)][string]$Text)
    $violations=[Collections.Generic.List[string]]::new()
    $getFunction={ param([Management.Automation.Language.Ast]$Node) $parent=$Node.Parent;while ($null -ne $parent) { if ($parent -is [Management.Automation.Language.FunctionDefinitionAst]) { return $parent };$parent=$parent.Parent };return $null }
    $insideExtent={ param([Management.Automation.Language.Ast]$Node,[Management.Automation.Language.Ast]$Container) return $null -ne $Container -and $Node.Extent.StartOffset -ge $Container.Extent.StartOffset -and $Node.Extent.EndOffset -le $Container.Extent.EndOffset }
    foreach ($fence in [regex]::Matches($Text,'(?ms)^```powershell\r?\n(.*?)\r?\n```')) {
        $tokens=$null;$errors=$null
        $ast=[Management.Automation.Language.Parser]::ParseInput($fence.Groups[1].Value,[ref]$tokens,[ref]$errors)
        if ($errors.Count -ne 0) { $violations.Add('<powershell-parse-error>'); continue }
        foreach ($node in $ast.FindAll({ param($item) $item -is [Management.Automation.Language.InvokeMemberExpressionAst] -or $item -is [Management.Automation.Language.CommandAst] -or $item -is [Management.Automation.Language.AssignmentStatementAst] -or $item -is [Management.Automation.Language.ForEachStatementAst] -or $item -is [Management.Automation.Language.UnaryExpressionAst] },$true)) {
            if ($node -is [Management.Automation.Language.AssignmentStatementAst]) {
                $environmentTarget=$node.Left.Find({ param($item) $item -is [Management.Automation.Language.VariableExpressionAst] -and $item.VariablePath.DriveName -ieq 'env' },$true)
                if ($null -ne $environmentTarget) { $violations.Add($node.Extent.Text) }
                continue
            }
            if ($node -is [Management.Automation.Language.ForEachStatementAst]) {
                if ($node.Variable.VariablePath.DriveName -ieq 'env') { $violations.Add($node.Extent.Text) }
                continue
            }
            if ($node -is [Management.Automation.Language.UnaryExpressionAst]) {
                $environmentTarget=$node.Child.Find({ param($item) $item -is [Management.Automation.Language.VariableExpressionAst] -and $item.VariablePath.DriveName -ieq 'env' },$true)
                if ($null -ne $environmentTarget -and [string]$node.TokenKind -iin @('MinusMinus','PlusPlus','PostfixMinusMinus','PostfixPlusPlus')) { $violations.Add($node.Extent.Text) }
                continue
            }
            if ($node -is [Management.Automation.Language.InvokeMemberExpressionAst]) {
                if ($node.Member -isnot [Management.Automation.Language.StringConstantExpressionAst] -or [string]$node.Member.Value -ine 'SetEnvironmentVariable') { continue }
            } else {
                $command=$node.GetCommandName()
                if ([string]::IsNullOrWhiteSpace($command)) { continue }
                $command=$command.Substring($command.LastIndexOf('\') + 1)
                if ($command -inotmatch '^(?:Add-Content|Clear-Content|Clear-Item|Copy-Item|Move-Item|New-Item|Out-File|Remove-Item|Rename-Item|Set-Content|Set-Item|ac|clc|cli|copy|cp|cpi|del|erase|mi|move|mv|ni|rd|ren|ri|rmdir|rni|rm|sc|si)$') { continue }
                $pipeline=if ($node.Parent -is [Management.Automation.Language.PipelineAst]) { $node.Parent } else { $node }
                $environmentTargets=@($pipeline.FindAll({ param($item) ($item -is [Management.Automation.Language.VariableExpressionAst] -and $item.VariablePath.UserPath -ceq 'envPath') -or (($item -is [Management.Automation.Language.StringConstantExpressionAst] -or $item -is [Management.Automation.Language.ExpandableStringExpressionAst]) -and [string]$item.Value -imatch '^Env:') },$true))
                if ($environmentTargets.Count -eq 0) { continue }
            }
            $function=& $getFunction $node
            if ($null -eq $function -or $function.Name -cne 'Invoke-PlanEEnvironmentScope') { $violations.Add($node.Extent.Text);continue }
            $tryStatements=@($function.Body.EndBlock.Statements | Where-Object { $_ -is [Management.Automation.Language.TryStatementAst] -and $null -ne $_.Finally })
            if ($tryStatements.Count -ne 1) { $violations.Add($node.Extent.Text);continue }
            $tryAst=$tryStatements[0]
            if ($node -is [Management.Automation.Language.InvokeMemberExpressionAst]) {
                $args=@($node.Arguments | ForEach-Object { $_.Extent.Text })
                $signature=$args -join '|'
                $exactMember=$node.Expression.Extent.Text -ceq '[Environment]' -and $node.Member -is [Management.Automation.Language.StringConstantExpressionAst] -and [string]$node.Member.Value -ceq 'SetEnvironmentVariable'
                $overrideSignature=$exactMember -and $signature -ceq '$safeName|[string]$Overrides[$name]|''Process''' -and (& $insideExtent $node $tryAst.Body)
                $restoreSignature=$exactMember -and $signature -ceq '$name|[string]$saved[$name].value|''Process''' -and (& $insideExtent $node $tryAst.Finally)
                if (-not $overrideSignature -and -not $restoreSignature) { $violations.Add($node.Extent.Text) }
            } else {
                $signature=@($node.CommandElements | ForEach-Object { $_.Extent.Text }) -join '|'
                $approved=$signature -ceq 'Remove-Item|-LiteralPath|$envPath|-Force|-ErrorAction|Stop' -and ((& $insideExtent $node $tryAst.Body) -or (& $insideExtent $node $tryAst.Finally))
                if (-not $approved) { $violations.Add($node.Extent.Text) }
            }
        }
    }
    return @($violations)
}
$environmentAuditViolations=@(Test-PlanETask9EnvironmentAst -Text $task9Text)
if ($environmentAuditViolations.Count -ne 0) { throw "BLOCKED: Task 9 environment assignment lacks outer finally: $($environmentAuditViolations -join ' | ')" }
$safeEnvironmentText=$sourceAuditFenceOpen + "`nfunction Invoke-PlanEEnvironmentScope { try { [Environment]::SetEnvironmentVariable(`$safeName,[string]`$Overrides[`$name],'Process') } finally { Remove-Item -LiteralPath `$envPath -Force -ErrorAction Stop; [Environment]::SetEnvironmentVariable(`$name,[string]`$saved[`$name].value,'Process') } }`n" + $sourceAuditFenceClose
$unsafeEnvironmentText=$sourceAuditFenceOpen + "`n[Environment]::SetEnvironmentVariable('DH_UNSAFE','x','Process')`nRemove-Item -LiteralPath 'Env:DH_UNSAFE'`n" + $sourceAuditFenceClose
$misplacedEnvironmentText=$sourceAuditFenceOpen + "`nfunction Invoke-PlanEEnvironmentScope { Remove-Item -LiteralPath `$envPath -Force -ErrorAction Stop; try { } finally { } }`n" + $sourceAuditFenceClose
$unsafeEnvironmentAssignmentText=$sourceAuditFenceOpen + "`n`$env:DH_UNSAFE='x'`n" + $sourceAuditFenceClose
$unsafeEnvironmentForeachText=$sourceAuditFenceOpen + "`nforeach (`$env:DH_UNSAFE in @('x')) { }`n" + $sourceAuditFenceClose
$unsafeEnvironmentProviderText=$sourceAuditFenceOpen + "`nSet-Item -LiteralPath 'env:DH_UNSAFE' -Value x`n" + $sourceAuditFenceClose
$unsafeEnvironmentPipelineText=$sourceAuditFenceOpen + "`n'Env:DH_UNSAFE' | Remove-Item -Force`n" + $sourceAuditFenceClose
$unsafeEnvironmentReceiverText=$sourceAuditFenceOpen + "`nfunction Invoke-PlanEEnvironmentScope { try { [System.Environment]::SetEnvironmentVariable(`$safeName,[string]`$Overrides[`$name],'Process') } finally { } }`n" + $sourceAuditFenceClose
$unsafeEnvironmentVariableReceiverText=$sourceAuditFenceOpen + "`n`$environmentType=[Environment]; `$environmentType::SetEnvironmentVariable('DH_UNSAFE','x','Process')`n" + $sourceAuditFenceClose
if (@(Test-PlanETask9EnvironmentAst -Text $safeEnvironmentText).Count -ne 0 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentText).Count -ne 2 -or @(Test-PlanETask9EnvironmentAst -Text $misplacedEnvironmentText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentAssignmentText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentForeachText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentProviderText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentPipelineText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentReceiverText).Count -ne 1 -or @(Test-PlanETask9EnvironmentAst -Text $unsafeEnvironmentVariableReceiverText).Count -ne 1) { throw 'BLOCKED: Task 9 environment source-audit self-test failed' }
$pythonPromotionSites=[regex]::Matches($task9Text,'temp\.write_text\(|os\.replace\(temp,target\)').Count
if ($pythonPromotionSites -ne 4) { throw "BLOCKED: Task 9 Python canonical-promotion site count mismatch: $pythonPromotionSites" }
$requiredPythonRegistration=@('Assert-PlanERegisteredMutationPath -Path $focusedTemp','Assert-PlanERegisteredMutationPath -Path $focusedResult','Assert-PlanERegisteredMutationPath -Path $fullTemp','Assert-PlanERegisteredMutationPath -Path $fullResult')
if (@($requiredPythonRegistration | Where-Object { -not $task9Text.Contains($_) }).Count -ne 0) { throw 'BLOCKED: Task 9 Python canonical-promotion registration is incomplete' }
$requiredRegistrationTokens=@('function Assert-PlanERegisteredMutationPath','function Assert-PlanEWriterOutputRegistrations','Write-PlanERegisteredExclusiveText -Path $executor','Write-PlanERegisteredExclusiveText -Path $runner','mutation_source_paths','external_temporaries','step0-temporaries')
$missingRegistrationTokens=@($requiredRegistrationTokens | Where-Object { -not $task9Text.Contains($_) })
if ($missingRegistrationTokens.Count -ne 0) { throw "BLOCKED: Task 9 registration contract is incomplete: $($missingRegistrationTokens -join ', ')" }
```

Where a preserved block captures stdout/stderr to validate test titles or create
canonical evidence, invoke the same argv through
`Invoke-PlanERedirectedWriter`, which begins both asynchronous stream reads
before waiting and consumes them only after process termination; never trade
output validation for the short helper's nonredirected form.
Step 0 uses the equivalent `Invoke-PlanEStep0Writer` and
`Invoke-PlanEStep0RedirectedWriter` boundaries while the lease phase is
`step0`; evidence phases use the non-Step0 pair.
All Step 0 and evidence writer helpers record command identity before launch,
retain the `Diagnostics.Process` handle, wait for termination, and dispose the
handle. They keep `UseShellExecute=false`, add every exact argument through
`ProcessStartInfo.ArgumentList`, and never delegates argv quoting to a shell.
The redirected-output branch sets both redirect flags before start.
The controller never uses a job, detached flag, or unawaited/background writer.
Cleanup first requires every `PlanELaunchedWriters` record to have
`started=true`, `terminated=true`, and a non-null integer `exit_code`. A controller crash intentionally leaves the lease,
token root, owner records, and any Git worktree registration. A later run reports
their exact paths and stops; it never adopts, resets, deletes, prunes, force
removes, or treats a dead PID as permission to clean. Human-authorized inspection
and recovery are outside this executor.
Defining or running a stale-run recovery tool is out of scope.
Even when a lease-recorded PID appears dead, the later run stops and reports the
lease/temp/worktree/owner paths without touching them.
There is deliberately no scripted stale-resource cleanup path anywhere in this
plan.

Task 9 executor adaptation rule: every later executable writer line is an exact
argv/cwd specification. Route it through the retained-handle foreground launcher
or its redirected-output branch instead of executing the displayed `&` a second
time. This mechanical substitution changes no command, expected exit, output
parser, TDD ordering, or artifact bytes.

Only the unavoidable token-bearing lease-transition and same-directory audit
atomic-promotion temporaries are outside `PlanETempRoot`, and both exact sets are
closed in the lease and owner before creation. Every other `.tmp`, test environment, captured output,
recheck diff, and worktree path shown below is mechanically rebased under the
locked token root and must match its owner allowlist before use or cleanup.

- [ ] **Step 1: Start from a clean committed product head and inspect scope**

For the mandatory rerun after any controller review fix, create and validate the
focused review-fix commit while the current owner still holds the mutex and
`evidence` lease. Its subject must be `test(review): ...`, `fix(review): ...`, or
`docs(review): ...`; its paths are limited to the existing Plan E integration
inventory excluding all planning specs/plan and the two promotion Host paths.
Only after the commit passes the closed ancestry/subject/path gate below may the
owner perform the review-fix release and start a wholly new `evidence`-phase run.
A fresh lease requires every mutable path absent, so this reset block applies only within the same live run to paths already
registered in `PlanECurrentRunArtifacts`; it never cleans a prior/crashed run.
Remove only the known mutable current-run outputs below. Never remove or
overwrite promotion
RED/GREEN/mutation transcripts, their phase maps/source records, the pre-commit
AST record, six accepted surviving Task reports, or any other chronology
evidence. A
tracked or staged mutable path is a hard stop rather than a deletion target.
`PlanEMutableArtifacts` is the generic reset allowlist. It never contains the
lease, token root, audit promotion temporaries, worktree paths, or owner records,
and it refuses any existing file without matching current-token registration and
hash.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$mutableCurrentRunArtifacts=@(
    '.superpowers/sdd/focused-extension-results.json',
    '.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json',
    '.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/final-artifacts.sha256.json',
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/plan-e-extension-hardening-report.md',
    '.superpowers/sdd/task-6-audit-evidence.json',
    '.superpowers/sdd/task-7-audit-evidence.json'
)
$immutableChronology=@(
    '.superpowers/sdd/promotion-red-source.sha256',
    '.superpowers/sdd/promotion-green-source.sha256',
    '.superpowers/sdd/promotion-mutation-source.sha256',
    '.superpowers/sdd/promotion-red.sha256.json',
    '.superpowers/sdd/promotion-green.sha256.json',
    '.superpowers/sdd/promotion-mutation.sha256.json',
    '.superpowers/sdd/promotion-transcripts.sha256.json',
    '.superpowers/sdd/promotion-ast.sha256'
)
if (@($mutableCurrentRunArtifacts | Where-Object { $immutableChronology -ccontains $_ }).Count -ne 0) {
    throw 'Mutable reset list contains immutable chronology evidence'
}
if ((@($mutableCurrentRunArtifacts | Sort-Object) -join "`n") -cne (@($script:PlanEMutableArtifacts | Sort-Object) -join "`n")) { throw 'Mutable reset inventory differs from the closed lease allowlist' }
$forbiddenGenericReset=@(
    $script:PlanELeasePath,
    $script:PlanETempRoot,
    $script:PlanETempOwnerPath
) + $script:PlanEAuditTemporaries + @(
    (Join-Path $script:PlanETempRoot 'worktrees\promotion-red-replay'),
    (Join-Path $script:PlanETempRoot 'worktrees\task-6-accessor'),
    (Join-Path $script:PlanETempRoot 'worktrees\task-6-busy'),
    (Join-Path $script:PlanETempRoot 'worktrees\task-7-explicit-empty'),
    (Join-Path $script:PlanETempRoot 'worktree-owners\promotion-red-replay.json'),
    (Join-Path $script:PlanETempRoot 'worktree-owners\task-6-accessor.json'),
    (Join-Path $script:PlanETempRoot 'worktree-owners\task-6-busy.json'),
    (Join-Path $script:PlanETempRoot 'worktree-owners\task-7-explicit-empty.json')
)
if (@($mutableCurrentRunArtifacts | Where-Object { $forbiddenGenericReset -ccontains $_ }).Count -ne 0) {
    throw 'Mutable reset list contains lease-owned infrastructure'
}
foreach ($path in $mutableCurrentRunArtifacts) {
    $tracked=@(& git ls-files -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect mutable artifact tracking: $path" }
    $staged=@(& git diff --cached --name-only --no-renames -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect mutable artifact staging: $path" }
    if ($tracked.Count -ne 0 -or $staged.Count -ne 0) {
        throw "Refusing to reset tracked or staged current-run artifact: $path"
    }
    if (Test-Path -LiteralPath $path) {
        if (-not $script:PlanECurrentRunArtifacts.ContainsKey($path)) { throw "BLOCKED: existing mutable artifact has no current-token owner: $path" }
        $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
        if ($hash -cne $script:PlanECurrentRunArtifacts[$path]) { throw "BLOCKED: current-token mutable artifact hash mismatch: $path" }
        Remove-PlanERegisteredPath -Path $path -ExpectedPhase 'evidence'
        [void]$script:PlanECurrentRunArtifacts.Remove($path)
    }
}
$legacyTemporaries=@(
    '.superpowers/sdd/focused-extension-results.raw.tmp',
    '.superpowers/sdd/focused-extension-results.canonical.tmp',
    '.superpowers/sdd/full-extension-results.raw.tmp',
    '.superpowers/sdd/full-extension-results.canonical.tmp',
    '.superpowers/sdd/host-test-results.tmp',
    '.superpowers/sdd/promotion-observed.tmp',
    '.superpowers/sdd/reviewed-head-verification.tmp',
    '.superpowers/sdd/final-artifacts.sha256.tmp',
    '.superpowers/sdd/plan-e-only-review-package.tmp',
    '.superpowers/sdd/plan-e-only-review.diff.tmp',
    '.superpowers/sdd/original-whole-branch-interim-review-package.tmp',
    '.superpowers/sdd/original-whole-branch-interim-review.diff.tmp'
)
$staleLegacy=@($legacyTemporaries | Where-Object { Test-Path -LiteralPath $_ })
if ($staleLegacy.Count -ne 0) {
    throw "BLOCKED: stale pre-amendment temporaries require human inspection: $($staleLegacy -join ', ')"
}
```

Every suite block resolves its own literal reviewed head and repeats the tested
source check below before starting. The tested-source roots are the complete
tracked `extension`, `host`, and `tests` trees, this plan's committed verification
program, `.gitignore`, and root release/installer
dependencies `release_helper.py`, `dev_switch.py`, `installer_core.ps1`,
`dyhelper_installer.ps1`, and `install.bat`. The
HEAD tree inventory and current tracked inventory must be byte-for-byte equal,
and no tracked path under those roots may be staged, modified, deleted, or
unmerged. This is deliberately global to product/test dependencies rather than
limited to the 61 Plan E reviewed-product range paths.

Run:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$status=@(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E status' }
git log --oneline -12
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E commits' }
$declaredBase='0dbb4852931b50153fb898b03129ae0092c46404'
$integrationBase=$declaredBase
git cat-file -e "$integrationBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Plan E base is not a commit' }
git merge-base --is-ancestor $integrationBase HEAD
if ($LASTEXITCODE -ne 0) { throw 'Plan E base is not an ancestor of HEAD' }
$expectedRangePaths=@(
    'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md',
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md',
    'extension/src/background/analyzeBridge.test.ts',
    'extension/src/background/analyzeBridge.ts',
    'extension/src/background/analyzeRequestHandler.test.ts',
    'extension/src/background/analyzeRequestHandler.ts',
    'extension/src/background/contextMenu.test.ts',
    'extension/src/background/contextMenu.ts',
    'extension/src/background/nativeMessageWire.test.ts',
    'extension/src/background/nativeMessageWire.ts',
    'extension/src/background/resetExtensionState.test.ts',
    'extension/src/background/serviceWorker.ts',
    'extension/src/background/teamManifestSync.test.ts',
    'extension/src/background/teamManifestSync.ts',
    'extension/src/components/FAB.analyzeRequest.test.tsx',
    'extension/src/components/FAB.bookmarkTelemetry.test.tsx',
    'extension/src/components/FAB.pageIdentity.test.tsx',
    'extension/src/components/FAB.promptSourceErrors.test.tsx',
    'extension/src/components/FAB.rootPathOverride.test.ts',
    'extension/src/components/FAB.spinner.test.tsx',
    'extension/src/components/FAB.tsx',
    'extension/src/components/FAB.userPrompt.test.tsx',
    'extension/src/components/MenuLogic.teamCache.test.ts',
    'extension/src/components/MenuLogic.ts',
    'extension/src/components/Options.collapseFolders.test.ts',
    'extension/src/components/Options.test.tsx',
    'extension/src/components/Options.tsx',
    'extension/src/components/ResultPopover.test.tsx',
    'extension/src/components/ResultPopover.tsx',
    'extension/src/content/index.tsx',
    'extension/src/content/updateErrorBridge.test.ts',
    'extension/src/content/updateErrorBridge.ts',
    'extension/src/hooks/useAnalysisHydration.test.ts',
    'extension/src/hooks/useAnalysisHydration.ts',
    'extension/src/test/chromeMock.ts',
    'extension/src/utils/analysisStore.test.ts',
    'extension/src/utils/analysisStore.ts',
    'extension/src/utils/analyzeRequest.test.ts',
    'extension/src/utils/analyzeRequest.ts',
    'extension/src/utils/bookmarkItems.test.ts',
    'extension/src/utils/bookmarkItems.ts',
    'extension/src/utils/configUpdateResult.test.ts',
    'extension/src/utils/configUpdateResult.ts',
    'extension/src/utils/nativeUpdateError.test.ts',
    'extension/src/utils/nativeUpdateError.ts',
    'extension/src/utils/ownData.test.ts',
    'extension/src/utils/ownData.ts',
    'extension/src/utils/pageIdentity.test.ts',
    'extension/src/utils/pageIdentity.ts',
    'extension/src/utils/prefs.ts',
    'extension/src/utils/promptSourceErrors.test.ts',
    'extension/src/utils/promptSourceErrors.ts',
    'extension/src/utils/teamCatalog.test.ts',
    'extension/src/utils/teamCatalog.ts',
    'extension/src/utils/translations.ts',
    'host/dh_native_host.py',
    'host/test_session_workspace.py',
    'host/test_update_engine_resume.py',
    'host/update_engine.py'
)
$expectedRangePaths=@($expectedRangePaths | Sort-Object -Unique)
$actualRangePaths=@(& git diff --name-only --no-renames "$integrationBase..HEAD" | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E integration range' }
$missingRange=@($expectedRangePaths | Where-Object { $actualRangePaths -cnotcontains $_ })
$extraRange=@($actualRangePaths | Where-Object { $expectedRangePaths -cnotcontains $_ })
if (
    $missingRange.Count -ne 0 -or
    $extraRange.Count -ne 0 -or
    $actualRangePaths.Count -ne 61 -or $expectedRangePaths.Count -ne 61
) {
    throw "Plan E range path mismatch. Missing: $($missingRange -join ', '); Extra: $($extraRange -join ', ')"
}
if ($expectedRangePaths.Count -ne 61 -or ($expectedRangePaths -join "`n") -cne ((@($expectedRangePaths | Sort-Object)) -join "`n")) {
    throw 'Plan E expected integration inventory is not the exact sorted 61-path set'
}
$dirtyPlanE=@(& git status --porcelain=v1 --untracked-files=all -- $expectedRangePaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E path status' }
if ($dirtyPlanE.Count -ne 0) { throw 'A Plan E range path is dirty' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$testedHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $testedHead.Count -ne 1 -or $testedHead[0].Trim() -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve tested source head'
}
$headSourceInventory=@(& git ls-tree -r --name-only $testedHead[0].Trim() -- $testedSourceRoots)
if ($LASTEXITCODE -ne 0 -or $headSourceInventory.Count -lt 1) { throw 'Could not inventory tested source at HEAD' }
$trackedSourceInventory=@(& git ls-files -- $testedSourceRoots)
if ($LASTEXITCODE -ne 0) { throw 'Could not inventory tracked tested source' }
if (($headSourceInventory -join "`n") -cne ($trackedSourceInventory -join "`n")) {
    throw 'Tracked tested-source inventory differs from reviewed HEAD'
}
$dirtyTestedSource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if ($LASTEXITCODE -ne 0 -or $dirtyTestedSource.Count -ne 0) {
    throw 'Tracked product/test source is not globally clean at reviewed HEAD'
}
$planDSentinels=@('extension/src/background/nativePortClient.ts','extension/src/background/hostGate.ts','extension/src/background/updateProtocol.ts','extension/src/background/updateCoordinator.ts','extension/src/background/serviceWorker.update.test.ts')
foreach ($path in $planDSentinels) {
    if (Test-Path -LiteralPath $path) { throw "Plan D sentinel appeared: $path" }
}
```

Expected: no tracked product/test source anywhere under the literal tested-source
roots is dirty or differs from the resolved HEAD inventory; no Plan E path is
dirty; the name-only list contains exactly 61 paths: the unique Task 1-8 path
union, all three accepted correction/amendment specs, this repaired plan, and the two authorized
Windows promotion retry paths. No other Plan A-C path, Plan D sentinel, version,
 dependency, registry, publish, or real-user-data file changed. Record all three
 correction/amendment-spec commits, both plan revisions, Tasks 1-8, controller fixes, and
the promotion retry commit separately.

Task 9's lease preflight requires no pre-existing untracked evidence path under
`.superpowers/sdd` except the fixed ignored promotion chronology, six surviving
reports, `.superpowers/sdd/.gitignore`, and the six enumerated optional
diagnostic recovery leaves plus optional hash-locked `plan-e-base.txt`. Existing
ignored dependency/toolchain caches outside `.superpowers/sdd` are not evidence
inputs or cleanup targets. Do not stage, edit, or remove any unrelated path.
Every tracked product/test dependency in the literal tested-source roots
must be clean and exactly inventoried at the resolved test head before every
focused/full Extension or Host suite; final evidence commit readiness requires
the complete tracked checkout clean while those explicitly allowed diagnostics
remain untouched.

Each later Task 9 region executes in this same foreground owner and begins with
`Assert-PlanERunLease -ExpectedPhase 'evidence'`. Use the literal declared base
and separately resolved immutable review head for Plan-E-only version/scope
diffs. Do not substitute mutable `HEAD`, depend on local `plan-e-base.txt`, or
infer a downstream commit.

- [ ] **Step 2: Run focused Extension verification**

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$focusedExtension=@(
    'src/utils/ownData.test.ts',
    'src/utils/bookmarkItems.test.ts',
    'src/components/Options.test.tsx',
    'src/components/MenuLogic.teamCache.test.ts',
    'src/utils/teamCatalog.test.ts',
    'src/background/teamManifestSync.test.ts',
    'src/utils/analysisStore.test.ts',
    'src/background/analyzeBridge.test.ts',
    'src/background/analyzeRequestHandler.test.ts',
    'src/background/nativeMessageWire.test.ts',
    'src/hooks/useAnalysisHydration.test.ts',
    'src/utils/promptSourceErrors.test.ts',
    'src/utils/pageIdentity.test.ts',
    'src/utils/analyzeRequest.test.ts',
    'src/background/contextMenu.test.ts',
    'src/components/ResultPopover.test.tsx',
    'src/components/FAB.pageIdentity.test.tsx',
    'src/components/FAB.analyzeRequest.test.tsx',
    'src/components/FAB.spinner.test.tsx',
    'src/components/FAB.promptSourceErrors.test.tsx',
    'src/utils/nativeUpdateError.test.ts',
    'src/utils/configUpdateResult.test.ts',
    'src/background/resetExtensionState.test.ts',
    'src/content/updateErrorBridge.test.ts'
)
$requiredExtension=@(
    'src/utils/ownData.ts',
    'src/background/analyzeRequestHandler.ts',
    'src/background/nativeMessageWire.ts'
) + $focusedExtension
foreach ($relative in $requiredExtension) {
    $fullPath=Join-Path 'extension' $relative
    if (-not (Test-Path -LiteralPath $fullPath)) {
        throw "Required Plan E Extension file missing: $fullPath"
    }
}
$focusedResult='.superpowers/sdd/focused-extension-results.json'
$focusedRawDirectory=Join-Path $script:PlanETempRoot 'focused-extension-raw'
$focusedRawPaths=[ordered]@{
    plan_e_focused=Join-Path $focusedRawDirectory 'plan-e.json'
    task_6_current=Join-Path $focusedRawDirectory 'task-6.json'
    task_7_current=Join-Path $focusedRawDirectory 'task-7.json'
}
$focusedTemp=Join-Path $script:PlanETempRoot 'focused-extension-results.canonical.tmp'
if ((Test-Path -LiteralPath $focusedResult) -or (Test-Path -LiteralPath $focusedTemp) -or (Test-Path -LiteralPath $focusedRawDirectory)) { throw 'Focused Extension result or temporary already exists; run the documented mutable-result reset first' }
$focusedHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $focusedHead.Count -ne 1 -or $focusedHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind focused Extension result to HEAD' }
if ($focusedHead[0].Trim() -cne $script:PlanEReviewedHead) { throw 'Focused Extension head differs from lease' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$headSource=@(& git ls-tree -r --name-only $focusedHead[0].Trim() -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$currentHead=@(& git rev-parse HEAD)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $headSource.Count -lt 1 -or $currentHead.Count -ne 1 -or
    $currentHead[0].Trim() -cne $focusedHead[0].Trim() -or
    ($headSource -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Focused Extension tested source is not globally clean at reviewed HEAD' }
$task6Focused=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts')
$task7Focused=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts')
$focusedRuns=@(
    [ordered]@{id='plan_e_focused';files=$focusedExtension},
    [ordered]@{id='task_6_current';files=$task6Focused},
    [ordered]@{id='task_7_current';files=$task7Focused}
)
$npmCommand=$script:PlanENpmCommand
$repositoryRoot=(Get-Location).Path
try {
    New-PlanERegisteredDirectory -Path $focusedRawDirectory -ExpectedPhase 'evidence'
    foreach ($run in $focusedRuns) {
        $rawPath=$focusedRawPaths[$run.id]
        $null=Assert-PlanERegisteredMutationPath -Path $rawPath -ExpectedPhase 'evidence'
        $arguments=@('run','test:run','--prefix','extension','--') + @($run.files) + @('--configLoader','runner','--no-cache','--reporter=verbose','--reporter=json',("--outputFile.json=" + $rawPath))
        $execution=Invoke-PlanERedirectedWriter -FilePath $npmCommand -ArgumentList $arguments -ExpectedWorkingDirectory $repositoryRoot
        [Console]::Out.Write($execution.stdout)
        [Console]::Error.Write($execution.stderr)
        if ($execution.exit_code -ne 0) { throw "Focused Extension verification failed: $($run.id)" }
    }
$focusedValidator=@'
import json,os,pathlib,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
def validate_counts(value,rows,name):
    required={'numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests'}
    if not required.issubset(value): raise SystemExit(name+' missing counter')
    for key,counter in value.items():
        if key.startswith('num') and (type(counter) is not int or counter<0): raise SystemExit(name+' invalid counter '+key)
    if value['numTotalTestSuites']!=value['numPassedTestSuites']+value['numFailedTestSuites']+value['numPendingTestSuites']: raise SystemExit(name+' suite counter relationship')
    if value['numTotalTests']!=value['numPassedTests']+value['numFailedTests']+value['numPendingTests']+value['numTodoTests']: raise SystemExit(name+' test counter relationship')
    if value['numTotalTestSuites']<len(rows) or value['numPassedTestSuites']!=value['numTotalTestSuites']: raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
raws=[pathlib.Path(item) for item in sys.argv[1:4]]
temp,target=map(pathlib.Path,sys.argv[4:6])
head=sys.argv[6]
arguments=sys.argv[7:]
first=arguments.index('--task-6'); second=arguments.index('--task-7')
expected={
    'plan_e_focused':arguments[:first],
    'task_6_current':arguments[first+1:second],
    'task_7_current':arguments[second+1:],
}
def observed_path(row):
    name=row.get('name')
    if type(name) is not str: raise SystemExit('focused Vitest row name mismatch')
    name=name.replace('\\','/')
    if '/extension/' in name: return name.rsplit('/extension/',1)[1]
    if name.startswith('extension/'): return name[len('extension/'):]
    return name
result={'reviewed_head':head,'schema_version':1,'suites':{}}
for name,raw in zip(('plan_e_focused','task_6_current','task_7_current'),raws):
    value=json.loads(raw.read_text(encoding='utf-8'),object_pairs_hook=pairs,parse_constant=reject_constant)
    if type(value) is not dict or 'reviewed_head' in value: raise SystemExit(name+' Vitest root shape mismatch')
    files=[item.replace('\\','/') for item in expected[name]]
    if not files or len(files)!=len(set(files)): raise SystemExit(name+' expected path inventory')
    rows=value.get('testResults')
    if type(rows) is not list or not rows or any(type(row) is not dict for row in rows): raise SystemExit(name+' Vitest rows mismatch')
    validate_counts(value,rows,name+' Vitest')
    row_keys=[json.dumps(row,sort_keys=True,separators=(',',':')) for row in rows]
    if len(row_keys)!=len(set(row_keys)): raise SystemExit(name+' duplicate testResults row')
    observed=[observed_path(row) for row in rows]
    if len(observed)!=len(set(observed)) or set(observed)!=set(files) or len(observed)!=len(files): raise SystemExit(name+' exact file inventory')
    if value.get('success') is not True or value.get('numFailedTests')!=0 or value.get('numFailedTestSuites')!=0 or value.get('numPendingTests')!=0 or value.get('numPendingTestSuites')!=0 or value.get('numTodoTests')!=0: raise SystemExit(name+' Vitest status mismatch')
    if value.get('numTotalTests')!=value.get('numPassedTests') or value.get('numTotalTests',0)<1: raise SystemExit(name+' Vitest test count mismatch')
    for row in rows:
        if row.get('status')!='passed': raise SystemExit(name+' Vitest file status mismatch')
        assertions=row.get('assertionResults')
        if type(assertions) is not list or not assertions or any(type(item) is not dict or item.get('status')!='passed' for item in assertions): raise SystemExit(name+' Vitest pending/todo/skipped test detected')
    result['suites'][name]=value
canonical=json.dumps(result,sort_keys=True,separators=(',',':'))+'\n'
temp.write_text(canonical,encoding='utf-8',newline='')
check=temp.read_text(encoding='utf-8')
parsed=json.loads(check,object_pairs_hook=pairs,parse_constant=reject_constant)
if check!=canonical or parsed!=result or target.exists(): raise SystemExit('focused canonical promotion precondition failed')
os.replace(temp,target)
print(' '.join(f"{name}:{value['numTotalTests']}:{len(value['testResults'])}" for name,value in result['suites'].items()))
'@
    $null=Assert-PlanERegisteredMutationPath -Path $focusedTemp -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $focusedResult -ExpectedPhase 'evidence'
    $focusedValidation=Invoke-PlanERedirectedWriter -FilePath $script:PlanEPythonCommand -ArgumentList (@('-',$focusedRawPaths.plan_e_focused,$focusedRawPaths.task_6_current,$focusedRawPaths.task_7_current,$focusedTemp,$focusedResult,$focusedHead[0].Trim()) + @($focusedExtension) + @('--task-6') + @($task6Focused) + @('--task-7') + @($task7Focused)) -ExpectedWorkingDirectory (Get-Location).Path -StandardInput $focusedValidator
    $focusedCounts=@($focusedValidation.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($focusedValidation.exit_code -ne 0 -or $focusedCounts.Count -ne 1) { throw "Focused Extension JSON validation failed`n$($focusedValidation.stderr)" }
} finally {
    if (Test-Path -LiteralPath $focusedRawDirectory) { $rawInfo=Get-Item -LiteralPath $focusedRawDirectory -Force; if ($rawInfo -isnot [IO.DirectoryInfo] -or ($rawInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: focused raw directory is unsafe at cleanup' }; Remove-PlanERegisteredPath -Path $focusedRawDirectory -ExpectedPhase 'evidence' -Recurse }
    if (Test-Path -LiteralPath $focusedTemp) { Remove-PlanERegisteredPath -Path $focusedTemp -ExpectedPhase 'evidence' }
}
& git check-ignore -q -- $focusedResult
if ($LASTEXITCODE -ne 0) { throw 'Focused Extension result is not ignored' }
Register-PlanECurrentRunArtifact -Path $focusedResult
```

Expected: `utils/ownData.ts`, `background/analyzeRequestHandler.ts`, `background/nativeMessageWire.ts`, and their focused tests exist; the broad Plan E suite and the exact Task 6/7 current-state file inventories each pass and are stored as three closed reviewed-head-bound suite members in one canonical artifact. Record exact totals.

- [ ] **Step 3: Run full Extension tests, type/build gates, and generated-output check**

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$fullResult='.superpowers/sdd/full-extension-results.json'
$fullRaw=Join-Path $script:PlanETempRoot 'full-extension-results.raw.tmp'
$fullTemp=Join-Path $script:PlanETempRoot 'full-extension-results.canonical.tmp'
if ((Test-Path -LiteralPath $fullResult) -or (Test-Path -LiteralPath $fullRaw) -or (Test-Path -LiteralPath $fullTemp)) { throw 'Full Extension result or temporary already exists; run the documented mutable-result reset first' }
$fullHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $fullHead.Count -ne 1 -or $fullHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind full Extension result to HEAD' }
if ($fullHead[0].Trim() -cne $script:PlanEReviewedHead) { throw 'Full Extension head differs from lease' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$headSource=@(& git ls-tree -r --name-only $fullHead[0].Trim() -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$currentHead=@(& git rev-parse HEAD)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $headSource.Count -lt 1 -or $currentHead.Count -ne 1 -or
    $currentHead[0].Trim() -cne $fullHead[0].Trim() -or
    ($headSource -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Full Extension tested source is not globally clean at reviewed HEAD' }
$expectedFullTests=@(& git ls-tree -r --name-only $fullHead[0].Trim() -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' })
if ($LASTEXITCODE -ne 0 -or $expectedFullTests.Count -lt 1) { throw 'Could not inventory full Extension tests' }
$expectedFullTests=@($expectedFullTests | ForEach-Object { $_ -replace '^extension/','' })
$fullRawAbsolute=Join-Path (Get-Location) $fullRaw
try {
    $null=Assert-PlanERegisteredMutationPath -Path $fullRaw -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $fullTemp -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $fullResult -ExpectedPhase 'evidence'
    $fullExecution=Invoke-PlanERedirectedWriter -FilePath $script:PlanENpmCommand -ArgumentList @('run','test:run','--prefix','extension','--','--configLoader','runner','--no-cache','--reporter=verbose','--reporter=json',("--outputFile.json=" + $fullRawAbsolute)) -ExpectedWorkingDirectory (Get-Location).Path
    [Console]::Out.Write($fullExecution.stdout)
    [Console]::Error.Write($fullExecution.stderr)
    if ($fullExecution.exit_code -ne 0) { throw 'Full Extension tests failed' }
$fullValidator=@'
import json,os,pathlib,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
def validate_counts(value,rows,name):
    required={'numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests'}
    if not required.issubset(value): raise SystemExit(name+' missing counter')
    for key,counter in value.items():
        if key.startswith('num') and (type(counter) is not int or counter<0): raise SystemExit(name+' invalid counter '+key)
    if value['numTotalTestSuites']!=value['numPassedTestSuites']+value['numFailedTestSuites']+value['numPendingTestSuites']: raise SystemExit(name+' suite counter relationship')
    if value['numTotalTests']!=value['numPassedTests']+value['numFailedTests']+value['numPendingTests']+value['numTodoTests']: raise SystemExit(name+' test counter relationship')
    if value['numTotalTestSuites']<len(rows) or value['numPassedTestSuites']!=value['numTotalTestSuites']: raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
raw,temp,target=map(pathlib.Path,sys.argv[1:4])
head=sys.argv[4]
value=json.loads(raw.read_text(encoding='utf-8'),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or 'reviewed_head' in value: raise SystemExit('full Vitest root shape mismatch')
expected=[item.replace('\\','/') for item in sys.argv[5:]]
if len(expected)!=len(set(expected)): raise SystemExit('duplicate full expected path')
rows=value.get('testResults')
if type(rows) is not list or not rows or any(type(row) is not dict for row in rows): raise SystemExit('full Vitest rows mismatch')
validate_counts(value,rows,'full Vitest')
row_keys=[json.dumps(row,sort_keys=True,separators=(',',':')) for row in rows]
if len(row_keys)!=len(set(row_keys)): raise SystemExit('duplicate full testResults row')
def observed_path(row):
    name=row.get('name')
    if type(name) is not str: raise SystemExit('full Vitest row name mismatch')
    name=name.replace('\\','/')
    if '/extension/' in name: return name.rsplit('/extension/',1)[1]
    if name.startswith('extension/'): return name[len('extension/'):]
    return name
observed=[observed_path(row) for row in rows]
if len(observed)!=len(set(observed)): raise SystemExit('duplicate full observed file path')
if value.get('success') is not True or value.get('numFailedTests') != 0 or value.get('numFailedTestSuites') != 0 or value.get('numPendingTests') != 0 or value.get('numPendingTestSuites') != 0 or value.get('numTodoTests') != 0:
    raise SystemExit('full Vitest status mismatch')
if value.get('numTotalTests') != value.get('numPassedTests') or value.get('numTotalTests',0) < 1:
    raise SystemExit('full Vitest test count mismatch')
if not rows or any(row.get('status') != 'passed' for row in rows):
    raise SystemExit('full Vitest file status mismatch')
if set(observed) != set(expected) or len(observed)!=len(expected):
    raise SystemExit(f'full Vitest file mismatch: {sorted(observed)}')
for row in rows:
    assertions=row.get('assertionResults')
    if type(assertions) is not list or not assertions or any(type(item) is not dict or item.get('status')!='passed' for item in assertions):
        raise SystemExit('full Vitest pending/todo/skipped test detected')
value['reviewed_head']=head
canonical=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n'
temp.write_text(canonical,encoding='utf-8',newline='')
check=temp.read_text(encoding='utf-8')
parsed=json.loads(check,object_pairs_hook=pairs,parse_constant=reject_constant)
if check!=canonical or parsed!=value or target.exists(): raise SystemExit('full canonical promotion precondition failed')
os.replace(temp,target)
print(f"{value['numTotalTests']} {len(rows)}")
'@
    $null=Assert-PlanERegisteredMutationPath -Path $fullTemp -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $fullResult -ExpectedPhase 'evidence'
    $fullValidation=Invoke-PlanERedirectedWriter -FilePath $script:PlanEPythonCommand -ArgumentList (@('-',$fullRaw,$fullTemp,$fullResult,$fullHead[0].Trim()) + @($expectedFullTests)) -ExpectedWorkingDirectory (Get-Location).Path -StandardInput $fullValidator
    $fullCounts=@($fullValidation.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($fullValidation.exit_code -ne 0 -or $fullCounts.Count -ne 1) { throw "Full Extension JSON validation failed`n$($fullValidation.stderr)" }
} finally {
    if (Test-Path -LiteralPath $fullRaw) { Remove-PlanERegisteredPath -Path $fullRaw -ExpectedPhase 'evidence' }
    if (Test-Path -LiteralPath $fullTemp) { Remove-PlanERegisteredPath -Path $fullTemp -ExpectedPhase 'evidence' }
}
& git check-ignore -q -- $fullResult
if ($LASTEXITCODE -ne 0) { throw 'Full Extension result is not ignored' }
Register-PlanECurrentRunArtifact -Path $fullResult
Push-Location -LiteralPath 'extension'
try {
    $tsBuildInfo=Join-Path $script:PlanETempRoot 'tsbuildinfo-step-3.tmp'
    $null=Assert-PlanERegisteredMutationPath -Path $tsBuildInfo -ExpectedPhase 'evidence'
    $tsExit=Invoke-PlanEWriter -FilePath $script:PlanENpmCommand -ArgumentList @('exec','tsc','--','--noEmit','--tsBuildInfoFile',$tsBuildInfo,'-p','tsconfig.json') -ExpectedWorkingDirectory (Get-Location).Path
    if ($tsExit -ne 0) { throw 'Extension TypeScript failed' }
} finally {
    Pop-Location
}
$buildOutput=Join-Path $script:PlanETempRoot 'build-output/step-3'
$null=Assert-PlanERegisteredMutationPath -Path $buildOutput -ExpectedPhase 'evidence'
$buildExit=Invoke-PlanEWriter -FilePath $script:PlanENpmCommand -ArgumentList @('run','build','--prefix','extension','--','--configLoader','runner','--outDir',$buildOutput,'--emptyOutDir') -ExpectedWorkingDirectory (Get-Location).Path
if ($buildExit -ne 0) { throw 'Extension build failed' }
$status=@(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect post-build status' }
$generated=@($status | Where-Object { $_ -match 'extension[\\/]dist' })
if ($generated.Count -gt 0) { throw 'Build generated tracked/unignored dist paths' }
```

Expected: full Vitest exits 0 with all tests/files passed; standalone TypeScript
exits 0; production build exits 0 into the exact registered token-root
`build-output/step-3` subtree; `extension/dist` is not written and no generated
product file appears in `git status`. Vite uses `--configLoader runner`, so it
does not create the default random `node_modules/.vite-temp` config bundle.

- [ ] **Step 4: Run lease-owned isolated Host verification**

Use one token-owned parent with a separate six-environment directory set for each Python phase. The region restores process environment in `finally` and leaves its owned tree for normal owner cleanup:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
if (-not (Test-Path -LiteralPath 'host\venv\Scripts\python.exe' -PathType Leaf)) {
    throw 'Host venv Python is unavailable'
}
$root=Join-Path $script:PlanETempRoot 'host-environments'
if (Test-Path -LiteralPath $root) { throw 'Plan E Host temp root already exists' }
function New-PlanEHostEnvironmentOverrides {
    param(
        [Parameter(Mandatory=$true)][string]$Phase,
        [Parameter(Mandatory=$true)][bool]$UseHostPath
    )
    $phaseRoot=Join-Path $root $Phase
    New-PlanERegisteredDirectory -Path $phaseRoot -ExpectedPhase 'evidence'
    $paths=[ordered]@{
        LOCALAPPDATA=Join-Path $phaseRoot 'localappdata'
        APPDATA=Join-Path $phaseRoot 'appdata'
        USERPROFILE=Join-Path $phaseRoot 'userprofile'
        HOME=Join-Path $phaseRoot 'home'
        TEMP=Join-Path $phaseRoot 'temp'
        TMP=Join-Path $phaseRoot 'tmp'
    }
    foreach ($path in @($paths.Values)) { New-PlanERegisteredDirectory -Path $path -ExpectedPhase 'evidence' }
    $overrides=[ordered]@{}
    foreach ($entry in $paths.GetEnumerator()) { $overrides[$entry.Key]=$entry.Value }
    $overrides.PYTHONPATH=if ($UseHostPath) { (Resolve-Path -LiteralPath 'host').Path } else { $null }
    $overrides.PYTHONDONTWRITEBYTECODE='1'
    $overrides.DH_PROMOTION_EVIDENCE=$null
    $overrides.DH_PLAN_C_FROZEN_ONEDIR=$null
    return $overrides
}
$hostResultPath='.superpowers/sdd/host-test-results.json'
$hostResultTemp=Join-Path $script:PlanETempRoot 'host-test-results.tmp'
if ((Test-Path -LiteralPath $hostResultPath) -or (Test-Path -LiteralPath $hostResultTemp)) { throw 'Host result or temporary already exists; run the documented mutable-result reset first' }
$hostHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $hostHead.Count -ne 1 -or $hostHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind Host result to HEAD' }
if ($hostHead[0].Trim() -cne $script:PlanEReviewedHead) { throw 'Host head differs from lease' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$headSource=@(& git ls-tree -r --name-only $hostHead[0].Trim() -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $headSource.Count -lt 1 -or
    ($headSource -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Host tested source is not globally clean at reviewed HEAD' }
$hostResults=[ordered]@{schema_version=1;reviewed_head=$hostHead[0].Trim()}
function Assert-PlanETestedSource {
    $current=@(& git rev-parse HEAD)
    $headFiles=@(& git ls-tree -r --name-only $hostHead[0].Trim() -- $testedSourceRoots)
    $trackedFiles=@(& git ls-files -- $testedSourceRoots)
    $dirty=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
    if (
        $LASTEXITCODE -ne 0 -or $current.Count -ne 1 -or
        $current[0].Trim() -cne $hostHead[0].Trim() -or
        ($headFiles -join "`n") -cne ($trackedFiles -join "`n") -or
        $dirty.Count -ne 0
    ) { throw 'Tracked product/test source changed before a Host phase' }
}
function Invoke-PlanEHostSuite {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [Parameter(Mandatory=$true)][AllowEmptyCollection()][object[]]$ExpectedSkips,
        [Parameter(Mandatory=$true)][hashtable]$EnvironmentOverrides
    )
    Assert-PlanETestedSource
    $execution=Invoke-PlanEEnvironmentScope -Context "Host phase $Name" -Overrides $EnvironmentOverrides -Body {
        Invoke-PlanERedirectedWriter -FilePath $script:PlanEPythonCommand -ArgumentList $Arguments -ExpectedWorkingDirectory (Get-Location).Path
    }
    $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
    $exit=$execution.exit_code
    foreach ($line in $lines) { [Console]::Out.WriteLine([string]$line) }
    $text=$lines -join "`n"
    $ran=[regex]::Matches($text,'(?m)^Ran ([1-9][0-9]*) tests? in [0-9.]+s\r?$')
    $ok=[regex]::Matches($text,'(?m)^OK(?: \(skipped=([0-9]+)\))?\r?$')
    if ($exit -ne 0 -or $ran.Count -ne 1 -or $ok.Count -ne 1 -or $text -cmatch '(?m)^(FAILED|ERROR:)') {
        throw "$Name Host suite output is invalid"
    }
    $skipped=if ($ok[0].Groups[1].Success) { [int]$ok[0].Groups[1].Value } else { 0 }
    $skipMatches=[regex]::Matches($text,"(?m)^.* \(([^()\r\n]+)\) \.\.\. skipped '([^'\r\n]*)'\r?$")
    $skips=@($skipMatches | ForEach-Object {
        [ordered]@{selector=$_.Groups[1].Value;reason=$_.Groups[2].Value}
    })
    $passedSelectors=@(
        [regex]::Matches($text,'(?m)^.* \(([^()\r\n]+)\) \.\.\. ok\r?$') |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object
    )
    if ($skipped -ne $skips.Count -or $skips.Count -ne $ExpectedSkips.Count) {
        throw "$Name Host suite skip count/verbose identity mismatch"
    }
    if ($passedSelectors.Count -ne ([int]$ran[0].Groups[1].Value - $skipped) -or $passedSelectors.Count -ne @($passedSelectors | Sort-Object -Unique).Count) {
        throw "$Name Host suite passed-selector inventory mismatch"
    }
    for ($index=0; $index -lt $ExpectedSkips.Count; $index++) {
        if (
            $skips[$index].selector -cne $ExpectedSkips[$index].selector -or
            $skips[$index].reason -cne $ExpectedSkips[$index].reason
        ) { throw "$Name Host suite skip identity/reason mismatch" }
    }
    return [ordered]@{tests=[int]$ran[0].Groups[1].Value;skipped=$skipped;skips=$skips;passed_selectors=$passedSelectors}
}
$authorizedSkip=[ordered]@{
    selector='host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation'
    reason='DH_PLAN_C_FROZEN_ONEDIR not set'
}
$fullHostTestPaths=@(& git ls-tree -r --name-only $hostHead[0].Trim() -- host | Where-Object { $_ -match '^host/test_[^/]+\.py$' })
if ($LASTEXITCODE -ne 0 -or $fullHostTestPaths.Count -lt 1) { throw 'Could not inventory full Host test modules at reviewed HEAD' }
$fullHostModules=@($fullHostTestPaths | ForEach-Object { ($_ -replace '\.py$','') -replace '/','.' })
if ($fullHostModules.Count -ne @($fullHostModules | Sort-Object -Unique).Count) { throw 'Full Host test module inventory contains duplicates' }
$fullHostArguments=@('-m','unittest') + $fullHostModules + @('-v')
New-PlanERegisteredDirectory -Path $root -ExpectedPhase 'evidence'
$hostResults.focused=Invoke-PlanEHostSuite -Name 'focused' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'focused' -UseHostPath $true) -ExpectedSkips @() -Arguments @('-m','unittest','host.test_session_workspace','host.test_prompt_session','host.test_prompt_sources','host.test_sdk_compat','host.test_debug_prompt_isolation','host.test_model_config','-v')
$hostResults.task_7_current=Invoke-PlanEHostSuite -Name 'task-7-current' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'task-7-current' -UseHostPath $true) -ExpectedSkips @() -Arguments @('-m','unittest','host.test_session_workspace','host.test_prompt_session','-v')
$hostResults.full=Invoke-PlanEHostSuite -Name 'full' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'full' -UseHostPath $true) -ExpectedSkips @($authorizedSkip) -Arguments $fullHostArguments
Assert-PlanETestedSource
$compileProgram="import pathlib; [compile(path.read_bytes(), str(path), 'exec') for path in pathlib.Path('host').rglob('*.py') if 'venv' not in path.parts]"
$compileOverrides=New-PlanEHostEnvironmentOverrides -Phase 'compile' -UseHostPath $false
$compileExit=Invoke-PlanEEnvironmentScope -Context 'Host phase compile' -Overrides $compileOverrides -Body { Invoke-PlanEWriter -FilePath $script:PlanEPythonCommand -ArgumentList @('-c',$compileProgram) -ExpectedWorkingDirectory (Get-Location).Path }
if ($compileExit -ne 0) { throw 'Host in-memory syntax compile failed' }
$hostResults.compile='passed'
$hostResults.update_engine=Invoke-PlanEHostSuite -Name 'update-engine' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'update-engine' -UseHostPath $true) -ExpectedSkips @() -Arguments @('-m','unittest','host.test_update_engine_resume','host.test_update_engine_host','host.test_update_engine_extension','host.test_update_engine_rollback','-v')
$hostResults.recovery=Invoke-PlanEHostSuite -Name 'recovery' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'recovery' -UseHostPath $true) -ExpectedSkips @($authorizedSkip) -Arguments @('-m','unittest','host.test_update_recovery','-v')
$hostResults.package=Invoke-PlanEHostSuite -Name 'package' -EnvironmentOverrides (New-PlanEHostEnvironmentOverrides -Phase 'package' -UseHostPath $true) -ExpectedSkips @() -Arguments @('-m','unittest','host.test_release_helper','host.test_package_archive','-v')
$hostResultJson=$hostResults | ConvertTo-Json -Depth 5 -Compress
$canonicalizer=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonical=@($hostResultJson | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $canonical.Count -ne 1) { throw 'Host result canonicalization failed' }
try {
    Write-PlanERegisteredText -Path $hostResultTemp -Text ($canonical[0] + "`n") -ExpectedPhase 'evidence'
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $hostResultTemp),[Text.UTF8Encoding]::new($false))
    if ($tempText -cne $canonical[0] + "`n" -or (Test-Path -LiteralPath $hostResultPath)) { throw 'Host atomic promotion precondition failed' }
    Move-PlanERegisteredPath -Source $hostResultTemp -Destination $hostResultPath -ExpectedPhase 'evidence'
} finally {
    if (Test-Path -LiteralPath $hostResultTemp) { Remove-PlanERegisteredPath -Path $hostResultTemp -ExpectedPhase 'evidence' }
}
& git check-ignore -q -- $hostResultPath
if ($LASTEXITCODE -ne 0) { throw 'Host test result is not ignored' }
Register-PlanECurrentRunArtifact -Path $hostResultPath
```

Expected: focused Host, the exact Task 7 `host.test_session_workspace host.test_prompt_session` current-state phase, and the reviewed-head inventory of every tracked top-level `host/test_*.py` module report `OK`; source-only in-memory syntax compilation exits 0 without writing bytecode; the expanded update-engine, recovery/package, and release/archive staging tests report `OK` without building/publishing assets. Full and recovery each contain exactly the authorized skip selector; focused, Task-7-current, update-engine, and package contain zero skips. Every phase records sorted exact passed selectors as well as totals/skips so the Task 7 audit can require its four selector names rather than infer them from a summary count. Environment directories remain under the closed token root until owner-only cleanup rather than being deleted by a suite block.

- [ ] **Step 5: Run the no-coercion, ownership, and compatibility static scans**

Run from the root using `git grep` so only tracked source is inspected. The first two commands are expected-no-match gates, so handle exit code 1 explicitly; later commands are inventory scans and may print matches:

<!-- REVIEWED_HEAD_STATIC_AUDIT_START -->
```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$staticHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $staticHead.Count -ne 1 -or $staticHead[0].Trim() -cne $script:PlanEReviewedHead) { throw 'Static audit head differs from lease' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$headSource=@(& git ls-tree -r --name-only $staticHead[0].Trim() -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $staticHead.Count -ne 1 -or
    ($headSource -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Static audit source is not globally clean at reviewed HEAD' }
& git grep -n -E '\bString\(|JSON\.stringify|\.toString\(' -- extension/src/utils/ownData.ts extension/src/utils/bookmarkItems.ts extension/src/utils/analysisStore.ts extension/src/background/analyzeBridge.ts extension/src/background/analyzeRequestHandler.ts extension/src/background/nativeMessageWire.ts extension/src/utils/pageIdentity.ts extension/src/utils/analyzeRequest.ts extension/src/utils/nativeUpdateError.ts
if ($LASTEXITCODE -eq 0) { throw 'Parser-boundary coercion remains' }
if ($LASTEXITCODE -ne 1) { throw 'Parser-boundary coercion scan failed' }
& git grep -n -E 'chrome\.|serviceWorker|connectNative|nativePort|ApplicationInsights|setupContextMenu' -- extension/src/background/analyzeRequestHandler.ts
if ($LASTEXITCODE -eq 0) { throw 'Analyze request handler is not a pure injected boundary' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze request-handler purity scan failed' }
& git grep -n 'handleAnalyzeForward' -- extension/src/background/serviceWorker.ts
if ($LASTEXITCODE -eq 0) { throw 'Service Worker bypasses the Analyze request handler' }
if ($LASTEXITCODE -ne 1) { throw 'Analyze handler-bypass scan failed' }
& git grep -n -E '\b(analysisField|ownField)\b' -- extension/src
if ($LASTEXITCODE -eq 0) { throw 'Duplicate own-data classifier remains' }
if ($LASTEXITCODE -ne 1) { throw 'Own-data classifier scan failed' }
& git grep -n -E '\.\.\.|Object\.assign\(' -- extension/src/background/nativeMessageWire.ts
if ($LASTEXITCODE -eq 0) { throw 'Native wire helper uses spread or Object.assign' }
if ($LASTEXITCODE -ne 1) { throw 'Native wire copy scan failed' }
$senderAudit=@'
const fs = require('node:fs')
const ts = require('typescript')
const path = 'src/background/serviceWorker.ts'
const source = ts.createSourceFile(
    path,
    fs.readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
)
let sender
let runtimeListener
const imports = new Map()
function find(node) {
    if (
        ts.isImportDeclaration(node)
        && ts.isStringLiteral(node.moduleSpecifier)
        && node.importClause?.namedBindings
        && ts.isNamedImports(node.importClause.namedBindings)
    ) {
        for (const element of node.importClause.namedBindings.elements) {
            imports.set(element.name.text, node.moduleSpecifier.text)
        }
    }
    if (
        ts.isFunctionDeclaration(node)
        && node.name?.text === 'sendNativeMessage'
    ) sender = node
    if (
        ts.isCallExpression(node)
        && node.expression.getText(source) === 'chrome.runtime.onMessage.addListener'
    ) {
        if (runtimeListener) throw new Error('Multiple runtime message listeners found')
        runtimeListener = node.arguments[0]
    }
    ts.forEachChild(node, find)
}
find(source)
if (!sender) throw new Error('sendNativeMessage function is missing')
if (!runtimeListener) throw new Error('Runtime message listener is missing')
if (imports.get('handleAnalyzeRequest') !== './analyzeRequestHandler') {
    throw new Error('handleAnalyzeRequest import is missing or aliased')
}
if (imports.get('postNativeMessageWire') !== './nativeMessageWire') {
    throw new Error('postNativeMessageWire import is missing or aliased')
}
function semanticTokens(text) {
    const parsed = ts.createSourceFile(
        'native-audit.ts',
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    )
    if (parsed.parseDiagnostics.length !== 0) {
        throw new Error('Locked Native implementation does not parse')
    }
    const normalized = ts.createPrinter({
        removeComments: true,
        newLine: ts.NewLineKind.LineFeed,
    }).printFile(parsed)
    const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        normalized,
    )
    const tokens = []
    for (let token=scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token=scanner.scan()) {
        const value = token === ts.SyntaxKind.StringLiteral
            ? scanner.getTokenValue()
            : scanner.getTokenText()
        tokens.push(`${token}:${value}`)
    }
    return tokens.join('\n')
}
const expectedSender = String.raw`
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
}`
if (semanticTokens(sender.getText(source)) !== semanticTokens(expectedSender)) {
    throw new Error('sendNativeMessage differs from the locked implementation')
}
const expectedNativeBranch = String.raw`
if (message.type === 'NATIVE_MSG') {
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
}`
const nativeBranches = []
function findNativeBranches(node) {
    if (
        ts.isIfStatement(node)
        && semanticTokens(node.expression.getText(source))
            === semanticTokens("message.type === 'NATIVE_MSG'")
    ) nativeBranches.push(node)
    ts.forEachChild(node, findNativeBranches)
}
findNativeBranches(runtimeListener)
if (nativeBranches.length !== 1) throw new Error('Expected one NATIVE_MSG branch')
if (
    semanticTokens(nativeBranches[0].getText(source))
    !== semanticTokens(expectedNativeBranch)
) throw new Error('NATIVE_MSG routing differs from the locked implementation')
const lockedNames = new Set([
    'sendNativeMessage',
    'handleAnalyzeRequest',
    'guardNonAnalyzeNativeMessage',
    'postNativeMessageWire',
])
function within(node, ancestor) {
    for (let current=node; current; current=current.parent) {
        if (current === ancestor) return true
    }
    return false
}
function inspectLockedReferences(node) {
    if (ts.isIdentifier(node) && lockedNames.has(node.text)) {
        const isImport = ts.isImportSpecifier(node.parent)
        const isSenderDeclaration = node === sender.name
        const isInsideSender = within(node, sender)
        const isInsideNativeBranch = within(node, nativeBranches[0])
        if (!isImport && !isSenderDeclaration && !isInsideSender && !isInsideNativeBranch) {
            throw new Error(`Unexpected reference to locked Native symbol: ${node.text}`)
        }
    }
    ts.forEachChild(node, inspectLockedReferences)
}
inspectLockedReferences(source)
function rejectOtherPostMessageReferences(node) {
    if (!within(node, sender)) {
        if (ts.isIdentifier(node) && node.text === 'postMessage') {
            throw new Error('postMessage reference exists outside sendNativeMessage')
        }
        if (
            (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
            && node.text === 'postMessage'
        ) throw new Error('Computed postMessage reference exists outside sendNativeMessage')
    }
    ts.forEachChild(node, rejectOtherPostMessageReferences)
}
rejectOtherPostMessageReferences(source)
const allowedNativePortReferences = new Set([
    'declaration',
    'connect-assignment',
    'on-message-listener',
    'on-disconnect-listener',
    'disconnect-clear',
])
const observedNativePortReferences = []
function auditNativePortReferences(node) {
    if (within(node, sender)) return
    if (ts.isIdentifier(node) && node.text === 'nativePort') {
        const parent = node.parent
        let kind
        if (ts.isVariableDeclaration(parent) && parent.name === node) {
            kind = 'declaration'
        } else if (
            ts.isBinaryExpression(parent)
            && parent.left === node
            && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
            && parent.right.getText(source) === 'chrome.runtime.connectNative(NATIVE_HOST_NAME)'
        ) {
            kind = 'connect-assignment'
        } else if (
            ts.isPropertyAccessExpression(parent)
            && parent.expression === node
            && parent.name.text === 'onMessage'
            && ts.isPropertyAccessExpression(parent.parent)
            && parent.parent.expression === parent
            && parent.parent.name.text === 'addListener'
            && ts.isCallExpression(parent.parent.parent)
            && parent.parent.parent.expression === parent.parent
        ) {
            kind = 'on-message-listener'
        } else if (
            ts.isPropertyAccessExpression(parent)
            && parent.expression === node
            && parent.name.text === 'onDisconnect'
            && ts.isPropertyAccessExpression(parent.parent)
            && parent.parent.expression === parent
            && parent.parent.name.text === 'addListener'
            && ts.isCallExpression(parent.parent.parent)
            && parent.parent.parent.expression === parent.parent
        ) {
            kind = 'on-disconnect-listener'
        } else if (
            ts.isBinaryExpression(parent)
            && parent.left === node
            && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
            && parent.right.kind === ts.SyntaxKind.NullKeyword
        ) {
            kind = 'disconnect-clear'
        } else {
            throw new Error(`Unexpected nativePort reference: ${parent.getText(source)}`)
        }
        observedNativePortReferences.push(kind)
    }
    ts.forEachChild(node, auditNativePortReferences)
}
auditNativePortReferences(source)
for (const kind of allowedNativePortReferences) {
    const count=observedNativePortReferences.filter(value => value === kind).length
    if (count !== 1) throw new Error(`Expected one nativePort ${kind}, found ${count}`)
}
'@
Push-Location -LiteralPath 'extension'
try {
    $senderAuditResult=Invoke-PlanERedirectedWriter -FilePath $script:PlanENodeCommand -ArgumentList @() -ExpectedWorkingDirectory (Get-Location).Path -StandardInput $senderAudit
    if ($senderAuditResult.exit_code -ne 0) { throw "Service Worker Native sender AST audit failed`n$($senderAuditResult.stderr)" }
} finally {
    Pop-Location
}
& git grep -n -E '\bauthorize\??:|deps\.authorize|AnalyzeAuthorizationDecision|rootPathExplicit' -- extension/src
if ($LASTEXITCODE -eq 0) { throw 'Stale Analyze authorization/Root marker contract remains' }
if ($LASTEXITCODE -ne 1) { throw 'Stale Analyze contract scan failed' }
& git grep -n -E 'mergeRootPathOverride|setRootPathOverride|useState.*rootPathOverride|rootPathOverride.*useState' -- extension/src
if ($LASTEXITCODE -eq 0) { throw 'Persistent Root override state remains' }
if ($LASTEXITCODE -ne 1) { throw 'Persistent Root state scan failed' }
$ownerWarningMatches=@(& git grep -l -E 'dh_latest_analysis_owner|analysis_result_not_persisted|analysis_pending_cleanup_failed' -- extension/src)
if ($LASTEXITCODE -ne 0) { throw 'Analysis owner/warning inventory scan failed' }
foreach ($path in @(
    'extension/src/utils/analysisStore.ts',
    'extension/src/components/FAB.tsx'
)) {
    if ($ownerWarningMatches -cnotcontains $path) { throw "Analysis owner/warning inventory omits $path" }
}
$extensionWarningMatches=@(& git grep -l -F 'extension_warnings' -- extension/src)
if ($LASTEXITCODE -ne 0 -or $extensionWarningMatches -cnotcontains 'extension/src/background/analyzeBridge.ts') {
    throw 'Extension warning Extension inventory is incomplete'
}
& git grep -n -F 'extension_warnings' -- host
if ($LASTEXITCODE -eq 0) { throw 'Extension warning metadata reached Host source' }
if ($LASTEXITCODE -ne 1) { throw 'Extension warning Host scan failed' }
& git grep -n -F "kind: 'remove'" -- extension/src/components/Options.tsx
if ($LASTEXITCODE -eq 0) { throw 'Obsolete bookmark remove intent remains' }
if ($LASTEXITCODE -ne 1) { throw 'Bookmark remove-intent scan failed' }
$rootMarkerMatches=@(& git grep -l -F 'rootPathOverrideProvided' -- extension/src host/dh_native_host.py host/test_session_workspace.py)
if ($LASTEXITCODE -ne 0) { throw 'Root marker inventory scan failed' }
foreach ($path in @(
    'extension/src/utils/analyzeRequest.ts',
    'extension/src/background/analyzeBridge.ts',
    'extension/src/components/FAB.tsx',
    'host/dh_native_host.py',
    'host/test_session_workspace.py'
)) {
    if ($rootMarkerMatches -cnotcontains $path) { throw "Root marker inventory omits $path" }
}
foreach ($literal in @(
    '_replace_path = os.replace',
    '_sleep = time.sleep',
    '_is_windows = os.name == "nt"',
    'PROMOTION_RETRY_DELAYS = (0.05, 0.2)',
    'PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))'
)) {
    $matches=@(& git grep -n -F $literal -- host/update_engine.py)
    if ($LASTEXITCODE -ne 0 -or $matches.Count -ne 1) {
        throw "Windows promotion retry literal is not unique: $literal"
    }
}
$productionHelper=@(& git grep -n -F 'def _require_preparing_promotion_candidate' -- host/update_engine.py)
if ($LASTEXITCODE -ne 0 -or $productionHelper.Count -ne 1) {
    throw 'Preparing promotion revalidation helper is not uniquely defined'
}
$promotionMethod=@(& git grep -n -F 'def _promote_preparing_with_retry' -- host/update_engine.py)
if ($LASTEXITCODE -ne 0 -or $promotionMethod.Count -ne 1) {
    throw 'Preparing promotion retry method is not uniquely defined'
}
foreach ($testName in @(
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once',
    'test_update_engine_constructor_signature_remains_frozen'
)) {
    $matches=@(& git grep -n -F "def $testName" -- host/test_update_engine_resume.py)
    if ($LASTEXITCODE -ne 0 -or $matches.Count -ne 1) {
        throw "Promotion retry test is missing or duplicated: $testName"
    }
}
$committedPlan=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for static AST audit' }
$auditMatch=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_AST_AUDIT_START -->\n```python\n(.*?)\n```\n<!-- PROMOTION_AST_AUDIT_END -->')
if (-not $auditMatch.Success) { throw 'Promotion AST audit contract missing during static scan' }
$auditMatch.Groups[1].Value | & 'host\venv\Scripts\python.exe' -
if ($LASTEXITCODE -ne 0) { throw 'Promotion AST audit failed during static scan' }
```
<!-- REVIEWED_HEAD_STATIC_AUDIT_END -->

<!-- PROMOTION_AST_AUDIT_START -->
```python
import ast
import subprocess
from pathlib import Path

tree = ast.parse(Path('host/update_engine.py').read_text(encoding='utf-8'))
source = Path('host/update_engine.py').read_text(encoding='utf-8')
plan_source = Path('docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md').read_text(encoding='utf-8')
def require(condition, message):
    if not condition:
        raise RuntimeError(message)
engine = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == 'UpdateEngine')
methods = {node.name: node for node in engine.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
constructor = methods['__init__']
require([arg.arg for arg in constructor.args.args] == ['self', 'install_root'], 'constructor positional args')
require([arg.arg for arg in constructor.args.kwonlyargs] == ['mutex_factory', 'hooks'], 'constructor keyword args')
require(len(constructor.args.kw_defaults) == 2, 'constructor defaults')
require(constructor.args.posonlyargs == [], 'constructor positional-only args')
require(constructor.args.vararg is None and constructor.args.kwarg is None, 'constructor variadic args')
require(ast.unparse(constructor.args.kw_defaults[0]) == 'create_windows_mutation_mutex', 'mutex default')
require(ast.unparse(constructor.args.kw_defaults[1]) == 'None', 'hooks default')
base_source = subprocess.check_output(
    ['git','show','0dbb4852931b50153fb898b03129ae0092c46404:host/update_engine.py'],
    text=True,
    encoding='utf-8',
)
base_tree=ast.parse(base_source)
base_engine=next(node for node in base_tree.body if isinstance(node,ast.ClassDef) and node.name == 'UpdateEngine')
base_methods={node.name:node for node in base_engine.body if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef))}
require(
    ast.dump(constructor,include_attributes=False)
    == ast.dump(base_methods['__init__'],include_attributes=False),
    'constructor differs from immutable base',
)
promotion = methods['_promote_preparing_with_retry']
require([arg.arg for arg in promotion.args.args] == [
    'self','package','candidate','candidate_bytes','paths','staging'
], 'promotion signature')
validator = methods['_require_preparing_promotion_candidate']
require([arg.arg for arg in validator.args.args] == [
    'self','package','candidate','candidate_bytes','paths','staging'
], 'validator signature')

replace_calls = []
sleep_calls = []
direct_os_replace = []
for node in ast.walk(promotion):
    if not isinstance(node, ast.Call):
        continue
    if isinstance(node.func, ast.Name) and node.func.id == '_replace_path':
        replace_calls.append(node)
    if isinstance(node.func, ast.Name) and node.func.id == '_sleep':
        sleep_calls.append(node)
    if (
        isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == 'os'
        and node.func.attr == 'replace'
    ):
        direct_os_replace.append(node)
require(len(replace_calls) == 1, 'replace call count')
require(len(sleep_calls) == 1, 'sleep call count')
require(direct_os_replace == [], 'direct os.replace in promotion')
replace = replace_calls[0]
require(
    [ast.unparse(argument) for argument in replace.args]
    == ['paths.preparing_root','paths.transaction_root'],
    'replace arguments',
)
resume = methods['_resume_preparation']
resume_calls = [
    node for node in ast.walk(resume)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Attribute)
    and isinstance(node.func.value, ast.Name)
    and node.func.value.id == 'self'
    and node.func.attr == '_promote_preparing_with_retry'
]
require(len(resume_calls) == 1, 'resume promotion call count')
promotion_source = ast.get_source_segment(
    source, promotion
)
import re
promotion_contract = re.search(
    r'(?s)<!-- PROMOTION_METHOD_START -->\n```py\n(.*?)\n```\n<!-- PROMOTION_METHOD_END -->',
    plan_source,
)
require(promotion_contract is not None, 'promotion method contract missing from plan')
production_method = ast.dump(ast.parse(promotion_source).body[0], include_attributes=False)
contract_method = ast.dump(ast.parse(promotion_contract.group(1)).body[0], include_attributes=False)
require(production_method == contract_method, 'production promotion method differs from committed plan')
validator_contract = re.search(
    r'(?s)<!-- PROMOTION_VALIDATOR_START -->\n```py\n(.*?)\n```\n<!-- PROMOTION_VALIDATOR_END -->',
    plan_source,
)
require(validator_contract is not None, 'promotion validator contract missing from plan')
production_validator = ast.dump(validator, include_attributes=False)
contract_validator = ast.dump(
    ast.parse(validator_contract.group(1)).body[0],
    include_attributes=False,
)
require(
    production_validator == contract_validator,
    'production promotion validator differs from committed plan',
)
require(promotion_source.count('_require_preparing_promotion_candidate') == 3, 'checkpoint helper call count')
markers=[
    '# promotion-checkpoint: initial',
    '# promotion-checkpoint: pre-sleep',
    '# promotion-checkpoint: post-sleep',
]
positions=[promotion_source.find(marker) for marker in markers]
require(all(position >= 0 for position in positions) and positions == sorted(positions), 'checkpoint marker order')
require('type(winerror) is not int' in promotion_source, 'exact winerror type check')
require('for attempt in range(1 + len(PROMOTION_RETRY_DELAYS))' in promotion_source, 'retry bound')
require('delay = PROMOTION_RETRY_DELAYS[attempt]' in promotion_source, 'delay selection')
require('_sleep(delay)' in promotion_source, 'sleep use')
require('_is_windows' in promotion_source, 'Windows discriminator use')
require('PROMOTION_TRANSIENT_WINERRORS' in promotion_source, 'winerror allowlist use')
for forbidden in ('shutil.copy','shutil.move','os.rename','copytree','rmtree'):
    require(forbidden not in promotion_source, f'forbidden promotion fallback: {forbidden}')
run_operation = methods['_run_operation']
run_source=ast.get_source_segment(source,run_operation)
require('before_filesystem_operation' in run_source and 'after_filesystem_operation' in run_source, 'hook wrapper')
require(
    ast.dump(run_operation,include_attributes=False)
    == ast.dump(base_methods['_run_operation'],include_attributes=False),
    'operation hook wrapper differs from immutable base',
)
resume_source=ast.get_source_segment(source,resume)
promote_position=resume_source.find('self._promote_preparing_with_retry')
active_position=resume_source.find('"active:write"')
require(promote_position >= 0 and active_position > promote_position, 'active write ordering')

test_source=Path('host/test_update_engine_resume.py').read_text(encoding='utf-8')
test_tree=ast.parse(test_source)
production_test_class=next(
    node for node in test_tree.body
    if isinstance(node, ast.ClassDef) and node.name == 'PreparingPromotionRetryTests'
)
test_class_contract=re.search(
    r'(?s)<!-- PROMOTION_TEST_CLASS_START -->\n```python\n(.*?)\n```\n<!-- PROMOTION_TEST_CLASS_END -->',
    plan_source,
)
require(test_class_contract is not None, 'promotion test class contract missing from plan')
contract_test_class=ast.parse(test_class_contract.group(1)).body[0]
require(
    ast.dump(production_test_class,include_attributes=False)
    == ast.dump(contract_test_class,include_attributes=False),
    'production promotion test class differs from committed plan',
)
class_map_test=next(
    node for node in ast.walk(test_tree)
    if isinstance(node, ast.FunctionDef) and node.name == 'test_unittest_class_map_is_exact'
)
class_map_source=ast.get_source_segment(test_source,class_map_test)
require('PreparingPromotionRetryTests' in class_map_source, 'class map omits promotion tests')
```
<!-- PROMOTION_AST_AUDIT_END -->

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
$committedPlan=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
$auditMatch=[regex]::Match($committedPlan,'(?s)<!-- PROMOTION_AST_AUDIT_START -->\n```python\n(.*?)\n```\n<!-- PROMOTION_AST_AUDIT_END -->')
if (-not $auditMatch.Success) { throw 'Promotion AST audit contract missing' }
$promotionAudit=$auditMatch.Groups[1].Value
$recordPath='.superpowers/sdd/promotion-ast.sha256'
$existingRecord=[IO.File]::ReadAllText((Join-Path (Get-Location) $recordPath),[Text.UTF8Encoding]::new($false)).Trim()
$expectedAuditHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($promotionAudit))).ToLowerInvariant()
$expectedEngineHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/update_engine.py').Hash.ToLowerInvariant()
$expectedTestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/test_update_engine_resume.py').Hash.ToLowerInvariant()
if ($existingRecord -cne "$expectedAuditHash $expectedEngineHash $expectedTestHash") {
    throw 'Pre-commit promotion AST record does not match committed Host blobs'
}
$promotionAudit | & 'host\venv\Scripts\python.exe' -
if ($LASTEXITCODE -ne 0) { throw 'Promotion retry AST/constructor audit failed' }
```

Expected:

- first scan returns no parser-boundary coercion/serialization matches;
- the handler purity scan returns no Chrome, Service Worker, Native-port, telemetry, or context-menu dependency;
- Service Worker contains `handleAnalyzeRequest` and no direct `handleAnalyzeForward`, proving the pure handler is its Analyze routing seam;
- Service Worker and handler both name `acquireAuthorizedTransport`; no stale callback-authorization or `rootPathExplicit` contract remains;
- no duplicate `analysisField`/`ownField` source classifier remains; all generic own-data consumers use Task 1's helper;
- the Native wire helper has no spread/`Object.assign`; the TypeScript AST audit proves `sendNativeMessage` contains no spread or `Object.assign` under any alias, Service Worker invokes the helper exactly once, has no direct `nativePort.postMessage`, and has exactly one captured `port.postMessage(message)` production adapter;
- obsolete persistent Root state/helper symbols (`mergeRootPathOverride`, `setRootPathOverride`, or `useState` sharing a line with `rootPathOverride`) return no matches; locked `AnalyzeInvocation.rootPathOverride` type/property references are not searched and are allowed;
- owner/warning codes appear only in typed storage/bridge/tests/UI mapping;
- `extension_warnings` appears only in Extension response handling/tests and never in Host-bound payload construction or `host/`;
- the fixed-string `git grep` scan returns no match and exit code 1, proving the obsolete bookmark queue variant `{ kind: 'remove' }` is gone from tracked `Options.tsx`; other legitimate storage removals are outside this precise gate;
- explicit Root marker appears in request assembly and Host compatibility tests/handler only.
- Windows promotion retry uses exactly the three private seams, `0.05/0.2`
  delays, exact `5/32/33` allowlist, one complete revalidation helper, and focused
  retry/checkpoint/constructor tests; no public constructor parameter or
  non-atomic fallback appears.

Also run:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$integrationBase='0dbb4852931b50153fb898b03129ae0092c46404'
$rangeHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $rangeHead.Count -ne 1) {
    throw 'Could not resolve Plan E range head'
}
$rangeHead=$rangeHead[0].Trim()
if ($rangeHead -notmatch '^[0-9a-f]{40}$') { throw 'Invalid Plan E range head' }
if ($rangeHead -cne $script:PlanEReviewedHead) { throw 'Diff gate head differs from lease' }
$range="$integrationBase..$rangeHead"
git diff --check $range
if ($LASTEXITCODE -ne 0) { throw 'Plan E range diff check failed' }
git diff --exit-code $range -- extension/package.json extension/package-lock.json extension/manifest.json
if ($LASTEXITCODE -ne 0) { throw 'Plan E changed version/dependency files' }
$planDSentinels=@('extension/src/background/nativePortClient.ts','extension/src/background/hostGate.ts','extension/src/background/updateProtocol.ts','extension/src/background/updateCoordinator.ts','extension/src/background/serviceWorker.update.test.ts')
foreach ($path in $planDSentinels) {
    if (Test-Path -LiteralPath $path) { throw "Plan D sentinel appeared: $path" }
}
```

Expected: Plan E-only range passes diff check, has no version/dependency diff, and Plan D remains unstarted.

Create the one canonical reviewed-head verification artifact only after focused
and full Extension, all Host phases, TypeScript, build, static, and diff gates
have passed. This block revalidates every machine result rather than trusting an
earlier shell status. It reruns TypeScript, build, the exact committed static
audit above, and diff checks against the same resolved head; it inventories every
tracked tested-source blob as `path -> git blob SHA`. Write a temporary canonical
JSON file and atomically promote it only after strict reread. If either temporary
or final path already exists, run the documented mutable-result reset first.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$resultPath='.superpowers/sdd/reviewed-head-verification.json'
$tempPath=Join-Path $script:PlanETempRoot 'reviewed-head-verification.tmp'
if ((Test-Path -LiteralPath $resultPath) -or (Test-Path -LiteralPath $tempPath)) {
    throw 'Reviewed-head verification result or temporary already exists'
}
$reviewedHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $reviewedHead.Count -ne 1 -or $reviewedHead[0].Trim() -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve reviewed verification head'
}
    $reviewedHead=$reviewedHead[0].Trim()
if ($reviewedHead -cne $script:PlanEReviewedHead) { throw 'Reviewed-head verification differs from the lease head' }
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$sourcePaths=@(& git ls-tree -r --name-only $reviewedHead -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $sourcePaths.Count -lt 1 -or
    ($sourcePaths -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Reviewed verification source is not globally clean at reviewed HEAD' }
$sourceBlobs=[ordered]@{}
foreach ($path in $sourcePaths) {
    $blob=@(& git rev-parse "$reviewedHead`:$path")
    if ($LASTEXITCODE -ne 0 -or $blob.Count -ne 1 -or $blob[0].Trim() -notmatch '^[0-9a-f]{40}$') {
        throw "Could not resolve reviewed source blob: $path"
    }
    $workingBlob=@(& git hash-object -- $path)
    if ($LASTEXITCODE -ne 0 -or $workingBlob.Count -ne 1 -or $workingBlob[0].Trim() -cne $blob[0].Trim()) {
        throw "Working tested source differs from reviewed blob: $path"
    }
    $sourceBlobs[$path]=$blob[0].Trim()
}
$strictResults=@'
import json,pathlib,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
def validate_counts(value,rows,name):
    required={'numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests'}
    if not required.issubset(value): raise SystemExit(name+' missing counter')
    for key,counter in value.items():
        if key.startswith('num') and (type(counter) is not int or counter<0): raise SystemExit(name+' invalid counter '+key)
    if value['numTotalTestSuites']!=value['numPassedTestSuites']+value['numFailedTestSuites']+value['numPendingTestSuites']: raise SystemExit(name+' suite counter relationship')
    if value['numTotalTests']!=value['numPassedTests']+value['numFailedTests']+value['numPendingTests']+value['numTodoTests']: raise SystemExit(name+' test counter relationship')
    if value['numTotalTestSuites']<len(rows) or value['numPassedTestSuites']!=value['numTotalTestSuites']: raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
def load(path):
    text=pathlib.Path(path).read_text(encoding='utf-8')
    value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
    if '\r' in text or text.startswith('\ufeff') or text!=json.dumps(value,ensure_ascii=True,allow_nan=False,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(path+' noncanonical')
    return value
focused_aggregate,full,host=map(load,sys.argv[1:4])
head=sys.argv[4]
args=sys.argv[5:]
task6_index=args.index('--task-6'); task7_index=args.index('--task-7'); full_index=args.index('--full')
expected={
    'plan_e_focused':args[:task6_index],
    'task_6_current':args[task6_index+1:task7_index],
    'task_7_current':args[task7_index+1:full_index],
    'full':args[full_index+1:],
}
if type(focused_aggregate) is not dict or set(focused_aggregate)!={'reviewed_head','schema_version','suites'} or type(focused_aggregate.get('schema_version')) is not int or focused_aggregate.get('schema_version')!=1 or focused_aggregate.get('reviewed_head')!=head: raise SystemExit('focused aggregate shape/head')
suites=focused_aggregate.get('suites')
if type(suites) is not dict or list(suites)!=['plan_e_focused','task_6_current','task_7_current']: raise SystemExit('focused aggregate suite inventory')
for name,value in list(suites.items())+[('full',full)]:
    if type(value) is not dict: raise SystemExit(name+' shape')
    if name=='full' and value.get('reviewed_head')!=head: raise SystemExit(name+' head')
    rows=value.get('testResults')
    if type(rows) is not list or not rows or any(type(row) is not dict for row in rows): raise SystemExit(name+' rows')
    validate_counts(value,rows,name)
    keys=[json.dumps(row,sort_keys=True,separators=(',',':')) for row in rows]
    if len(keys)!=len(set(keys)): raise SystemExit(name+' duplicate row')
    def rel(row):
        path=row.get('name')
        if type(path) is not str: raise SystemExit(name+' path type')
        path=path.replace('\\','/')
        return path.rsplit('/extension/',1)[1] if '/extension/' in path else path.removeprefix('extension/')
    observed=[rel(row) for row in rows]
    if len(observed)!=len(set(observed)) or len(expected[name])!=len(set(expected[name])) or set(observed)!=set(expected[name]) or len(observed)!=len(expected[name]): raise SystemExit(name+' inventory')
    if value.get('success') is not True or value.get('numFailedTests')!=0 or value.get('numFailedTestSuites')!=0 or value.get('numPendingTests')!=0 or value.get('numPendingTestSuites')!=0 or value.get('numTodoTests')!=0: raise SystemExit(name+' status')
    if value.get('numTotalTests')!=value.get('numPassedTests') or value.get('numTotalTests',0)<1: raise SystemExit(name+' totals')
    for row in rows:
        if row.get('status')!='passed': raise SystemExit(name+' suite status')
        assertions=row.get('assertionResults')
        if type(assertions) is not list or not assertions or any(type(item) is not dict or item.get('status')!='passed' for item in assertions): raise SystemExit(name+' pending/todo/skipped test')
authorized=[{'selector':'host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation','reason':'DH_PLAN_C_FROZEN_ONEDIR not set'}]
expected_skips={'focused':[],'task_7_current':[],'full':authorized,'update_engine':[],'recovery':authorized,'package':[]}
if type(host) is not dict or set(host)!={'schema_version','reviewed_head','focused','task_7_current','full','compile','update_engine','recovery','package'} or type(host.get('schema_version')) is not int or host.get('schema_version')!=1 or host.get('reviewed_head')!=head or host.get('compile')!='passed': raise SystemExit('host shape/head')
for name,skips in expected_skips.items():
    row=host.get(name)
    if type(row) is not dict or set(row)!={'tests','skipped','skips','passed_selectors'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or row['skipped']!=len(skips) or row.get('skips')!=skips or type(row.get('passed_selectors')) is not list or row['passed_selectors']!=sorted(row['passed_selectors']) or len(row['passed_selectors'])!=len(set(row['passed_selectors'])) or len(row['passed_selectors'])!=row['tests']-row['skipped']: raise SystemExit(name+' host skips/count/selectors')
print(json.dumps({'focused_extension':{name:{'files':len(value['testResults']),'tests':value['numTotalTests']} for name,value in suites.items()},'full_extension':{'files':len(full['testResults']),'tests':full['numTotalTests']},'host':{name:host[name] for name in ('focused','task_7_current','full','update_engine','recovery','package')}},sort_keys=True,separators=(',',':')))
'@
$expectedFocused=@(
    'src/utils/ownData.test.ts','src/utils/bookmarkItems.test.ts','src/components/Options.test.tsx',
    'src/components/MenuLogic.teamCache.test.ts','src/utils/teamCatalog.test.ts','src/background/teamManifestSync.test.ts',
    'src/utils/analysisStore.test.ts','src/background/analyzeBridge.test.ts','src/background/analyzeRequestHandler.test.ts',
    'src/background/nativeMessageWire.test.ts','src/hooks/useAnalysisHydration.test.ts','src/utils/promptSourceErrors.test.ts',
    'src/utils/pageIdentity.test.ts','src/utils/analyzeRequest.test.ts','src/background/contextMenu.test.ts',
    'src/components/ResultPopover.test.tsx','src/components/FAB.pageIdentity.test.tsx','src/components/FAB.analyzeRequest.test.tsx',
    'src/components/FAB.spinner.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/utils/nativeUpdateError.test.ts',
    'src/utils/configUpdateResult.test.ts','src/background/resetExtensionState.test.ts','src/content/updateErrorBridge.test.ts'
)
$expectedTask6Focused=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts')
$expectedTask7Focused=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts')
$expectedFull=@(& git ls-tree -r --name-only $reviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $expectedFull.Count -lt 1) { throw 'Could not inventory reviewed full Extension tests' }
$testSummary=@($strictResults | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' $reviewedHead @expectedFocused '--task-6' @expectedTask6Focused '--task-7' @expectedTask7Focused '--full' @expectedFull)
if ($LASTEXITCODE -ne 0 -or $testSummary.Count -ne 1) { throw 'Strict reviewed-head machine-result validation failed' }
$testSummaryValue=$testSummary[0] | ConvertFrom-Json -AsHashtable
Push-Location -LiteralPath 'extension'
try {
    $tsBuildInfo=Join-Path $script:PlanETempRoot 'tsbuildinfo-reviewed-head.tmp'
    $null=Assert-PlanERegisteredMutationPath -Path $tsBuildInfo -ExpectedPhase 'evidence'
    $tsExit=Invoke-PlanEWriter -FilePath $script:PlanENpmCommand -ArgumentList @('exec','tsc','--','--noEmit','--tsBuildInfoFile',$tsBuildInfo,'-p','tsconfig.json') -ExpectedWorkingDirectory (Get-Location).Path
    if ($tsExit -ne 0) { throw 'Reviewed-head TypeScript gate failed' }
} finally { Pop-Location }
$buildOutput=Join-Path $script:PlanETempRoot 'build-output/reviewed-head'
$null=Assert-PlanERegisteredMutationPath -Path $buildOutput -ExpectedPhase 'evidence'
$buildExit=Invoke-PlanEWriter -FilePath $script:PlanENpmCommand -ArgumentList @('run','build','--prefix','extension','--','--configLoader','runner','--outDir',$buildOutput,'--emptyOutDir') -ExpectedWorkingDirectory (Get-Location).Path
if ($buildExit -ne 0) { throw 'Reviewed-head build gate failed' }
$committedPlan=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for static audit' }
$staticMatch=[regex]::Match($committedPlan,'(?s)<!-- REVIEWED_HEAD_STATIC_AUDIT_START -->\n```powershell\n(.*?)\n```\n<!-- REVIEWED_HEAD_STATIC_AUDIT_END -->')
if (-not $staticMatch.Success) { throw 'Reviewed-head static audit contract is missing' }
$staticScript=[scriptblock]::Create($staticMatch.Groups[1].Value)
& $staticScript
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head static audit failed' }
$base='0dbb4852931b50153fb898b03129ae0092c46404'
& git diff --check "$base..$reviewedHead"
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head Plan E diff gate failed' }
& git diff --exit-code "$base..$reviewedHead" -- extension/package.json extension/package-lock.json extension/manifest.json
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head dependency/version diff gate failed' }
$dirtyAfter=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
$headAfter=@(& git rev-parse HEAD)
$sourceAfter=@(& git ls-tree -r --name-only $reviewedHead -- $testedSourceRoots)
$trackedAfter=@(& git ls-files -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $dirtyAfter.Count -ne 0 -or
    $headAfter.Count -ne 1 -or $headAfter[0].Trim() -cne $reviewedHead -or
    ($sourceAfter -join "`n") -cne ($trackedAfter -join "`n")
) { throw 'Build/static/diff gates changed reviewed head or tracked tested source' }
$results=[ordered]@{
    schema_version=1
    reviewed_head=$reviewedHead
    tested_source_roots=$testedSourceRoots
    tested_source_blobs=$sourceBlobs
    focused_extension='passed'
    full_extension='passed'
    host='passed'
    host_compile='passed'
    typescript='passed'
    build='passed'
    static='passed'
    diff='passed'
    machine_result_sha256=[ordered]@{
        focused_extension=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
        full_extension=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/full-extension-results.json').Hash.ToLowerInvariant()
        host=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/host-test-results.json').Hash.ToLowerInvariant()
    }
    test_summary=$testSummaryValue
}
$canonicalizer=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonical=@(($results | ConvertTo-Json -Depth 20 -Compress) | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $canonical.Count -ne 1) { throw 'Could not canonicalize reviewed-head verification' }
try {
    Write-PlanERegisteredText -Path $tempPath -Text ($canonical[0] + "`n") -ExpectedPhase 'evidence'
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $tempPath),[Text.UTF8Encoding]::new($false))
    $strict=@($tempText | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
    if ($LASTEXITCODE -ne 0 -or $strict.Count -ne 1 -or $tempText -cne $strict[0] + "`n" -or (Test-Path -LiteralPath $resultPath)) { throw 'Reviewed-head verification atomic promotion precondition failed' }
    Move-PlanERegisteredPath -Source $tempPath -Destination $resultPath -ExpectedPhase 'evidence'
} finally { if (Test-Path -LiteralPath $tempPath) { Remove-PlanERegisteredPath -Path $tempPath -ExpectedPhase 'evidence' } }
& git check-ignore -q -- $resultPath
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head verification result is not ignored' }
Register-PlanECurrentRunArtifact -Path $resultPath
```

Before either review, create and freeze both replacement audits. Audit generation
occurs only after the reviewed-head focused/full Extension result, isolated Host
result, TypeScript/build/static/diff gates, and canonical
`reviewed-head-verification.json` all pass. Immediately before audit generation,
the owner-only mutation-binding step updates only the focused-result hash after
embedding durable current-mutation output; then both artifacts freeze. That
immutable input carries exact tested-source blobs, machine hashes,
TypeScript/build/static/diff PASS states, and positive test counts; it is not
regenerated after audit freeze. Both files
use schema version `1`, evidence kind
`plan_e_task_current_state_audit`, scope
`current_immutable_commit_state_only`, and both historical reconstruction
booleans exactly `false`. `task_number` is exact integer `6` or `7`; booleans
cannot satisfy the integer check. They claim only
current immutable commit state: exact Git lineage/blobs, fresh current tests,
current disposable-worktree mutations, and current-machine evidence at one
reviewed head. Every such fact is labelled current-state/current immutable state
only. Both audits, all three test-result files, and reviewed-head verification record the same
lease-reviewed head. Audit bytes are UTF-8 without BOM, ASCII-escaped sorted
compact JSON, no CR, and exactly one final LF. Both bind `focused-extension-results.json` and
`reviewed-head-verification.json`; Task 7 additionally binds
`host-test-results.json`, while Task 6's Host hash is exactly JSON `null`. They
bind the exact `task_6_current` or `task_7_current` member of the focused-result
aggregate; the separate `plan_e_focused` member preserves the broad Plan E gate.
The aggregate also embeds each current mutation's exact failure/restoration
output text and recomputed SHA-256 values under `current_mutation_outputs`, so
mutation semantics remain durable without adding manifest paths or audit-schema
fields.
They neither establish nor deny that historical TDD occurred. The reviewed-head
verification explicitly binds TypeScript `passed` and transitively binds the
already-passed full
Extension result, which is not duplicated as another audit schema field. The
audits establish only that the missing reports can no longer prove when it
occurred; they do not recover/recreate missing report bytes, historical
RED/GREEN/mutation output, or the original reviewer timeline. Current-state
facts cannot prove test-before-production edit ordering. Current-state
mutations write only disposable detached worktrees,
never the primary checkout; every success/failure path restores and verifies the
primary process location, environment values, HEAD, status, and affected source
blobs before audit promotion. Task 6 binds exactly 9 core commits and 7 declared
paths; Task 7 binds exactly 3 core commits and 14 declared paths plus only the
related cleanup commit `e163eb28492b32b3cf743b6700eebd0bda7504cb`; Task 6
requires an empty `related_commits` array and Task 7 requires exactly that one
element. The cleanup is excluded from Task 7's core range and 14-path allowlist.
Its parent/tree/subject are `1ad75ea3891513db12a41b48ae5ccf35f32250ab`,
`0547bddb2968d3fd9d160a58d7ce74a67ad8b90c`, and
`test(fab): remove stale Root mock`; its exact `0 1` blob transition is locked
below from `95476baad531c6c8a9e9e5022f1440d49a2e299c` to
`7eed2e5a8ad30ea30c9ecd51b33bfe32293979dd` on only
`extension/src/components/FAB.pageIdentity.test.tsx`.
Both core ranges are exact `(base, head]` direct single-parent chains; no merge,
extra commit, path, or numstat row is accepted.
Task 6 base/head/tree are `ba34fb05719adeb8e5501827dc7a7398b8041aec`,
`44fdea3e6b60fd975dc150436e08ba048a744c8c`, and
`6feb60db2767d35a7886ac32b805c12174ff683f`. Task 7 base/head/tree are
`44fdea3e6b60fd975dc150436e08ba048a744c8c`,
`1ad75ea3891513db12a41b48ae5ccf35f32250ab`, and
`541caa656ccce0c3e8b2acc896269337ceecd995`.
The audit subject is always the final reviewed product head recorded in
`reviewed-head-verification.json`, never either historical task head. Its
exact tree is recorded and recomputed from Git. Its
`plan_blob` and `source_path_blobs` bind how the declared task paths exist at
that reviewed head; `implementation_lineage` separately binds the historical
task range without inventing narrative evidence. A deleted path uses JSON
`null` in both historical head blobs and reviewed-head source blobs. Task 6
contains exactly two current mutation records (busy scan disabled and direct accessor); Task 7
contains exactly one (explicit empty changed to truthy-only). Task 6's current
check is exactly `pageIdentity.test.ts`, `FAB.pageIdentity.test.tsx`,
`FAB.spinner.test.tsx`, and `useAnalysisHydration.test.ts` with four locked
titles. Task 7's is exactly seven Extension files plus
`host.test_session_workspace` and `host.test_prompt_session`, with exact
Extension title `applies an explicit empty Root to exactly one request` and four
Host selectors. First extract
the single audit program below from the committed plan. It is the sole source of
truth for the closed schemas, immutable lineage, current checks, and mutation
transformations. Its `mutation-plan`, `generate`, and `validate` modes share the
same constants, so a generator/validator split cannot silently drift.
It is embedded in this committed plan rather than an untracked helper file;
final and clean-clone gates extract these same bytes and execute `validate`.
Every top-level/nested object and check/mutation/commit/related record is closed;
unknown or missing keys, bad order/cardinality, uppercase/malformed hashes,
noncanonical UTF-8/LF bytes, duplicate keys, non-finite numbers, negative
counters, and booleans where exact integers are required are fatal.
Command argv, assertion lists, checks, mutations, core commits, and related
commits retain the literal order declared below; `required_files`, declared
paths, and mapping keys use bytewise sorted order.
Check records contain exactly evidence path/hash, argv, cwd, exit/result, ID,
required files, and required assertions. Mutation records contain exactly
transformation identity, source/before/restored hashes, argv/title, failed
assertions/failure kind, observed exit `1`, restored exit `0`, and result enum.
Check result is exact `passed`; audit JSON contains no historical GREEN label.

The validator independently recomputes report-path absence, every commit
and locked expected-hash declaration, every commit parent/tree/subject/ancestry,
exact range name-status and numstat, historical
head blobs (including deletion null), related cleanup metadata, reviewed-head
plan/source blobs, machine-evidence hashes and named tests/selectors, mutation
transform/hash/failure/restoration facts, and canonical bytes. Narrative prose
cannot override any failed machine fact.
It also requires positive suite/test/assertion counts, zero failed/pending/todo
tests, exact required file inventory membership, and every required named
assertion/Host selector exactly once.
Referenced evidence paths must exist as regular files before generation; every
validation recomputes their exact SHA-256.

<!-- PLAN_E_AUDIT_PROGRAM_START -->
```python
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys

HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
PLAN_PATH = "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
FOCUSED_PATH = ".superpowers/sdd/focused-extension-results.json"
HOST_PATH = ".superpowers/sdd/host-test-results.json"
VERIFICATION_PATH = ".superpowers/sdd/reviewed-head-verification.json"


def commit(commit_id, parent, tree, subject):
    return {
        "commit": commit_id,
        "parent": parent,
        "subject": subject,
        "tree": tree,
    }


TASKS = {
    6: {
        "report_hash": "3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef",
        "report_path": ".superpowers/sdd/task-6-report.md",
        "base": "ba34fb05719adeb8e5501827dc7a7398b8041aec",
        "head": "44fdea3e6b60fd975dc150436e08ba048a744c8c",
        "head_tree": "6feb60db2767d35a7886ac32b805c12174ff683f",
        "commits": [
            commit("c404aaf56250b522cbd038adf7c26ad689c1285d", "ba34fb05719adeb8e5501827dc7a7398b8041aec", "280717435e3e7595af9c2f3b5f1771d21f5299cf", "fix(fab): track SPA identity during analysis"),
            commit("2303482bcc9fc10953174c453acb2196675dbc27", "c404aaf56250b522cbd038adf7c26ad689c1285d", "bee2ba788d904073cfc95c43ca05c8358417bfce", "fix(fab): order SPA scans safely"),
            commit("38271fcee6738fcc7baba9eb67de5115f1a16fc7", "2303482bcc9fc10953174c453acb2196675dbc27", "ac37d20a68735c6a75dfd199e66ace98026d5005", "fix(fab): bind SPA context snapshots"),
            commit("17218fae212d80e3231898a0480124683fde84c2", "38271fcee6738fcc7baba9eb67de5115f1a16fc7", "2147cbdba413b4f228a487d466c1a3c217d53c7b", "fix(fab): bind all analyze invocations"),
            commit("c03057db34f40fa429af2bc34e41f1b320272d34", "17218fae212d80e3231898a0480124683fde84c2", "e8a670b3267dd1ab9ebf74b1b7dc954319add70d", "fix(fab): separate pending scan ownership"),
            commit("bc0f701643dfd9b8d1bf2722200b5cb3d3c22eee", "c03057db34f40fa429af2bc34e41f1b320272d34", "cbc77663b4bc995b7f3bdb88b5d074f86398866b", "fix(fab): revalidate terminal page ownership"),
            commit("8efc4f290aa3caba7b607bf97b764a073497306c", "bc0f701643dfd9b8d1bf2722200b5cb3d3c22eee", "2a2006be626e9622f723bfea539621b4346b0d6d", "fix(fab): gate local result hydration"),
            commit("932565e6ea2e21798ec0bb27b8502ae08a76ef22", "8efc4f290aa3caba7b607bf97b764a073497306c", "c491f2eca38dff6d75b8bd52c9944ece04b078ee", "fix(fab): require terminal full revalidation"),
            commit("44fdea3e6b60fd975dc150436e08ba048a744c8c", "932565e6ea2e21798ec0bb27b8502ae08a76ef22", "6feb60db2767d35a7886ac32b805c12174ff683f", "fix(fab): wake terminal scan coordinator"),
        ],
        "name_status": [
            ["A", "extension/src/components/FAB.pageIdentity.test.tsx"],
            ["M", "extension/src/components/FAB.spinner.test.tsx"],
            ["M", "extension/src/components/FAB.tsx"],
            ["M", "extension/src/hooks/useAnalysisHydration.test.ts"],
            ["M", "extension/src/hooks/useAnalysisHydration.ts"],
            ["A", "extension/src/utils/pageIdentity.test.ts"],
            ["A", "extension/src/utils/pageIdentity.ts"],
        ],
        "name_status_sorted_paths": [
            "extension/src/components/FAB.pageIdentity.test.tsx",
            "extension/src/components/FAB.spinner.test.tsx",
            "extension/src/components/FAB.tsx",
            "extension/src/hooks/useAnalysisHydration.test.ts",
            "extension/src/hooks/useAnalysisHydration.ts",
            "extension/src/utils/pageIdentity.test.ts",
            "extension/src/utils/pageIdentity.ts",
        ],
        "numstat": [
            [1560, 0, "extension/src/components/FAB.pageIdentity.test.tsx"],
            [3, 3, "extension/src/components/FAB.spinner.test.tsx"],
            [823, 269, "extension/src/components/FAB.tsx"],
            [59, 0, "extension/src/hooks/useAnalysisHydration.test.ts"],
            [4, 0, "extension/src/hooks/useAnalysisHydration.ts"],
            [177, 0, "extension/src/utils/pageIdentity.test.ts"],
            [90, 0, "extension/src/utils/pageIdentity.ts"],
        ],
        "head_blobs": {
            "extension/src/components/FAB.pageIdentity.test.tsx": "95476baad531c6c8a9e9e5022f1440d49a2e299c",
            "extension/src/components/FAB.spinner.test.tsx": "456ccf26a73f82d43a69812b9cc9d80d09b00ff5",
            "extension/src/components/FAB.tsx": "95e93bd171b3118fe9ec30fd97a00f9bd6c4c7b7",
            "extension/src/hooks/useAnalysisHydration.test.ts": "621c6880d465900002ae36dcd9ac6db39f335266",
            "extension/src/hooks/useAnalysisHydration.ts": "8dd8a0f03fc1160b560a3418b58423a34bc097b1",
            "extension/src/utils/pageIdentity.test.ts": "450e5a1563b0bd2c1373eea4ae3da0c66cca73cd",
            "extension/src/utils/pageIdentity.ts": "0e09001ac2b471e25f9c182d66e4d653e277d0f5",
        },
        "related": [],
        "checks": [
            {
                "argv": ["npm", "run", "test:run", "--prefix", "extension", "--", "src/components/FAB.pageIdentity.test.tsx", "src/components/FAB.spinner.test.tsx", "src/hooks/useAnalysisHydration.test.ts", "src/utils/pageIdentity.test.ts", "--configLoader", "runner", "--no-cache", "--reporter=verbose"],
                "cwd": ".",
                "evidence_path": FOCUSED_PATH,
                "id": "task_6_extension_current_state",
                "required_assertions": [
                    "switches identity from A to B while Analyze is busy",
                    "contains throwing identity accessors",
                    "replaces a user-edited A textarea with B after busy Analyze completes",
                    "clears A hydration while deferred B hydration is pending",
                ],
                "required_files": [
                    "extension/src/components/FAB.pageIdentity.test.tsx",
                    "extension/src/components/FAB.spinner.test.tsx",
                    "extension/src/hooks/useAnalysisHydration.test.ts",
                    "extension/src/utils/pageIdentity.test.ts",
                ],
            }
        ],
    },
    7: {
        "report_hash": "49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f",
        "report_path": ".superpowers/sdd/task-7-report.md",
        "base": "44fdea3e6b60fd975dc150436e08ba048a744c8c",
        "head": "1ad75ea3891513db12a41b48ae5ccf35f32250ab",
        "head_tree": "541caa656ccce0c3e8b2acc896269337ceecd995",
        "commits": [
            commit("edeb6a8b4ed0e831ebc7358499106eb0bc4ad135", "44fdea3e6b60fd975dc150436e08ba048a744c8c", "f71fffe06b3d174a631272b67f2a00f2b5dffb95", "fix(analysis): scope Root override to one request"),
            commit("d7006450df0c672e31e812148a274b8a5e6e5c76", "edeb6a8b4ed0e831ebc7358499106eb0bc4ad135", "0d8af407f5b58da11d9e654c1797979c863f1755", "fix(analysis): snapshot latest preference Root"),
            commit("1ad75ea3891513db12a41b48ae5ccf35f32250ab", "d7006450df0c672e31e812148a274b8a5e6e5c76", "541caa656ccce0c3e8b2acc896269337ceecd995", "fix(analysis): preserve title page ownership"),
        ],
        "name_status": [
            ["A", "extension/src/background/contextMenu.test.ts"],
            ["M", "extension/src/background/contextMenu.ts"],
            ["A", "extension/src/components/FAB.analyzeRequest.test.tsx"],
            ["M", "extension/src/components/FAB.bookmarkTelemetry.test.tsx"],
            ["M", "extension/src/components/FAB.promptSourceErrors.test.tsx"],
            ["D", "extension/src/components/FAB.rootPathOverride.test.ts"],
            ["M", "extension/src/components/FAB.spinner.test.tsx"],
            ["M", "extension/src/components/FAB.tsx"],
            ["M", "extension/src/components/FAB.userPrompt.test.tsx"],
            ["A", "extension/src/utils/analyzeRequest.test.ts"],
            ["A", "extension/src/utils/analyzeRequest.ts"],
            ["M", "extension/src/utils/prefs.ts"],
            ["M", "host/dh_native_host.py"],
            ["M", "host/test_session_workspace.py"],
        ],
        "name_status_sorted_paths": [
            "extension/src/background/contextMenu.test.ts",
            "extension/src/background/contextMenu.ts",
            "extension/src/components/FAB.analyzeRequest.test.tsx",
            "extension/src/components/FAB.bookmarkTelemetry.test.tsx",
            "extension/src/components/FAB.promptSourceErrors.test.tsx",
            "extension/src/components/FAB.rootPathOverride.test.ts",
            "extension/src/components/FAB.spinner.test.tsx",
            "extension/src/components/FAB.tsx",
            "extension/src/components/FAB.userPrompt.test.tsx",
            "extension/src/utils/analyzeRequest.test.ts",
            "extension/src/utils/analyzeRequest.ts",
            "extension/src/utils/prefs.ts",
            "host/dh_native_host.py",
            "host/test_session_workspace.py",
        ],
        "numstat": [
            [145, 0, "extension/src/background/contextMenu.test.ts"],
            [73, 45, "extension/src/background/contextMenu.ts"],
            [582, 0, "extension/src/components/FAB.analyzeRequest.test.tsx"],
            [0, 1, "extension/src/components/FAB.bookmarkTelemetry.test.tsx"],
            [0, 2, "extension/src/components/FAB.promptSourceErrors.test.tsx"],
            [0, 112, "extension/src/components/FAB.rootPathOverride.test.ts"],
            [0, 1, "extension/src/components/FAB.spinner.test.tsx"],
            [83, 72, "extension/src/components/FAB.tsx"],
            [0, 2, "extension/src/components/FAB.userPrompt.test.tsx"],
            [213, 0, "extension/src/utils/analyzeRequest.test.ts"],
            [77, 0, "extension/src/utils/analyzeRequest.ts"],
            [0, 34, "extension/src/utils/prefs.ts"],
            [10, 1, "host/dh_native_host.py"],
            [118, 0, "host/test_session_workspace.py"],
        ],
        "head_blobs": {
            "extension/src/background/contextMenu.test.ts": "61c63a4603b0104830df46c9d6d7311f496975ee",
            "extension/src/background/contextMenu.ts": "cd0874b625f039fdb8a71958ab71bb9a4e0cc0d1",
            "extension/src/components/FAB.analyzeRequest.test.tsx": "a15179b4f9a117431cefba54c29821785473a708",
            "extension/src/components/FAB.bookmarkTelemetry.test.tsx": "409a262fada0798ad4904cd957a012b31ef4bf2c",
            "extension/src/components/FAB.promptSourceErrors.test.tsx": "cffb2f50c49b93b7a5618bb4dedfe27c4f8a67a8",
            "extension/src/components/FAB.rootPathOverride.test.ts": None,
            "extension/src/components/FAB.spinner.test.tsx": "820337d8e233ff80ca35e49f79bbf1a159627edd",
            "extension/src/components/FAB.tsx": "d8d6f975b60964c187ff59d9bdbbc8e5b6ff1563",
            "extension/src/components/FAB.userPrompt.test.tsx": "e93d47e8bc9f8f8dbb5ee6fafd089daeb83c81d0",
            "extension/src/utils/analyzeRequest.test.ts": "c987aab132eed654855f8b4789e90d444c0faf40",
            "extension/src/utils/analyzeRequest.ts": "fdcf1d19719617e65786eb03e6e017e4eaf16671",
            "extension/src/utils/prefs.ts": "0c6c726b0a745401f94d109234e33becf0c045a2",
            "host/dh_native_host.py": "97775bb9ebbfcd60eb5cb833ad132fe742256e30",
            "host/test_session_workspace.py": "6d19653e33a1f3d89c8cb0d1f9cf35b03d33fd6e",
        },
        "related": [
            {
                "after_blobs": {"extension/src/components/FAB.pageIdentity.test.tsx": "7eed2e5a8ad30ea30c9ecd51b33bfe32293979dd"},
                "before_blobs": {"extension/src/components/FAB.pageIdentity.test.tsx": "95476baad531c6c8a9e9e5022f1440d49a2e299c"},
                "commit": "e163eb28492b32b3cf743b6700eebd0bda7504cb",
                "diff_numstat": [{"added": 0, "deleted": 1, "path": "extension/src/components/FAB.pageIdentity.test.tsx"}],
                "parent": "1ad75ea3891513db12a41b48ae5ccf35f32250ab",
                "paths": ["extension/src/components/FAB.pageIdentity.test.tsx"],
                "subject": "test(fab): remove stale Root mock",
                "tree": "0547bddb2968d3fd9d160a58d7ce74a67ad8b90c",
            }
        ],
        "checks": [
            {
                "argv": ["npm", "run", "test:run", "--prefix", "extension", "--", "src/background/contextMenu.test.ts", "src/components/FAB.analyzeRequest.test.tsx", "src/components/FAB.bookmarkTelemetry.test.tsx", "src/components/FAB.promptSourceErrors.test.tsx", "src/components/FAB.spinner.test.tsx", "src/components/FAB.userPrompt.test.tsx", "src/utils/analyzeRequest.test.ts", "--configLoader", "runner", "--no-cache", "--reporter=verbose"],
                "cwd": ".",
                "evidence_path": FOCUSED_PATH,
                "id": "task_7_extension_current_state",
                "required_assertions": ["applies an explicit empty Root to exactly one request"],
                "required_files": [
                    "extension/src/background/contextMenu.test.ts",
                    "extension/src/components/FAB.analyzeRequest.test.tsx",
                    "extension/src/components/FAB.bookmarkTelemetry.test.tsx",
                    "extension/src/components/FAB.promptSourceErrors.test.tsx",
                    "extension/src/components/FAB.spinner.test.tsx",
                    "extension/src/components/FAB.userPrompt.test.tsx",
                    "extension/src/utils/analyzeRequest.test.ts",
                ],
            },
            {
                "argv": ["host/venv/Scripts/python.exe", "-m", "unittest", "host.test_session_workspace", "host.test_prompt_session", "-v"],
                "cwd": ".",
                "evidence_path": HOST_PATH,
                "id": "task_7_host_current_state",
                "required_assertions": [
                    "TestSessionIdentityLifecycle.test_explicit_empty_analyze_root_overrides_config_for_one_request",
                    "TestSessionIdentityLifecycle.test_request_after_explicit_empty_without_marker_uses_configured_root",
                    "TestSessionIdentityLifecycle.test_malformed_explicit_marker_uses_legacy_fallback",
                    "TestSessionIdentityLifecycle.test_explicit_marker_with_non_string_root_uses_legacy_fallback",
                ],
                "required_files": ["host/test_prompt_session.py", "host/test_session_workspace.py"],
            },
        ],
    },
}

MUTATIONS = [
    {
        "task": 6,
        "worktree_name": "task-6-busy",
        "id": "task_6_busy_identity_scan_disabled",
        "source_path": "extension/src/components/FAB.tsx",
        "transformation": "replace_busy_identity_scan_with_early_return",
        "old": """                if (localAnalyzeRequestIdRef.current || isOpen) {
                    if (localAnalyzeRequestIdRef.current) {
                        applyIdentityScan(scan.fresh);
                    }
                    return;
                }""",
        "new": """                if (localAnalyzeRequestIdRef.current || isOpen) return;""",
        "test_argv": ["C:/Program Files/nodejs/node.exe", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/node_modules/vitest/vitest.mjs", "--root", "extension", "--config", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/vitest.config.ts", "src/components/FAB.pageIdentity.test.tsx", "-t", "switches identity from A to B while Analyze is busy", "--reporter=verbose"],
        "test_title": "switches identity from A to B while Analyze is busy",
    },
    {
        "task": 6,
        "worktree_name": "task-6-accessor",
        "id": "task_6_direct_identity_accessor",
        "source_path": "extension/src/components/FAB.tsx",
        "transformation": "replace_descriptor_safe_identity_parser_with_direct_accessor",
        "old": "        const parsed = parsePageIdentitySnapshot(fresh);",
        "new": """        const parsed = (() => {
            try {
                const caseNumber = (fresh as { caseNumber?: unknown }).caseNumber;
                return typeof caseNumber === 'string'
                    ? {
                        identity: caseNumber.length > 0
                            ? `case:${caseNumber}` as PageIdentity
                            : null,
                        caseNumber,
                    }
                    : null;
            } catch {
                return null;
            }
        })();""",
        "test_argv": ["C:/Program Files/nodejs/node.exe", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/node_modules/vitest/vitest.mjs", "--root", "extension", "--config", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/vitest.config.ts", "src/components/FAB.pageIdentity.test.tsx", "-t", "contains throwing identity accessors", "--reporter=verbose"],
        "test_title": "contains throwing identity accessors",
    },
    {
        "task": 7,
        "worktree_name": "task-7-explicit-empty",
        "id": "task_7_explicit_empty_truthy_only",
        "source_path": "extension/src/utils/analyzeRequest.ts",
        "transformation": "require_nonempty_root_override",
        "old": """    const rootPathOverrideProvided = override.kind === 'value'
        && typeof override.value === 'string'""",
        "new": """    const rootPathOverrideProvided = override.kind === 'value'
        && typeof override.value === 'string'
        && override.value.length > 0""",
        "test_argv": ["C:/Program Files/nodejs/node.exe", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/node_modules/vitest/vitest.mjs", "--root", "extension", "--config", "C:/MyWorkbench/Repository/Dynamics-Helper-prompt-scope-spec/extension/vitest.config.ts", "src/components/FAB.analyzeRequest.test.tsx", "-t", "applies an explicit empty Root to exactly one request", "--reporter=verbose"],
        "test_title": "applies an explicit empty Root to exactly one request",
    },
]
MUTATIONS = sorted(MUTATIONS, key=lambda row: row["id"])

TOP_KEYS = ["audit_subject", "claim_boundary", "evidence_kind", "historical_report", "implementation_lineage", "required_independent_reviews", "schema_version", "task_number", "verification"]
AUDIT_SUBJECT_KEYS = ["commit", "plan_blob", "source_path_blobs", "tree"]
CLAIM_KEYS = ["historical_report_reconstructed", "historical_tdd_timeline_reconstructed", "scope"]
REPORT_KEYS = ["availability", "expected_sha256", "path"]
LINEAGE_KEYS = ["base_commit", "commits", "declared_paths", "diff_numstat", "head_commit", "head_path_blobs", "head_tree", "range", "related_commits"]
COMMIT_KEYS = ["commit", "parent", "subject", "tree"]
NUMSTAT_KEYS = ["added", "deleted", "path"]
RELATED_KEYS = ["after_blobs", "before_blobs", "commit", "diff_numstat", "parent", "paths", "subject", "tree"]
VERIFICATION_KEYS = ["checks", "current_mutations", "machine_evidence"]
CHECK_KEYS = ["argv", "cwd", "evidence_path", "evidence_sha256", "exit_code", "id", "required_assertions", "required_files", "result"]
MUTATION_KEYS = ["before_blob", "failed_assertions", "failure_kind", "id", "mutated_sha256", "observed_exit_code", "restored_blob", "restored_exit_code", "result", "source_path", "test_argv", "test_title", "transformation"]
MACHINE_KEYS = ["focused_extension_results_sha256", "host_test_results_sha256", "reviewed_head_verification_sha256"]


def fail(message):
    raise SystemExit(message)


def run(*args, allow_missing=False):
    result = subprocess.run(["git", *args], text=True, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        if allow_missing:
            return None
        fail("git command failed: " + " ".join(args))
    return result.stdout.rstrip("\n")


def strict_json(path):
    raw = pathlib.Path(path).read_bytes()
    if raw.startswith(b"\xef\xbb\xbf") or b"\r" in raw:
        fail(str(path) + " encoding")
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        fail(str(path) + " UTF-8")

    def pairs(rows):
        result = {}
        for key, value in rows:
            if key in result:
                fail(str(path) + " duplicate key")
            result[key] = value
        return result

    def reject(value):
        fail(str(path) + " non-finite " + value)

    value = json.loads(text, object_pairs_hook=pairs, parse_constant=reject)
    if text != canonical(value).decode("utf-8"):
        fail(str(path) + " noncanonical")
    return value


def canonical(value):
    return (json.dumps(value, ensure_ascii=True, allow_nan=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256(path):
    item = pathlib.Path(path)
    if not item.is_file() or item.is_symlink():
        fail(str(path) + " is not a regular evidence file")
    return hashlib.sha256(item.read_bytes()).hexdigest()


def object_id(commit_id, path):
    value = run("rev-parse", f"{commit_id}:{path}", allow_missing=True)
    return value if value is not None else None


def require_ancestor(ancestor, descendant, label):
    result = subprocess.run(["git", "merge-base", "--is-ancestor", ancestor, descendant])
    if result.returncode != 0:
        fail(label)


def normalize_extension_path(name):
    name = name.replace("\\", "/")
    if "/extension/" in name:
        return "extension/" + name.rsplit("/extension/", 1)[1]
    return name if name.startswith("extension/") else "extension/" + name


def check_keys(value, keys, label):
    if type(value) is not dict or set(value) != set(keys):
        fail(label + " closed keys")


def check_hash(value, regex, label):
    if type(value) is not str or regex.fullmatch(value) is None:
        fail(label + " hash")


def validate_vitest_result(value, check, expected_argv):
    if type(value) is not dict:
        fail(check["id"] + " focused result shape")
    rows = value.get("testResults")
    if type(rows) is not list or not rows or value.get("success") is not True:
        fail(check["id"] + " focused status")
    for key in ("numTotalTestSuites", "numPassedTestSuites", "numFailedTestSuites", "numPendingTestSuites", "numTotalTests", "numPassedTests", "numFailedTests", "numPendingTests", "numTodoTests"):
        if type(value.get(key)) is not int or value[key] < 0:
            fail(check["id"] + " focused counter")
    if value["numTotalTests"] < 1 or value["numPassedTests"] != value["numTotalTests"] or any(value[key] != 0 for key in ("numFailedTestSuites", "numPendingTestSuites", "numFailedTests", "numPendingTests", "numTodoTests")):
        fail(check["id"] + " focused failures")
    observed_files = []
    assertions = []
    for row in rows:
        if type(row) is not dict or row.get("status") != "passed":
            fail(check["id"] + " focused row")
        observed_files.append(normalize_extension_path(row.get("name", "")))
        for assertion in row.get("assertionResults", []):
            if type(assertion) is not dict or assertion.get("status") != "passed":
                fail(check["id"] + " assertion status")
            title = assertion.get("fullName") or assertion.get("title")
            if type(title) is not str or not title:
                fail(check["id"] + " assertion title")
            assertions.append(title)
    if len(observed_files) != len(set(observed_files)):
        fail(check["id"] + " duplicate focused file")
    if sorted(observed_files) != check["required_files"]:
        fail(check["id"] + " exact focused file inventory")
    observed_argv = ["npm", "run", "test:run", "--prefix", "extension", "--", *[path.removeprefix("extension/") for path in check["required_files"]], "--configLoader", "runner", "--no-cache", "--reporter=verbose"]
    if observed_argv != expected_argv:
        fail(check["id"] + " focused argv binding")
    for title in check["required_assertions"]:
        if sum(item == title or item.endswith(" " + title) for item in assertions) != 1:
            fail(check["id"] + " assertion identity " + title)
    if len(assertions) != value.get("numTotalTests"):
        fail(check["id"] + " assertion total")


def validate_focused(check):
    aggregate = strict_json(check["evidence_path"])
    if type(aggregate) is not dict or set(aggregate) != {"current_mutation_outputs", "reviewed_head", "schema_version", "suites"} or type(aggregate.get("schema_version")) is not int or aggregate["schema_version"] != 1:
        fail(check["id"] + " focused aggregate shape")
    verification = strict_json(VERIFICATION_PATH)
    if aggregate.get("reviewed_head") != verification.get("reviewed_head"):
        fail(check["id"] + " focused aggregate reviewed head")
    suites = aggregate.get("suites")
    if type(suites) is not dict or list(suites) != ["plan_e_focused", "task_6_current", "task_7_current"]:
        fail(check["id"] + " focused aggregate suites")
    mutation_outputs = aggregate.get("current_mutation_outputs")
    expected_output_ids = [row["id"] for row in MUTATIONS]
    if type(mutation_outputs) is not dict or list(mutation_outputs) != expected_output_ids:
        fail(check["id"] + " focused mutation-output inventory")
    for mutation in MUTATIONS:
        row = mutation_outputs[mutation["id"]]
        if type(row) is not dict or set(row) != {"failure_output", "failure_sha256", "restored_output", "restored_sha256", "test_title"}:
            fail(check["id"] + " focused mutation-output shape " + mutation["id"])
        if any(type(row.get(key)) is not str or not row[key] for key in row):
            fail(check["id"] + " focused mutation-output string " + mutation["id"])
        failure_bytes = row["failure_output"].encode("utf-8")
        restored_bytes = row["restored_output"].encode("utf-8")
        if row["failure_sha256"] != hashlib.sha256(failure_bytes).hexdigest() or row["restored_sha256"] != hashlib.sha256(restored_bytes).hexdigest() or row["test_title"] != mutation["test_title"]:
            fail(check["id"] + " focused mutation-output binding " + mutation["id"])
        failure_plain = re.sub(r"\x1b\[[0-9;]*m", "", row["failure_output"])
        restored_plain = re.sub(r"\x1b\[[0-9;]*m", "", row["restored_output"])
        if failure_plain.count(mutation["test_title"]) != 1 or len(re.findall(r"(?m)^\s*Tests\s+1 failed\b", failure_plain)) != 1 or re.search(r"(?i)(assertionerror|expected.+(?:to|not to))", failure_plain) is None:
            fail(check["id"] + " focused mutation failure semantics " + mutation["id"])
        if restored_plain.count(mutation["test_title"]) != 1 or len(re.findall(r"(?m)^\s*Tests\s+1 passed\b", restored_plain)) != 1:
            fail(check["id"] + " focused mutation restoration semantics " + mutation["id"])
    suite_name = "task_6_current" if check["id"] == "task_6_extension_current_state" else "task_7_current"
    validate_vitest_result(suites[suite_name], check, check["argv"])
    verification = strict_json(VERIFICATION_PATH)
    if verification.get("machine_result_sha256", {}).get("focused_extension") != sha256(check["evidence_path"]):
        fail(check["id"] + " focused reviewed-head hash binding")
    source_blobs = verification.get("tested_source_blobs")
    if type(source_blobs) is not dict:
        fail(check["id"] + " focused source blobs")
    for path in check["required_files"]:
        expected = object_id(verification.get("reviewed_head"), path)
        if source_blobs.get(path) != expected:
            fail(check["id"] + " focused source blob " + path)


def validate_host(check):
    value = strict_json(check["evidence_path"])
    if type(value) is not dict or value.get("compile") != "passed":
        fail(check["id"] + " host status")
    focused = value.get("focused")
    task_7_current = value.get("task_7_current")
    if type(focused) is not dict or type(task_7_current) is not dict or set(focused) != {"passed_selectors", "skipped", "skips", "tests"} or set(task_7_current) != {"passed_selectors", "skipped", "skips", "tests"}:
        fail(check["id"] + " host focused shape")
    selectors = task_7_current.get("passed_selectors")
    if type(selectors) is not list or selectors != sorted(selectors) or len(selectors) != len(set(selectors)) or type(task_7_current.get("tests")) is not int or task_7_current["tests"] < 1 or task_7_current.get("skipped") != 0 or task_7_current.get("skips") != []:
        fail(check["id"] + " host focused counters")
    if len(selectors) != task_7_current["tests"]:
        fail(check["id"] + " host selector total")
    for title in check["required_assertions"]:
        if sum(item == title or item.endswith("." + title) for item in selectors) != 1:
            fail(check["id"] + " host selector " + title)
    verification = strict_json(VERIFICATION_PATH)
    if verification.get("machine_result_sha256", {}).get("host") != sha256(check["evidence_path"]):
        fail(check["id"] + " host reviewed-head hash binding")
    source_blobs = verification.get("tested_source_blobs")
    if type(source_blobs) is not dict:
        fail(check["id"] + " host source blobs")
    for path in check["required_files"]:
        expected = object_id(verification.get("reviewed_head"), path)
        if source_blobs.get(path) != expected:
            fail(check["id"] + " host source blob " + path)


def expected_mutated_sha(mutation, subject):
    source = subprocess.check_output(["git", "show", f"{subject}:{mutation['source_path']}"], encoding="utf-8")
    if source.count(mutation["old"]) != 1:
        fail(mutation["id"] + " source transformation cardinality")
    return hashlib.sha256(source.replace(mutation["old"], mutation["new"], 1).encode("utf-8")).hexdigest()


def validate_git(task_number, value):
    spec = TASKS[task_number]
    lineage = value["implementation_lineage"]
    expected_ids = [row["commit"] for row in spec["commits"]]
    if run("cat-file", "-t", spec["base"]) != "commit" or run("cat-file", "-t", spec["head"]) != "commit":
        fail("Task base/head object types")
    observed_ids = run("rev-list", "--reverse", f"{spec['base']}..{spec['head']}").splitlines()
    if observed_ids != expected_ids:
        fail("Task lineage commit order")
    require_ancestor(spec["base"], spec["head"], "Task lineage ancestry")
    require_ancestor(spec["head"], value["audit_subject"]["commit"], "Task head is not an audit-subject ancestor")
    for expected in spec["commits"]:
        actual = run("show", "-s", "--format=%H%x09%P%x09%T%x09%s", expected["commit"]).split("\t")
        if actual != [expected["commit"], expected["parent"], expected["tree"], expected["subject"]]:
            fail("Task commit metadata " + expected["commit"])
        if len(actual[1].split()) != 1:
            fail("Task merge commit")
    for previous, current in zip(spec["commits"], spec["commits"][1:]):
        if current["parent"] != previous["commit"]:
            fail("Task direct-chain constant")
    name_status = [line.split("\t", 1) for line in run("diff", "--name-status", "--no-renames", f"{spec['base']}..{spec['head']}").splitlines()]
    if name_status != spec["name_status"]:
        fail("Task name-status")
    if sorted(path for _, path in name_status) != spec["name_status_sorted_paths"]:
        fail("Task sorted name-status path set")
    if len(name_status) != len(spec["name_status_sorted_paths"]) or len({path for _, path in name_status}) != len(name_status):
        fail("Task name-status cardinality")
    numstat = []
    for line in run("diff", "--numstat", "--no-renames", f"{spec['base']}..{spec['head']}").splitlines():
        added, deleted, path = line.split("\t", 2)
        numstat.append([int(added), int(deleted), path])
    if numstat != spec["numstat"]:
        fail("Task numstat")
    for path, expected in spec["head_blobs"].items():
        if object_id(spec["head"], path) != expected:
            fail("Task head blob " + path)
    for related in spec["related"]:
        actual = run("show", "-s", "--format=%H%x09%P%x09%T%x09%s", related["commit"]).split("\t")
        if actual != [related["commit"], related["parent"], related["tree"], related["subject"]]:
            fail("Related commit metadata")
        if len(actual[1].split()) != 1:
            fail("Related merge commit")
        paths = run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", related["commit"]).splitlines()
        if paths != related["paths"]:
            fail("Related commit paths")
        rows = []
        for line in run("diff-tree", "--no-commit-id", "--numstat", "--no-renames", "-r", related["commit"]).splitlines():
            added, deleted, path = line.split("\t", 2)
            rows.append({"added": int(added), "deleted": int(deleted), "path": path})
        if rows != related["diff_numstat"]:
            fail("Related commit numstat")
        for path, expected in related["before_blobs"].items():
            if object_id(related["parent"], path) != expected:
                fail("Related before blob")
        for path, expected in related["after_blobs"].items():
            if object_id(related["commit"], path) != expected:
                fail("Related after blob")
    subject = value["audit_subject"]["commit"]
    verification = strict_json(VERIFICATION_PATH)
    if verification.get("reviewed_head") != subject:
        fail("Audit subject does not equal reviewed-head verification")
    if run("show", "-s", "--format=%T", subject) != value["audit_subject"]["tree"]:
        fail("Audit subject tree")
    current_head = run("rev-parse", "HEAD")
    if current_head != subject:
        parents = run("show", "-s", "--format=%P", current_head).split()
        final_subject = run("show", "-s", "--format=%s", current_head)
        final_paths = run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", current_head).splitlines()
        if parents != [subject] or final_subject != "docs(verification): record Plan E hardening evidence" or len(final_paths) != 60:
            fail("Audit subject is neither current reviewed head nor exact final evidence parent")
    if object_id(subject, PLAN_PATH) != value["audit_subject"]["plan_blob"]:
        fail("Audit subject plan blob")
    amendment = "d51ca4aabd4a40b91818191424993a8d3ab3cd27"
    candidate_plans = run("rev-list", "--reverse", amendment + ".." + subject, "--", PLAN_PATH).splitlines()
    if len(candidate_plans) != 1:
        fail("Missing or later-rewritten amendment plan commit")
    plan_commit = candidate_plans[0]
    plan_parent = run("rev-parse", plan_commit + "^")
    plan_paths = run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", plan_commit).splitlines()
    if run("show", "-s", "--format=%s", plan_commit) != "docs(update): integrate Plan E evidence-loss audit" or plan_parent != amendment or plan_paths != [PLAN_PATH]:
        fail("Audit subject plan/amendment chronology")
    amendment_paths = run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", amendment).splitlines()
    if run("show", "-s", "--format=%s", amendment) != "docs(evidence): define Plan E report-loss boundary" or amendment_paths != ["docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md"]:
        fail("Accepted amendment metadata")
    post_plan_commits = run("rev-list", "--reverse", plan_commit + ".." + subject).splitlines()
    if len(post_plan_commits) < 2:
        fail("Missing promotion chronology commits")
    red_commit = post_plan_commits[0]
    implementation_commit = post_plan_commits[1]
    if run("rev-parse", red_commit + "^") != plan_commit or run("show", "-s", "--format=%s", red_commit) != "test(update): cover locked preparing promotion" or run("rev-parse", implementation_commit + "^") != red_commit or run("show", "-s", "--format=%s", implementation_commit) != "fix(update): retry locked preparing promotion":
        fail("Plan to promotion direct-child chronology")
    if run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", red_commit).splitlines() != ["host/test_update_engine_resume.py"] or run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", implementation_commit).splitlines() != ["host/update_engine.py"]:
        fail("Promotion chronology path sets")
    integration_paths = set(run("diff", "--name-only", "--no-renames", "0dbb4852931b50153fb898b03129ae0092c46404.." + implementation_commit).splitlines())
    forbidden_fix_paths = {PLAN_PATH, "docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md", "docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md", "docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md", "host/update_engine.py", "host/test_update_engine_resume.py"}
    for fix_commit in post_plan_commits[2:]:
        parents = run("show", "-s", "--format=%P", fix_commit).split()
        fix_subject = run("show", "-s", "--format=%s", fix_commit)
        fix_paths = run("diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", fix_commit).splitlines()
        if len(parents) != 1 or re.fullmatch(r"(?:test|fix|docs)\(review\): .+", fix_subject) is None or not fix_paths or not set(fix_paths) <= integration_paths or set(fix_paths) & forbidden_fix_paths:
            fail("Unauthorized focused controller-fix commit " + fix_commit)
    for path, expected in value["audit_subject"]["source_path_blobs"].items():
        if object_id(subject, path) != expected:
            fail("Audit subject source blob " + path)
        if current_head == subject:
            working = run("hash-object", "--", path, allow_missing=True)
            if expected is not None and working != expected:
                fail("Audit working source blob " + path)
    if object_id(subject, spec["report_path"]) is not None or pathlib.Path(spec["report_path"]).exists():
        fail("Historical report path is present")
    if lineage["commits"] != spec["commits"] or lineage["related_commits"] != spec["related"]:
        fail("Recorded lineage constants")


def build(task_number, subject, mutation_rows):
    spec = TASKS[task_number]
    verification = strict_json(VERIFICATION_PATH)
    if verification.get("reviewed_head") != subject:
        fail("Reviewed head changed before audit generation")
    paths = spec["name_status_sorted_paths"]
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        fail("Declared path constant order")
    checks = []
    for template in spec["checks"]:
        row = dict(template)
        row["evidence_sha256"] = sha256(row["evidence_path"])
        row["exit_code"] = 0
        row["result"] = "passed"
        checks.append(row)
    mutations = [row for row in mutation_rows if row.get("task_number") == task_number]
    for row in mutations:
        row.pop("task_number", None)
    value = {
        "audit_subject": {
            "commit": subject,
            "plan_blob": object_id(subject, PLAN_PATH),
            "source_path_blobs": {path: object_id(subject, path) for path in paths},
            "tree": run("show", "-s", "--format=%T", subject),
        },
        "claim_boundary": {
            "historical_report_reconstructed": False,
            "historical_tdd_timeline_reconstructed": False,
            "scope": "current_immutable_commit_state_only",
        },
        "evidence_kind": "plan_e_task_current_state_audit",
        "historical_report": {
            "availability": "unrecoverable",
            "expected_sha256": spec["report_hash"],
            "path": spec["report_path"],
        },
        "implementation_lineage": {
            "base_commit": spec["base"],
            "commits": spec["commits"],
            "declared_paths": paths,
            "diff_numstat": [{"added": row[0], "deleted": row[1], "path": row[2]} for row in spec["numstat"]],
            "head_commit": spec["head"],
            "head_path_blobs": spec["head_blobs"],
            "head_tree": spec["head_tree"],
            "range": spec["base"] + ".." + spec["head"],
            "related_commits": spec["related"],
        },
        "required_independent_reviews": ["plan_e_only", "original_whole_branch_interim"],
        "schema_version": 1,
        "task_number": task_number,
        "verification": {
            "checks": checks,
            "current_mutations": mutations,
            "machine_evidence": {
                "focused_extension_results_sha256": sha256(FOCUSED_PATH),
                "host_test_results_sha256": None if task_number == 6 else sha256(HOST_PATH),
                "reviewed_head_verification_sha256": sha256(VERIFICATION_PATH),
            },
        },
    }
    return value


def validate(task_number, value):
    spec = TASKS[task_number]
    check_keys(value, TOP_KEYS, "audit")
    check_keys(value["audit_subject"], AUDIT_SUBJECT_KEYS, "audit_subject")
    check_keys(value["claim_boundary"], CLAIM_KEYS, "claim_boundary")
    check_keys(value["historical_report"], REPORT_KEYS, "historical_report")
    check_keys(value["implementation_lineage"], LINEAGE_KEYS, "implementation_lineage")
    check_keys(value["verification"], VERIFICATION_KEYS, "verification")
    check_keys(value["verification"]["machine_evidence"], MACHINE_KEYS, "machine_evidence")
    if type(value.get("schema_version")) is not int or value["schema_version"] != 1 or type(value.get("task_number")) is not int or value["task_number"] != task_number:
        fail("Audit integer identity")
    if value["evidence_kind"] != "plan_e_task_current_state_audit" or value["required_independent_reviews"] != ["plan_e_only", "original_whole_branch_interim"]:
        fail("Audit kind/reviews")
    if value["claim_boundary"] != {"historical_report_reconstructed": False, "historical_tdd_timeline_reconstructed": False, "scope": "current_immutable_commit_state_only"}:
        fail("Audit claim boundary")
    if type(value["claim_boundary"]["historical_report_reconstructed"]) is not bool or type(value["claim_boundary"]["historical_tdd_timeline_reconstructed"]) is not bool:
        fail("Audit claim-boundary boolean types")
    if value["historical_report"] != {"availability": "unrecoverable", "expected_sha256": spec["report_hash"], "path": spec["report_path"]}:
        fail("Historical report declaration")
    if pathlib.Path(spec["report_path"]).exists():
        candidate = pathlib.Path(spec["report_path"])
        if candidate.is_file() and hashlib.sha256(candidate.read_bytes()).hexdigest() == spec["report_hash"]:
            fail("Exact historical report recovered; contract revision required")
        fail("Unexpected nonmatching historical report path")
    for label in ("commit", "plan_blob", "tree"):
        check_hash(value["audit_subject"][label], HEX40, "audit subject " + label)
    source_blobs = value["audit_subject"]["source_path_blobs"]
    if type(source_blobs) is not dict or list(source_blobs) != sorted(source_blobs) or set(source_blobs) != set(value["implementation_lineage"]["declared_paths"]):
        fail("Audit source blob inventory")
    expected_path_count = 7 if task_number == 6 else 14
    if len(source_blobs) != expected_path_count or len(value["implementation_lineage"]["declared_paths"]) != expected_path_count:
        fail("Audit declared path count")
    for path, blob in source_blobs.items():
        if type(path) is not str or (blob is not None and (type(blob) is not str or HEX40.fullmatch(blob) is None)):
            fail("Audit source blob type")
    lineage = value["implementation_lineage"]
    paths = spec["name_status_sorted_paths"]
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        fail("Declared path validation order")
    if lineage["base_commit"] != spec["base"] or lineage["head_commit"] != spec["head"] or lineage["head_tree"] != spec["head_tree"] or lineage["range"] != spec["base"] + ".." + spec["head"] or lineage["declared_paths"] != paths or lineage["head_path_blobs"] != spec["head_blobs"]:
        fail("Lineage identity")
    if run("show", "-s", "--format=%T", lineage["head_commit"]) != lineage["head_tree"]:
        fail("Lineage head tree")
    if list(lineage["head_path_blobs"]) != sorted(lineage["head_path_blobs"]):
        fail("Head-path blob order")
    for path, blob in lineage["head_path_blobs"].items():
        if type(path) is not str or (blob is not None and (type(blob) is not str or HEX40.fullmatch(blob) is None)):
            fail("Head-path blob type")
    if len(lineage["commits"]) != len(spec["commits"]) or len(lineage["related_commits"]) != len(spec["related"]):
        fail("Lineage cardinality")
    if len(lineage["commits"]) != (9 if task_number == 6 else 3):
        fail("Lineage core commit count")
    for row in lineage["commits"]:
        check_keys(row, COMMIT_KEYS, "commit")
        for key in ("commit", "parent", "tree"):
            check_hash(row[key], HEX40, "commit " + key)
        if type(row["subject"]) is not str or not row["subject"]:
            fail("Commit subject")
    for row in lineage["diff_numstat"]:
        check_keys(row, NUMSTAT_KEYS, "numstat")
        if type(row["added"]) is not int or type(row["deleted"]) is not int or row["added"] < 0 or row["deleted"] < 0:
            fail("Numstat counter")
    expected_numstat = [{"added": row[0], "deleted": row[1], "path": row[2]} for row in spec["numstat"]]
    if lineage["diff_numstat"] != expected_numstat:
        fail("Lineage numstat rows")
    for row in lineage["related_commits"]:
        check_keys(row, RELATED_KEYS, "related commit")
        for key in ("commit", "parent", "tree"):
            check_hash(row[key], HEX40, "related " + key)
        if row["paths"] != sorted(row["paths"]) or len(row["paths"]) != len(set(row["paths"])):
            fail("Related path order")
        for blob_key in ("before_blobs", "after_blobs"):
            blobs = row[blob_key]
            if type(blobs) is not dict or list(blobs) != sorted(blobs) or set(blobs) != set(row["paths"]):
                fail("Related blob inventory")
            for blob in blobs.values():
                if blob is not None and (type(blob) is not str or HEX40.fullmatch(blob) is None):
                    fail("Related blob hash")
        for item in row["diff_numstat"]:
            check_keys(item, NUMSTAT_KEYS, "related numstat")
            if type(item["added"]) is not int or type(item["deleted"]) is not int or item["added"] < 0 or item["deleted"] < 0:
                fail("Related numstat counter")
    checks = value["verification"]["checks"]
    if type(checks) is not list or len(checks) != len(spec["checks"]):
        fail("Check cardinality")
    verification_document = strict_json(VERIFICATION_PATH)
    machine_hashes = verification_document.get("machine_result_sha256")
    if type(machine_hashes) is not dict or set(machine_hashes) != {"focused_extension", "full_extension", "host"}:
        fail("Reviewed-head machine hash shape")
    expected_check_hashes = [machine_hashes["focused_extension"]] if task_number == 6 else [machine_hashes["focused_extension"], machine_hashes["host"]]
    if [sha256(row["evidence_path"]) for row in checks] != expected_check_hashes:
        fail("Check evidence order/hash binding")
    for row, template in zip(checks, spec["checks"]):
        check_keys(row, CHECK_KEYS, "check")
        expected = dict(template)
        expected.update({"evidence_sha256": sha256(template["evidence_path"]), "exit_code": 0, "result": "passed"})
        if row != expected or type(row["exit_code"]) is not int:
            fail("Check exact record " + template["id"])
        if type(row["argv"]) is not list or not row["argv"] or any(type(item) is not str or not item for item in row["argv"]):
            fail("Check argv")
        if type(row["required_assertions"]) is not list or not row["required_assertions"] or len(row["required_assertions"]) != len(set(row["required_assertions"])):
            fail("Check assertions")
        check_hash(row["evidence_sha256"], HEX64, "check evidence")
        if row["required_files"] != sorted(row["required_files"]) or len(row["required_files"]) != len(set(row["required_files"])):
            fail("Check file order")
        if row["evidence_path"] == FOCUSED_PATH:
            validate_focused(row)
        else:
            validate_host(row)
    expected_mutations = [row for row in MUTATIONS if row["task"] == task_number]
    mutations = value["verification"]["current_mutations"]
    if type(mutations) is not list or len(mutations) != len(expected_mutations):
        fail("Mutation cardinality")
    for row, expected in zip(mutations, expected_mutations):
        check_keys(row, MUTATION_KEYS, "mutation")
        before = object_id(value["audit_subject"]["commit"], expected["source_path"])
        if row != {
            "before_blob": before,
            "failed_assertions": [expected["test_title"]],
            "failure_kind": "assertion_failure",
            "id": expected["id"],
            "mutated_sha256": expected_mutated_sha(expected, value["audit_subject"]["commit"]),
            "observed_exit_code": 1,
            "restored_blob": before,
            "restored_exit_code": 0,
            "result": "current_state_mutation_caught",
            "source_path": expected["source_path"],
            "test_argv": expected["test_argv"],
            "test_title": expected["test_title"],
            "transformation": expected["transformation"],
        }:
            fail("Mutation exact record " + expected["id"])
        if type(row["observed_exit_code"]) is not int or type(row["restored_exit_code"]) is not int:
            fail("Mutation bool-as-int")
        if type(row["failed_assertions"]) is not list or row["failed_assertions"] != [row["test_title"]] or type(row["test_argv"]) is not list or not row["test_argv"] or any(type(item) is not str or not item for item in row["test_argv"]):
            fail("Mutation assertion/argv shape")
    machine = value["verification"]["machine_evidence"]
    expected_machine = {
        "focused_extension_results_sha256": sha256(FOCUSED_PATH),
        "host_test_results_sha256": None if task_number == 6 else sha256(HOST_PATH),
        "reviewed_head_verification_sha256": sha256(VERIFICATION_PATH),
    }
    if machine != expected_machine:
        fail("Machine evidence hashes")
    verification_document = strict_json(VERIFICATION_PATH)
    if verification_document.get("typescript") != "passed" or verification_document.get("reviewed_head") != value["audit_subject"]["commit"]:
        fail("Audit TypeScript/reviewed-head binding")
    for key, item in machine.items():
        if item is not None:
            check_hash(item, HEX64, "machine " + key)
    validate_git(task_number, value)


if len(sys.argv) < 2:
    fail("mode required")
mode = sys.argv[1]
if mode == "mutation-plan":
    public = [{key: value for key, value in row.items() if key != "task"} | {"task_number": row["task"]} for row in MUTATIONS]
    sys.stdout.buffer.write(canonical(public))
elif mode == "generate":
    if len(sys.argv) != 5:
        fail("generate arguments")
    try:
        task_number = int(sys.argv[2])
    except ValueError:
        fail("generate task number")
    if task_number not in TASKS:
        fail("unknown generate task")
    subject = sys.argv[3]
    check_hash(subject, HEX40, "generate subject")
    mutations = strict_json(sys.argv[4])
    value = build(task_number, subject, mutations)
    validate(task_number, value)
    sys.stdout.buffer.write(canonical(value))
elif mode == "validate":
    if len(sys.argv) != 3:
        fail("validate arguments")
    value = strict_json(sys.argv[2])
    task_number = value.get("task_number")
    if type(task_number) is not int or task_number not in TASKS:
        fail("audit task number")
    validate(task_number, value)
else:
    fail("unknown mode")
```
<!-- PLAN_E_AUDIT_PROGRAM_END -->

Execute the current checks and mutations with this owner-only runner. The three
mutations use fixed token-scoped worktrees at the recorded audit subject. The
runner creates a closed owner record before `git worktree add`, accepts only an
assertion failure for the exact selected title with exit `1`, reruns restored
GREEN with exit `0`, restores primary location and environment in `finally`, and
removes only an exact current-token registration without `--force`. Compile,
import, setup, zero-match, timeout, signal, unrelated failure, unexpected bytes,
or cleanup mismatch is `BLOCKED`. A mismatch leaves the path, registration, and
owner record for explicit human inspection; this executor never calls
`git worktree prune`.

The mutation argv uses the already-installed canonical
`extension/node_modules/vitest/vitest.mjs` and canonical `vitest.config.ts` as
read-only tooling while `--root extension` resolves inside the detached
worktree. It never installs, links, copies, or mutates dependencies and rejects
missing/reparse tool paths before launch.
`current_state_mutation_caught` is the only mutation result enum and
`assertion_failure` the only failure kind. Mutation audit records never use
`RED`, `GREEN`, or `historical` labels.
They prove only that current tests catch current mutations, not original
implementation chronology.
Failing output identifies the selected title as the one failed test and contains
an assertion diagnostic attributable to the mutation; another test, file, or
process failure never qualifies.
Before each `git worktree add`, inspect both the fixed path and complete
`git worktree list --porcelain`; either pre-existing path or registration is a
hard stop for operator inspection. Never adopt, reset, delete, prune, or
force-remove it.
Cleanup uses `git worktree remove <exact-owned-path>` without `--force`, removes
the owner record only after Git/path absence is proven, and never runs broad
prune.
Each owner record is exclusively promoted before add and is closed over exact
schema version, lease token, immutable detached worktree head (the reviewed audit
head for current mutations; the RED test commit for replay), fixed worktree path,
mutation ID, sole allowed source path, before blob, and expected mutated SHA-256.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$committedPlan=@(& git show "$script:PlanEReviewedHead`:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md") -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed Plan E audit contract' }
$auditMatch=[regex]::Match($committedPlan,'(?s)<!-- PLAN_E_AUDIT_PROGRAM_START -->\n```python\n(.*?)\n```\n<!-- PLAN_E_AUDIT_PROGRAM_END -->')
if (-not $auditMatch.Success) { throw 'Plan E audit program contract is missing' }
$script:PlanEAuditProgram=$auditMatch.Groups[1].Value
$mutationPlan=@($script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - mutation-plan)
if ($LASTEXITCODE -ne 0 -or $mutationPlan.Count -ne 1) { throw 'Could not resolve canonical mutation plan' }
$mutations=$mutationPlan[0] | ConvertFrom-Json -AsHashtable
if ($mutations.Count -ne 3) { throw 'Canonical mutation plan cardinality mismatch' }
$script:PlanEMutationRecords=@()
$script:PlanEPrimaryMutationBaselineStatus=@(& git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not capture primary mutation baseline status' }
function Get-PlanERegisteredWorktrees {
    $lines=@(& git worktree list --porcelain)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Git worktree registrations' }
    return @($lines | Where-Object { $_ -like 'worktree *' } | ForEach-Object {
        [IO.Path]::GetFullPath($_.Substring(9))
    })
}
function Read-PlanEWorktreeOwner {
    param([Parameter(Mandatory=$true)][string]$Path)
    $keys=@('allowed_source_path','before_blob','expected_mutated_sha256','lease_token','mutation_id','reviewed_head','schema_version','worktree_head','worktree_path')
    $value=Read-PlanEStrictCanonicalRecord -Path $Path -ExpectedKeys $keys
    if ($value.schema_version -isnot [long] -or $value.schema_version -ne 1 -or -not (Test-PlanEStringFields -Value $value -Keys @('allowed_source_path','before_blob','expected_mutated_sha256','lease_token','mutation_id','reviewed_head','worktree_head','worktree_path')) -or $value.lease_token -cne $script:PlanEToken -or $value.reviewed_head -notmatch '^[0-9a-f]{40}$' -or $value.worktree_head -notmatch '^[0-9a-f]{40}$' -or $value.before_blob -notmatch '^[0-9a-f]{40}$' -or $value.expected_mutated_sha256 -notmatch '^[0-9a-f]{64}$' -or [string]::IsNullOrWhiteSpace($value.mutation_id) -or [string]::IsNullOrWhiteSpace($value.allowed_source_path) -or [IO.Path]::GetFullPath($value.worktree_path) -cne $value.worktree_path) { throw "BLOCKED: worktree owner type/value mismatch: $Path" }
    return $value
}
function Assert-PlanEPrimaryUnchanged {
    param([string]$SourcePath,[string]$ExpectedBlob)
    $head=@(& git rev-parse HEAD)
    $blob=@(& git hash-object -- $SourcePath)
    $status=@(& git status --porcelain=v1 --untracked-files=no)
    if (
        $LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or $blob.Count -ne 1 -or
        $head[0].Trim() -cne $script:PlanEReviewedHead -or
        $blob[0].Trim() -cne $ExpectedBlob -or
        ($status -join "`n") -cne ($script:PlanEPrimaryMutationBaselineStatus -join "`n")
    ) { throw "BLOCKED: primary checkout changed during mutation: $SourcePath" }
}
function Invoke-PlanEAuditMutation {
    param([Parameter(Mandatory=$true)][hashtable]$Definition)
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    $name=[string]$Definition.worktree_name
    $sourcePath=[string]$Definition.source_path
    $worktree=[IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot "worktrees\$name"))
    $ownerPath=[IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot "worktree-owners\$name.json"))
    $ownerTemp=[IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot "worktree-owners\.$name.$script:PlanEToken.tmp"))
    $allowedWorktree=[IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot "worktrees\$name"))
    if ($worktree -cne $allowedWorktree -or (Test-Path -LiteralPath $worktree) -or (Test-Path -LiteralPath $ownerPath) -or (Test-Path -LiteralPath $ownerTemp)) {
        throw "BLOCKED: mutation resource already exists: $name"
    }
    $registered=Get-PlanERegisteredWorktrees
    if ($registered -ccontains $worktree) { throw "BLOCKED: mutation worktree is already registered: $worktree" }
    foreach ($parentPath in @($script:PlanETempParent,$script:PlanETempRoot)) {
        $parentInfo=Get-Item -LiteralPath $parentPath -Force
        if ($parentInfo -isnot [IO.DirectoryInfo] -or ($parentInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: mutation worktree ancestor is not a plain directory: $parentPath" }
    }
    $beforeBlob=@(& git rev-parse "$script:PlanEReviewedHead`:$sourcePath")
    if ($LASTEXITCODE -ne 0 -or $beforeBlob.Count -ne 1 -or $beforeBlob[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw "Could not resolve mutation source blob: $sourcePath" }
    $beforeBlob=$beforeBlob[0].Trim()
    Assert-PlanEPrimaryUnchanged -SourcePath $sourcePath -ExpectedBlob $beforeBlob
    $workingBytes=[IO.File]::ReadAllBytes((Join-Path $script:PlanECanonicalRepository $sourcePath))
    $workingText=[Text.UTF8Encoding]::new($false,$true).GetString($workingBytes)
    $sourceText=$workingText.Replace("`r`n","`n")
    if ($sourceText.Contains("`r")) { throw "Mutation source contains a noncanonical CR: $name" }
    $sourceBytes=[Text.UTF8Encoding]::new($false).GetBytes($sourceText)
    $old=[string]$Definition.old
    if ([regex]::Matches($sourceText,[regex]::Escape($old)).Count -ne 1) { throw "Mutation source cardinality mismatch: $name" }
    $mutatedText=$sourceText.Replace($old,[string]$Definition.new)
    $mutatedBytes=[Text.UTF8Encoding]::new($false).GetBytes($mutatedText)
    $mutatedHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($mutatedBytes)).ToLowerInvariant()
    $runError=$null
    $cleanupError=$null
    $worktreeCreated=$false
    $savedLocation=(Get-Location).Path
    $mutationEnvironment=[ordered]@{PYTHONDONTWRITEBYTECODE='1'}
    try {
        Assert-PlanEPrimaryUnchanged -SourcePath $sourcePath -ExpectedBlob $beforeBlob
        New-PlanERegisteredDirectory -Path (Split-Path -Parent $worktree) -ExpectedPhase 'evidence' -Parents
        New-PlanERegisteredDirectory -Path (Split-Path -Parent $ownerPath) -ExpectedPhase 'evidence' -Parents
        $owner=[ordered]@{
            allowed_source_path=$sourcePath
            before_blob=$beforeBlob
            expected_mutated_sha256=$mutatedHash
            mutation_id=[string]$Definition.id
            reviewed_head=$script:PlanEReviewedHead
            schema_version=1
            lease_token=$script:PlanEToken
            worktree_head=$script:PlanEReviewedHead
            worktree_path=$worktree
        }
        Write-PlanEExclusiveCanonicalFile -Path $ownerTemp -Value $owner
        Move-PlanERegisteredPath -Source $ownerTemp -Destination $ownerPath -ExpectedPhase 'evidence'
        $ownerCheck=Read-PlanEWorktreeOwner -Path $ownerPath
        if ($ownerCheck.lease_token -cne $script:PlanEToken -or $ownerCheck.reviewed_head -cne $script:PlanEReviewedHead -or $ownerCheck.worktree_head -cne $script:PlanEReviewedHead -or $ownerCheck.worktree_path -cne $worktree -or $ownerCheck.mutation_id -cne [string]$Definition.id -or $ownerCheck.allowed_source_path -cne $sourcePath -or $ownerCheck.before_blob -cne $beforeBlob -or $ownerCheck.expected_mutated_sha256 -cne $mutatedHash) { throw "BLOCKED: promoted mutation owner mismatch: $name" }
        $worktreeAddExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('worktree','add','--detach',$worktree,$script:PlanEReviewedHead) -ExpectedWorkingDirectory (Get-Location).Path
        if ($worktreeAddExit -ne 0) { throw "Could not create mutation worktree: $name" }
        $worktreeCreated=$true
        $registered=Get-PlanERegisteredWorktrees
        if (@($registered | Where-Object { $_ -ceq $worktree }).Count -ne 1) { throw "Mutation worktree registration mismatch: $name" }
        $worktreeInfo=Get-Item -LiteralPath $worktree -Force
        if ($worktreeInfo -isnot [IO.DirectoryInfo] -or ($worktreeInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Mutation worktree is not a plain directory: $name" }
        $sourceFull=Join-Path $worktree $sourcePath
        $worktreeBefore=@(& git -C $worktree hash-object -- $sourcePath)
        if ($LASTEXITCODE -ne 0 -or $worktreeBefore.Count -ne 1 -or $worktreeBefore[0].Trim() -cne $beforeBlob) { throw "Mutation worktree source blob mismatch: $name" }
        $worktreeText=[Text.UTF8Encoding]::new($false,$true).GetString([IO.File]::ReadAllBytes($sourceFull)).Replace("`r`n","`n")
        if ($worktreeText.Contains("`r") -or $worktreeText -cne $sourceText) { throw "Mutation canonical source bytes differ from reviewed blob: $name" }
        Set-PlanERegisteredBytes -Path $sourceFull -Bytes $mutatedBytes -ExpectedPhase 'evidence'
        $writtenHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFull).Hash.ToLowerInvariant()
        if ($writtenHash -cne $mutatedHash) { throw "Mutation write hash mismatch: $name" }
        Push-Location -LiteralPath $worktree
        try {
            $argv=@($Definition.test_argv)
            foreach ($toolPath in @($argv[0],$argv[1],$argv[5])) {
                if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf)) { throw "Mutation test tool path is missing: $toolPath" }
                $toolInfo=Get-Item -LiteralPath $toolPath -Force
                if (($toolInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Mutation test tool path is a reparse point: $toolPath" }
            }
            $command=[IO.Path]::GetFullPath([string]$argv[0])
            $arguments=@($argv[1..($argv.Count-1)])
            $execution=Invoke-PlanEEnvironmentScope -Context "mutation failure $name" -Overrides $mutationEnvironment -Body { Invoke-PlanERedirectedWriter -FilePath $command -ArgumentList $arguments -ExpectedWorkingDirectory (Get-Location).Path }
            $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
            $mutationExit=$execution.exit_code
        } finally { Pop-Location }
        $text=$lines -join "`n"
        $plainText=[regex]::Replace($text,"`e\[[0-9;]*m",'')
        if (
            $mutationExit -ne 1 -or
            [regex]::Matches($plainText,'(?im)^.*' + [regex]::Escape([string]$Definition.test_title) + '.*$').Count -ne 1 -or
            [regex]::Matches($plainText,'(?m)^\s*Tests\s+1 failed\b').Count -ne 1 -or
            $plainText -cmatch '(?i)(no tests found|zero tests|failed to load|importerror|modulenotfound|err_module_not_found|timed out|timeout|terminated by signal|received signal|unhandled error)' -or
            $plainText -cnotmatch '(?i)(assertionerror|expected.+(?:to|not to))'
        ) { throw "Mutation was not the required assertion failure: $name`n$plainText" }
        $outputPath=Join-Path $script:PlanETempRoot "mutation-output\$name.txt"
        New-PlanERegisteredDirectory -Path (Split-Path -Parent $outputPath) -ExpectedPhase 'evidence' -Parents
        Write-PlanERegisteredText -Path $outputPath -Text ($text + "`n") -ExpectedPhase 'evidence'
        Set-PlanERegisteredBytes -Path $sourceFull -Bytes $sourceBytes -ExpectedPhase 'evidence'
        $restoredBlob=@(& git -C $worktree hash-object -- $sourcePath)
        if ($LASTEXITCODE -ne 0 -or $restoredBlob.Count -ne 1 -or $restoredBlob[0].Trim() -cne $beforeBlob) { throw "Mutation restoration blob mismatch: $name" }
        Push-Location -LiteralPath $worktree
        try {
            $argv=@($Definition.test_argv)
            $command=[IO.Path]::GetFullPath([string]$argv[0])
            $arguments=@($argv[1..($argv.Count-1)])
            $execution=Invoke-PlanEEnvironmentScope -Context "mutation restored $name" -Overrides $mutationEnvironment -Body { Invoke-PlanERedirectedWriter -FilePath $command -ArgumentList $arguments -ExpectedWorkingDirectory (Get-Location).Path }
            $restoredLines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
            $restoredExit=$execution.exit_code
        } finally { Pop-Location }
        $restoredText=$restoredLines -join "`n"
        $restoredPlainText=[regex]::Replace($restoredText,"`e\[[0-9;]*m",'')
        if ($restoredExit -ne 0 -or [regex]::Matches($restoredPlainText,'(?im)^.*' + [regex]::Escape([string]$Definition.test_title) + '.*$').Count -ne 1 -or [regex]::Matches($restoredPlainText,'(?m)^\s*Tests\s+1 passed\b').Count -ne 1 -or $restoredPlainText -cmatch '(?i)(no tests found|failed to load|importerror|modulenotfound|err_module_not_found|timed out|terminated by signal|received signal|unhandled error)') {
            throw "Restored mutation selector did not pass: $name`n$restoredPlainText"
        }
        $restoredOutputPath=Join-Path $script:PlanETempRoot "mutation-output\$name-restored.txt"
        Write-PlanERegisteredText -Path $restoredOutputPath -Text ($restoredText + "`n") -ExpectedPhase 'evidence'
        $script:PlanEMutationRecords += [ordered]@{
            before_blob=$beforeBlob
            failed_assertions=@([string]$Definition.test_title)
            failure_kind='assertion_failure'
            id=[string]$Definition.id
            mutated_sha256=$mutatedHash
            observed_exit_code=1
            restored_blob=$beforeBlob
            restored_exit_code=0
            result='current_state_mutation_caught'
            source_path=$sourcePath
            task_number=[int]$Definition.task_number
            test_argv=@($Definition.test_argv)
            test_title=[string]$Definition.test_title
            transformation=[string]$Definition.transformation
        }
    } catch { $runError=$_ } finally {
        try { Set-Location -LiteralPath $savedLocation } catch { if ($null -eq $cleanupError) { $cleanupError=$_ } }
        if ($worktreeCreated) {
            $ownerValue=$null
            try {
                $ownerValue=Read-PlanEWorktreeOwner -Path $ownerPath
                $registered=Get-PlanERegisteredWorktrees
                $detachedHead=@(& git -C $worktree rev-parse HEAD 2>$null)
                $sourceFull=Join-Path $worktree $sourcePath
                if (Test-Path -LiteralPath $sourceFull -PathType Leaf) {
                    $currentBlob=@(& git -C $worktree hash-object -- $sourcePath)
                    if ($LASTEXITCODE -eq 0 -and $currentBlob.Count -eq 1 -and $currentBlob[0].Trim() -ne $beforeBlob) {
                        $currentHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFull).Hash.ToLowerInvariant()
                        if ($currentHash -ceq $mutatedHash) { Set-PlanERegisteredBytes -Path $sourceFull -Bytes $sourceBytes -ExpectedPhase 'evidence' }
                    }
                }
                $status=@(& git -C $worktree status --porcelain=v1 --untracked-files=all 2>$null)
                if (
                    $null -ne $ownerValue -and $ownerValue.lease_token -ceq $script:PlanEToken -and
                    $ownerValue.worktree_path -ceq $worktree -and $ownerValue.reviewed_head -ceq $script:PlanEReviewedHead -and
                    $ownerValue.worktree_head -ceq $script:PlanEReviewedHead -and
                    $ownerValue.allowed_source_path -ceq $sourcePath -and $ownerValue.before_blob -ceq $beforeBlob -and
                    $ownerValue.expected_mutated_sha256 -ceq $mutatedHash -and
                    @($registered | Where-Object { $_ -ceq $worktree }).Count -eq 1 -and
                    $detachedHead.Count -eq 1 -and $detachedHead[0].Trim() -ceq $script:PlanEReviewedHead -and
                    $status.Count -eq 0
                ) {
                    $worktreeRemoveExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('worktree','remove',$worktree) -ExpectedWorkingDirectory (Get-Location).Path
                    if ($worktreeRemoveExit -ne 0) { throw "exact mutation worktree removal failed: $name" }
                    $registeredAfter=Get-PlanERegisteredWorktrees
                    if ((Test-Path -LiteralPath $worktree) -or $registeredAfter -ccontains $worktree) { throw "mutation worktree remains after removal: $name" }
                    Remove-PlanERegisteredPath -Path $ownerPath -ExpectedPhase 'evidence'
                    if (Test-Path -LiteralPath $ownerPath) { throw "mutation owner remains after removal: $name" }
                } else { throw "mutation cleanup ownership mismatch; resources retained: $name" }
            } catch { if ($null -eq $cleanupError) { $cleanupError=$_ } }
        } elseif (Test-Path -LiteralPath $ownerPath) {
            try {
                $ownerValue=Read-PlanEWorktreeOwner -Path $ownerPath
                $registered=Get-PlanERegisteredWorktrees
                if ($null -ne $ownerValue -and $ownerValue.lease_token -ceq $script:PlanEToken -and $ownerValue.worktree_path -ceq $worktree -and $ownerValue.reviewed_head -ceq $script:PlanEReviewedHead -and $ownerValue.worktree_head -ceq $script:PlanEReviewedHead -and $ownerValue.mutation_id -ceq [string]$Definition.id -and $ownerValue.allowed_source_path -ceq $sourcePath -and $ownerValue.before_blob -ceq $beforeBlob -and $ownerValue.expected_mutated_sha256 -ceq $mutatedHash -and $registered -cnotcontains $worktree -and -not (Test-Path -LiteralPath $worktree)) {
                    Remove-PlanERegisteredPath -Path $ownerPath -ExpectedPhase 'evidence'
                    if (Test-Path -LiteralPath $ownerPath) { throw "pre-add owner record remains: $name" }
                } else { throw "pre-add mutation owner cleanup mismatch; record retained: $name" }
            } catch { if ($null -eq $cleanupError) { $cleanupError=$_ } }
        }
        if (Test-Path -LiteralPath $ownerTemp) {
            try {
                $registered=Get-PlanERegisteredWorktrees
                if ($registered -ccontains $worktree -or (Test-Path -LiteralPath $worktree)) { throw "owner temporary cannot be removed while worktree state exists: $name" }
                Remove-PlanERegisteredPath -Path $ownerTemp -ExpectedPhase 'evidence'
            } catch { if ($null -eq $cleanupError) { $cleanupError=$_ } }
        }
        try { Assert-PlanEPrimaryUnchanged -SourcePath $sourcePath -ExpectedBlob $beforeBlob } catch { if ($null -eq $cleanupError) { $cleanupError=$_ } }
    }
    if ($null -ne $cleanupError) {
        $primaryClass=if ($null -ne $runError) { $runError.Exception.GetType().FullName } else { '<none>' }
        throw "BLOCKED: mutation cleanup failed; primary=$primaryClass; cleanup=$($cleanupError.Exception.GetType().FullName); resources retained: $name"
    }
    if ($null -ne $runError) { throw $runError }
}
foreach ($definition in $mutations) { Invoke-PlanEAuditMutation -Definition $definition }
if ($script:PlanEMutationRecords.Count -ne 3) { throw 'Current-state mutation record count mismatch' }
if ((@($script:PlanEMutationRecords | Where-Object { $_.task_number -eq 6 }).Count -ne 2) -or (@($script:PlanEMutationRecords | Where-Object { $_.task_number -eq 7 }).Count -ne 1)) { throw 'Current-state task mutation distribution mismatch' }
$mutationRecordPath=Join-Path $script:PlanETempRoot 'audit-mutations.json'
Write-PlanEExclusiveCanonicalFile -Path $mutationRecordPath -Value $script:PlanEMutationRecords
$remainingMutationOwners=@(Get-ChildItem -LiteralPath (Join-Path $script:PlanETempRoot 'worktree-owners') -Force -ErrorAction SilentlyContinue)
$remainingMutationRegistrations=@(Get-PlanERegisteredWorktrees | Where-Object { $_.StartsWith([IO.Path]::GetFullPath((Join-Path $script:PlanETempRoot 'worktrees')) + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) })
if ($remainingMutationOwners.Count -ne 0 -or $remainingMutationRegistrations.Count -ne 0) { throw 'BLOCKED: current-state mutation worktree resource remains before rerun' }
```

Rerun the exact current-state checks after all mutation worktrees are gone and
before audit generation. These are current checks only, never historical GREEN
replays. Before rerunning, promote exact SHA-256 and parser facts for all six
current mutation outputs into the existing focused-result aggregate; update the
reviewed-head verification's focused-result hash through its owner helper. The
audit then binds that durable artifact, not ignored-only output.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$focusedEvidencePath='.superpowers/sdd/focused-extension-results.json'
$focusedEvidence=[IO.File]::ReadAllText((Join-Path (Get-Location) $focusedEvidencePath),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
if (($focusedEvidence.Keys | Sort-Object) -join "`n" -cne (@('reviewed_head','schema_version','suites') -join "`n") -or $focusedEvidence.reviewed_head -cne $script:PlanEReviewedHead -or $focusedEvidence.schema_version -ne 1) { throw 'Focused evidence aggregate changed before mutation binding' }
$mutationOutputEvidence=[ordered]@{}
foreach ($definition in $mutations) {
    $name=[string]$definition.worktree_name
    $failurePath=Join-Path $script:PlanETempRoot "mutation-output\$name.txt"
    $restoredPath=Join-Path $script:PlanETempRoot "mutation-output\$name-restored.txt"
    foreach ($path in @($failurePath,$restoredPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Current mutation output is missing: $path" }
    }
    $mutationOutputEvidence[[string]$definition.id]=[ordered]@{
        failure_output=[IO.File]::ReadAllText($failurePath,[Text.UTF8Encoding]::new($false))
        failure_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $failurePath).Hash.ToLowerInvariant()
        restored_output=[IO.File]::ReadAllText($restoredPath,[Text.UTF8Encoding]::new($false))
        restored_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $restoredPath).Hash.ToLowerInvariant()
        test_title=[string]$definition.test_title
    }
}
if ($mutationOutputEvidence.Count -ne 3) { throw 'Current mutation output evidence cardinality mismatch' }
$expectedMutationOutputIds=@($mutations | ForEach-Object { [string]$_.id } | Sort-Object)
if ((@($mutationOutputEvidence.Keys | Sort-Object) -join "`n") -cne ($expectedMutationOutputIds -join "`n")) { throw 'Current mutation output evidence identity mismatch' }
$focusedEvidence.current_mutation_outputs=$mutationOutputEvidence
$focusedEvidenceBytes=[byte[]](ConvertTo-PlanECanonicalJsonBytes -Value $focusedEvidence)
$focusedEvidenceTemporary=Join-Path $script:PlanETempRoot 'focused-extension-results.mutation-bound.tmp'
if (Test-Path -LiteralPath $focusedEvidenceTemporary) { throw 'Focused mutation-bound evidence temporary already exists' }
Write-PlanERegisteredExclusiveBytes -Path $focusedEvidenceTemporary -Bytes $focusedEvidenceBytes -ExpectedPhase 'evidence'
Move-PlanERegisteredPath -Source $focusedEvidenceTemporary -Destination $focusedEvidencePath -ExpectedPhase 'evidence' -Replace
if (Test-Path -LiteralPath $focusedEvidenceTemporary) { throw 'Focused mutation-bound evidence temporary remains after replacement' }
$focusedEvidenceReread=[IO.File]::ReadAllText((Join-Path (Get-Location) $focusedEvidencePath),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
foreach ($definition in $mutations) {
    $row=$focusedEvidenceReread.current_mutation_outputs[[string]$definition.id]
    $failureBytes=[Text.UTF8Encoding]::new($false).GetBytes([string]$row.failure_output)
    $restoredBytes=[Text.UTF8Encoding]::new($false).GetBytes([string]$row.restored_output)
    if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($failureBytes)).ToLowerInvariant() -cne $row.failure_sha256 -or [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($restoredBytes)).ToLowerInvariant() -cne $row.restored_sha256) { throw "Focused mutation output hash reread mismatch: $($definition.id)" }
}
Update-PlanECurrentRunArtifact -Path $focusedEvidencePath
$reviewedVerificationPath='.superpowers/sdd/reviewed-head-verification.json'
$reviewedVerification=[IO.File]::ReadAllText((Join-Path (Get-Location) $reviewedVerificationPath),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
$reviewedVerification.machine_result_sha256.focused_extension=(Get-FileHash -Algorithm SHA256 -LiteralPath $focusedEvidencePath).Hash.ToLowerInvariant()
$reviewedVerificationBytes=[byte[]](ConvertTo-PlanECanonicalJsonBytes -Value $reviewedVerification)
$reviewedVerificationTemporary=Join-Path $script:PlanETempRoot 'reviewed-head-verification.mutation-bound.tmp'
if (Test-Path -LiteralPath $reviewedVerificationTemporary) { throw 'Mutation-bound reviewed verification temporary already exists' }
Write-PlanERegisteredExclusiveBytes -Path $reviewedVerificationTemporary -Bytes $reviewedVerificationBytes -ExpectedPhase 'evidence'
Move-PlanERegisteredPath -Source $reviewedVerificationTemporary -Destination $reviewedVerificationPath -ExpectedPhase 'evidence' -Replace
if (Test-Path -LiteralPath $reviewedVerificationTemporary) { throw 'Mutation-bound reviewed verification temporary remains after replacement' }
Update-PlanECurrentRunArtifact -Path $reviewedVerificationPath
$extensionChecks=@(
    [ordered]@{Files=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts');Titles=@('switches identity from A to B while Analyze is busy','contains throwing identity accessors','replaces a user-edited A textarea with B after busy Analyze completes','clears A hydration while deferred B hydration is pending')},
    [ordered]@{Files=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts');Titles=@('applies an explicit empty Root to exactly one request')}
)
foreach ($check in $extensionChecks) {
    $execution=Invoke-PlanERedirectedWriter -FilePath $script:PlanENpmCommand -ArgumentList (@('run','test:run','--prefix','extension','--') + @($check.Files) + @('--configLoader','runner','--no-cache','--reporter=verbose')) -ExpectedWorkingDirectory (Get-Location).Path
    $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
    $text=[regex]::Replace(($lines -join "`n"),"`e\[[0-9;]*m",'')
    if ($execution.exit_code -ne 0 -or $text -cmatch '(?i)(no tests found|failed to load|importerror|modulenotfound|err_module_not_found|timed out|terminated by signal|received signal|unhandled error)') { throw 'Current-state Extension check failed' }
    foreach ($title in $check.Titles) {
        if ([regex]::Matches($text,[regex]::Escape($title)).Count -lt 1) { throw "Current-state Extension assertion missing: $title" }
    }
}
$hostRoot=Join-Path $script:PlanETempRoot 'host-current-check'
if (Test-Path -LiteralPath $hostRoot) { throw 'Host current-state temporary already exists' }
$hostEnvironment=[ordered]@{PYTHONPATH=(Resolve-Path -LiteralPath 'host').Path;PYTHONDONTWRITEBYTECODE='1'}
New-PlanERegisteredDirectory -Path $hostRoot -ExpectedPhase 'evidence'
foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
    $path=Join-Path $hostRoot $name.ToLowerInvariant()
    New-PlanERegisteredDirectory -Path $path -ExpectedPhase 'evidence'
    $hostEnvironment[$name]=$path
}
$execution=Invoke-PlanEEnvironmentScope -Context 'Task 7 current Host' -Overrides $hostEnvironment -Body { Invoke-PlanERedirectedWriter -FilePath $script:PlanEPythonCommand -ArgumentList @('-m','unittest','host.test_session_workspace','host.test_prompt_session','-v') -ExpectedWorkingDirectory (Get-Location).Path }
$lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
$text=$lines -join "`n"
if ($execution.exit_code -ne 0 -or $text -cmatch '(?i)(importerror|modulenotfound|timed out|terminated by signal|received signal)' -or $text -notmatch '(?m)^OK\r?$') { throw 'Task 7 current-state Host check failed' }
foreach ($selector in @('TestSessionIdentityLifecycle.test_explicit_empty_analyze_root_overrides_config_for_one_request','TestSessionIdentityLifecycle.test_request_after_explicit_empty_without_marker_uses_configured_root','TestSessionIdentityLifecycle.test_malformed_explicit_marker_uses_legacy_fallback','TestSessionIdentityLifecycle.test_explicit_marker_with_non_string_root_uses_legacy_fallback')) {
    if ([regex]::Matches($text,[regex]::Escape($selector)).Count -ne 1) { throw "Task 7 Host selector missing or duplicated: $selector" }
}
```

Generate each audit through its token-bearing same-directory temporary, strict
validate it, then no-overwrite promote it. The final files are frozen before
review dispatch. Any later product, test, plan, audit input, machine result, or
reviewed-head change invalidates both files and both reviews.
Both targets remain ignored, untracked, and unstaged through review; they are
force-added only in the exact final 60-path set. Temporary ignored status is
never accepted as final durability.
Their `required_independent_reviews` arrays declare required review kinds only;
review outcomes are never written back into audit JSON, avoiding circular audit
hashes.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$mutationRecordPath=Join-Path $script:PlanETempRoot 'audit-mutations.json'
foreach ($task in @(6,7)) {
    $target=".superpowers/sdd/task-$task-audit-evidence.json"
    $temporary=Join-Path $script:PlanECanonicalRepository ".superpowers/sdd/.task-$task-audit-evidence.$script:PlanEToken.tmp"
    if ((Test-Path -LiteralPath $target) -or (Test-Path -LiteralPath $temporary)) { throw "Audit target or temporary already exists: Task $task" }
    $lines=@($script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - generate $task $script:PlanEReviewedHead $mutationRecordPath)
    if ($LASTEXITCODE -ne 0 -or $lines.Count -ne 1) { throw "Task $task audit generation failed" }
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes($lines[0] + "`n")
    Write-PlanERegisteredExclusiveBytes -Path $temporary -Bytes $bytes -ExpectedPhase 'evidence'
    $script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - validate $temporary
    if ($LASTEXITCODE -ne 0) { throw "Task $task audit temporary validation failed" }
    if ([Convert]::ToHexString([IO.File]::ReadAllBytes($temporary)) -cne [Convert]::ToHexString($bytes)) { throw "Task $task audit temporary reread mismatch" }
    Move-PlanERegisteredPath -Source $temporary -Destination $target -ExpectedPhase 'evidence'
    if (Test-Path -LiteralPath $temporary) { throw "Task $task audit temporary remains after promotion" }
    $script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - validate $target
    if ($LASTEXITCODE -ne 0) { throw "Task $task promoted audit validation failed" }
    $trackedAudit=@(& git ls-files -- $target)
    $stagedAudit=@(& git diff --cached --name-only --no-renames -- $target)
    if ($LASTEXITCODE -ne 0 -or $trackedAudit.Count -ne 0 -or $stagedAudit.Count -ne 0) { throw "Audit became tracked or staged before final evidence commit: Task $task" }
}
if ((Test-Path -LiteralPath '.superpowers/sdd/task-6-report.md') -or (Test-Path -LiteralPath '.superpowers/sdd/task-7-report.md')) {
    throw 'A missing historical report appeared during audit generation'
}
$script:PlanEAuditHashes=[ordered]@{
    task_6=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
    task_7=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
}
$script:PlanEFrozenMachineInputHashes=[ordered]@{
    focused=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
    verification=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/reviewed-head-verification.json').Hash.ToLowerInvariant()
}
$auditPaths=@('.superpowers/sdd/task-6-audit-evidence.json','.superpowers/sdd/task-7-audit-evidence.json')
Register-PlanECurrentRunArtifacts -Paths $auditPaths
foreach ($auditPath in $auditPaths) { & git check-ignore -q -- $auditPath;if ($LASTEXITCODE -ne 0) { throw "Audit is not ignored before final force-add: $auditPath" } }
```

- [ ] **Step 6: Confirm the complete requirement matrix manually**

Record PASS/FAIL plus test names in the report for every row:

| Requirement | Evidence source |
|---|---|
| strict bookmark schema, unknown own data, depth/cycle/no coercion | `bookmarkItems.test.ts` |
| one shared descriptor-safe own-data classifier with accessor/proxy containment | `ownData.test.ts`, duplicate-classifier static scan |
| exact `BookmarkLoadResult` `loaded|invalid|failed` narrowing | `bookmarkItems.test.ts`, Options/MenuLogic tests, TypeScript gate |
| failed/invalid/absent/default distinctions and explicit empty | `bookmarkItems`, Options, MenuLogic tests |
| team/import validation, including changed/304 cached sync paths | `teamCatalog.test.ts`, `teamManifestSync.test.ts`, `Options.test.tsx` |
| Reset validates before one set, retries while owned (including team-collapse remove failure), and clears retry on superseding edit | `Options.test.tsx` |
| persisted schemas, legacy no-request, duration zero | `analysisStore`, hydration tests |
| latest-started owner and request cleanup retries/order | `analysisStore.test.ts` |
| mandatory metadata, both-field request stripping, and strict Analyze success/no serialization | `analyzeBridge.test.ts`, `analyzeRequestHandler.test.ts`, FAB tests |
| exact Analyze payload/action schema and parse/acquire/start/leased-send order | `analyzeBridge.test.ts`, `analyzeRequestHandler.test.ts`, handler purity/bypass scans |
| frozen non-Analyze snapshot and safe final Native wire/ID/serialization ordering | `analyzeRequestHandler.test.ts`, `nativeMessageWire.test.ts`, sender static scans |
| missing-module RED policy is limited to six named production modules and every later RED is assertion-based | Task 1/5/6/7/8 isolated RED commands and behavioral reruns |
| Host outcome survives local warnings | bridge/FAB warning tests |
| busy SPA safe identity/plain snapshots, forced B textarea replacement after user-edited A, and no old-case UI | pageIdentity/FAB tests |
| one-request Root, pure context-menu boundary, and old Host fallback | request/context-menu/FAB/Host tests |
| Plan E-owned update-error helper and baseline runtime/tab/DOM delivery | nativeUpdateError/content/Options/FAB tests |
| exact config matrix and revision retry | config/Options tests |
| Windows preparing promotion tolerates bounded sharing violations without weakening atomicity | `PreparingPromotionRetryTests`, expanded update-engine/full Host gates, static seam inventory |
| Plan D handoff | stale-D execution blocker; frozen atomic provider/lease imports, parse/acquire+gate/start/leased-send order, exact inner envelope/payload shadow, frozen non-Analyze snapshot, final-wire sender, invalid-no-port/no-reconnect contract; Plan D sentinels absent |

Any FAIL blocks evidence commit and must be fixed through a new focused TDD commit, not hidden in the report.

Confirm the Plan D handoff text marks the current Plan D document stale and names exact provider/lease/wire imports, tests, parse/acquire+gate/start/leased-send order, denial behavior, frozen non-Analyze snapshot, final-wire register-before-post/unregister behavior, invalid-no-port/no-reconnect rules, and exact three-key inner envelope plus inert payload shadow. Plan D implementation is outside this plan and must begin only after Plan E review plus a reviewed committed Plan D revision.

Perform the writing-plans self-review now: reread spec sections 6-10, 11.3-11.4, and 13 Plan E plus all three correction/amendment specs, including every one of the accepted amendment's 15 sections, and point each sentence to a task/test row above; scan implementation/report text for unresolved authoring markers or vague error-handling directions; compare every exported signature/property name against the locked interfaces and confirm the `UpdateEngine` constructor remains frozen. Correct any gap in a focused TDD commit before proceeding.

- [ ] **Step 7: Generate the Plan-E-only review package**

Run this exact region from the canonical repository root in the same lease-owning
foreground controller:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$integrationBase='0dbb4852931b50153fb898b03129ae0092c46404'
& git cat-file -e "$integrationBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Plan E review base is not a commit' }
$reviewHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve Plan E review head' }
if ($reviewHead.Count -ne 1) { throw 'Plan E review head is ambiguous' }
$reviewHead=$reviewHead[0].Trim()
if ($reviewHead -cne $script:PlanEReviewedHead) { throw 'Plan E review head differs from the lease head' }
if ($reviewHead -notmatch '^[0-9a-f]{40}$') {
    throw 'Invalid Plan E review head'
}
& git merge-base --is-ancestor $integrationBase $reviewHead
if ($LASTEXITCODE -ne 0) { throw 'Plan E review base is not an ancestor' }
$reviewRange="$integrationBase..$reviewHead"
$stat=@(& git diff --stat $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E review stat' }
$log=@(& git log --reverse --oneline $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E review log' }
$paths=@(& git diff --name-status --no-renames $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E review paths' }
$package=@(
    'Review kind: Plan-E-only'
    "Review base: $integrationBase"
    "Review head: $reviewHead"
    "Review range: $reviewRange"
    'Exact diff command: git diff --full-index --binary "' + $reviewRange + '"'
    ''
    '## Diff Stat'
) + $stat + @('', '## Commits') + $log + @('', '## Paths') + $paths
$packageText=($package -join "`n") + "`n"
$packagePath='.superpowers/sdd/plan-e-only-review-package.txt'
$packageTemp=Join-Path $script:PlanETempRoot 'plan-e-only-review-package.tmp'
$diffPath='.superpowers/sdd/plan-e-only-review.diff'
$diffTemp=Join-Path $script:PlanETempRoot 'plan-e-only-review.diff.tmp'
foreach ($path in @($packagePath,$packageTemp,$diffPath,$diffTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Plan E review output already exists: $path" }
}
try {
    Write-PlanERegisteredText -Path $packageTemp -Text $packageText -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $diffTemp -ExpectedPhase 'evidence'
    $diffExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('diff','--full-index','--binary',$reviewRange,("--output=" + $diffTemp)) -ExpectedWorkingDirectory (Get-Location).Path
    if ($diffExit -ne 0) { throw 'Could not write Plan E review diff temporary' }
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $packageTemp),[Text.UTF8Encoding]::new($false)) -cne $packageText -or -not (Test-Path -LiteralPath $diffTemp -PathType Leaf)) { throw 'Plan E review temporary validation failed' }
    Move-PlanERegisteredPath -Source $packageTemp -Destination $packagePath -ExpectedPhase 'evidence'
    Move-PlanERegisteredPath -Source $diffTemp -Destination $diffPath -ExpectedPhase 'evidence'
} finally {
    if (Test-Path -LiteralPath $packageTemp) { Remove-PlanERegisteredPath -Path $packageTemp -ExpectedPhase 'evidence' }
    if (Test-Path -LiteralPath $diffTemp) { Remove-PlanERegisteredPath -Path $diffTemp -ExpectedPhase 'evidence' }
}
Register-PlanECurrentRunArtifacts -Paths @($packagePath,$diffPath)
```

The quoted command executed for this package is exactly `git diff --full-index --binary "$integrationBase..$reviewHead"`; no command substitutes mutable `HEAD` after `$reviewHead` is resolved.

```text
.superpowers/sdd/plan-e-only-review-package.txt
.superpowers/sdd/plan-e-only-review.diff
.superpowers/sdd/plan-e-only-review-findings.md
```

Only after both audit files are frozen, dispatch a fresh `plan_e_only` review
session. Review the Plan E integration range in
`.superpowers/sdd/plan-e-only-review.diff`, both audits, the exact
current-state checks/mutations, and package stat/log/path inventories for
behavioral regressions, evidence-loss honesty, trust boundaries, ownership
races, missing tests, Plan D sentinel absence, and forbidden operations. Assess
the audits as separate frozen inputs; package generation never embeds or rewrites
their bytes. Assess the final artifact durability contract and prospective
58-artifact composition; do not claim that the later 60-path evidence commit
already exists or is durable. Only the post-commit clean-clone gate proves that.
Write `.superpowers/sdd/plan-e-only-review-findings.md` with exact
headings `Review Session`, `Review Base`, `Review Head`, `Review Range`, `Task 6
Audit SHA-256`, `Task 7 Audit SHA-256`, `Historical-Report Availability Honesty`,
`No Reconstructed Historical TDD Claim`, `Git Lineage and Source-Blob Accuracy`,
`Current-State Test and Mutation Sufficiency`, `Artifact-Durability Contract
Adequacy and Prospective 58-Path Inventory Composition`, `Critical`, `Important`,
`Minor`, `Testing Gaps`, `Declared Session Proof Boundary`, and `Disposition`;
use literal SHAs/range from the
package. Every finding has severity and file/line. Each of the five criterion
sections contains only `PASS` or `FAIL`. `Disposition` is `BLOCKED` while any
criterion is `FAIL` or any Critical/Important finding remains and `PASS` only
after fixes, regenerated audits, and a fresh review.
Thus the exact successful `plan_e_only` disposition is `PASS`.
These five criterion values and disposition are semantic enums, not prose;
Minor/Testing Gaps may remain recorded, but never relax the high-severity gate.
The durability criterion assesses exact `24+6+2+26` composition and the
force-add/clean-clone contract, not whether the later commit already exists.
Run the frozen audit/machine-input hash block below immediately before this first
dispatch and again immediately before the second dispatch.

Under `Review Session`, put one non-empty opaque orchestration session ID observed
by the controller from the orchestration result on the immediately following
line. Treat it as opaque; do not parse or normalize its format. Under `Review
Base`, `Review
Head`, `Review Range`, and both audit-hash headings, put only the literal value on
the immediately following line. Under `Disposition`, put only `PASS` or `BLOCKED`
on the immediately following line. Use `None.` under an empty severity/testing
section; do not omit a heading.
The file begins with exact heading `## Review Session`; no prose precedes it.
The record is a closed heading/body document: duplicate, unknown, missing, or
out-of-order headings and empty bodies are rejected.
Create the findings path with exclusive creation, flush/close it, then register
its exact hash as current-token-owned before dispatching the second review. The
helper below performs exact per-record heading/order/enum/hash validation before
writing; Step 10 later performs the cross-record checks.
Use this owner-only helper immediately after the first reviewer returns; it
accepts the complete findings text through controller memory, never overwrites
an existing path, flushes to disk, and registers the frozen bytes:

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
function Write-PlanEFindingsRecord {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    if ($Path -cnotin @('.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-findings.md')) { throw 'Findings path is outside the closed allowlist' }
    $normalized=($Text -replace "`r`n","`n").TrimEnd("`n") + "`n"
    $planEHeadings=@('Review Session','Review Base','Review Head','Review Range','Task 6 Audit SHA-256','Task 7 Audit SHA-256','Historical-Report Availability Honesty','No Reconstructed Historical TDD Claim','Git Lineage and Source-Blob Accuracy','Current-State Test and Mutation Sufficiency','Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition','Critical','Important','Minor','Testing Gaps','Declared Session Proof Boundary','Disposition')
    $wholeHeadings=@($planEHeadings[0..15] + @('Plan D Rerun Requirement','Disposition'))
    $expectedHeadings=if ($Path -ceq '.superpowers/sdd/plan-e-only-review-findings.md') { $planEHeadings } else { $wholeHeadings }
    $matches=[regex]::Matches($normalized,'(?ms)^## ([^\n]+)\n(.*?)(?=^## |\z)')
    $headings=@($matches | ForEach-Object { $_.Groups[1].Value })
    if ($normalized -notmatch '^## Review Session\n' -or ($headings -join "`n") -cne ($expectedHeadings -join "`n") -or $headings.Count -ne @($headings | Sort-Object -Unique).Count) { throw 'Findings heading/order contract mismatch' }
    $sections=@{}; foreach ($match in $matches) { $sections[$match.Groups[1].Value]=$match.Groups[2].Value.TrimEnd("`n") }
    if (@($sections.Values | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -ne 0 -or $sections['Review Session'] -match '[\r\n]' -or [string]::IsNullOrWhiteSpace($sections['Review Session'])) { throw 'Findings section body contract mismatch' }
    foreach ($heading in @('Historical-Report Availability Honesty','No Reconstructed Historical TDD Claim','Git Lineage and Source-Blob Accuracy','Current-State Test and Mutation Sufficiency','Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition')) { if ($sections[$heading] -cnotin @('PASS','FAIL')) { throw "Findings criterion enum mismatch: $heading" } }
    if ($sections['Task 6 Audit SHA-256'] -cne $script:PlanEAuditHashes.task_6 -or $sections['Task 7 Audit SHA-256'] -cne $script:PlanEAuditHashes.task_7) { throw 'Findings audit hash binding mismatch' }
    $packagePath=if ($Path -ceq '.superpowers/sdd/plan-e-only-review-findings.md') { '.superpowers/sdd/plan-e-only-review-package.txt' } else { '.superpowers/sdd/original-whole-branch-interim-review-package.txt' }
    $package=[IO.File]::ReadAllText((Join-Path (Get-Location) $packagePath),[Text.UTF8Encoding]::new($false))
    $expectedBase=[regex]::Match($package,'(?m)^Review base: ([0-9a-f]{40})$').Groups[1].Value
    $expectedHead=[regex]::Match($package,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
    $expectedRange=[regex]::Match($package,'(?m)^Review range: ([0-9a-f]{40}\.\.[0-9a-f]{40})$').Groups[1].Value
    if ($expectedBase -notmatch '^[0-9a-f]{40}$' -or $expectedHead -notmatch '^[0-9a-f]{40}$' -or $expectedRange -cne "$expectedBase..$expectedHead" -or $sections['Review Base'] -cne $expectedBase -or $sections['Review Head'] -cne $expectedHead -or $sections['Review Range'] -cne $expectedRange) { throw 'Findings package metadata binding mismatch' }
    $hasFailure=@($sections.GetEnumerator() | Where-Object { $_.Key -in @('Historical-Report Availability Honesty','No Reconstructed Historical TDD Claim','Git Lineage and Source-Blob Accuracy','Current-State Test and Mutation Sufficiency','Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition') -and $_.Value -ceq 'FAIL' }).Count -ne 0
    $hasHigh=$sections['Critical'] -cne 'None.' -or $sections['Important'] -cne 'None.'
    $successDisposition=if ($Path -ceq '.superpowers/sdd/plan-e-only-review-findings.md') { 'PASS' } else { 'INTERIM PASS THROUGH PLAN E' }
    if ($sections['Disposition'] -cnotin @($successDisposition,'BLOCKED') -or (($hasFailure -or $hasHigh) -and $sections['Disposition'] -cne 'BLOCKED')) { throw 'Findings disposition does not fail closed' }
    $proofBoundary='These records prove only that two different declared orchestration session identifiers were recorded; they do not prove reviewer identity, dispatch, independence, or non-collusion.'
    if ($sections['Declared Session Proof Boundary'] -cne $proofBoundary) { throw 'Findings declared-session proof boundary mismatch' }
    if ($normalized -match '(?i)(evidence commit (already )?(exists|is durable|has been committed)|60-path evidence commit (exists|is durable))') { throw 'Prospective findings claim the later evidence commit already exists or is durable' }
    if ($Path -ceq '.superpowers/sdd/original-whole-branch-interim-review-findings.md') {
        $requiredRerun='Rerun git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>" and the full original-base controller review after Plan D is committed and before any final whole-branch/release-readiness claim.'
        if ($sections['Plan D Rerun Requirement'] -cne $requiredRerun) { throw 'Whole-branch findings Plan D rerun requirement mismatch' }
    }
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes($normalized)
    Write-PlanERegisteredExclusiveBytes -Path $Path -Bytes $bytes -ExpectedPhase 'evidence'
    if ([Convert]::ToHexString([IO.File]::ReadAllBytes((Join-Path (Get-Location) $Path))) -cne [Convert]::ToHexString($bytes)) { throw "Findings exclusive-write reread mismatch: $Path" }
    Register-PlanECurrentRunArtifact -Path $Path
}
```

Invoke it exactly once for the first record, with
`$Path='.superpowers/sdd/plan-e-only-review-findings.md'` and the complete
reviewer-returned record as `$Text`, before starting Step 8. Do not use an
editor or a second write.

`$script:PlanEAuditHashes`, captured immediately after audit promotion, is the
freeze baseline. Immediately before each review dispatch and again before final
report validation, recompute both audit hashes and require exact equality; any
mismatch invalidates both reviews.
The mutable focused result and reviewed-head verification are also frozen at
audit generation. Capture their hashes and require exact equality before each
review dispatch and before final report validation; a change to either requires
regenerating both audits and both reviews.
After review dispatch, regenerate neither audit nor findings file; rerun only
strict validators. Any byte change requires discarding both reviews and starting
a fresh reviewed-head evidence run.

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
$frozenAuditHashes=[ordered]@{
    task_6=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
    task_7=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
}
if ($frozenAuditHashes['task_6'] -cne $script:PlanEAuditHashes['task_6'] -or $frozenAuditHashes['task_7'] -cne $script:PlanEAuditHashes['task_7']) { throw 'Frozen audit hash changed before review' }
$frozenMachineInputHashes=[ordered]@{
    focused=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
    verification=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/reviewed-head-verification.json').Hash.ToLowerInvariant()
}
if ($script:PlanECurrentRunArtifacts['.superpowers/sdd/focused-extension-results.json'] -cne $frozenMachineInputHashes.focused -or $script:PlanECurrentRunArtifacts['.superpowers/sdd/reviewed-head-verification.json'] -cne $frozenMachineInputHashes.verification -or $script:PlanEFrozenMachineInputHashes.focused -cne $frozenMachineInputHashes.focused -or $script:PlanEFrozenMachineInputHashes.verification -cne $frozenMachineInputHashes.verification) { throw 'Frozen audit machine input changed before review' }
```
Before final force-add, require both findings paths to be untracked, unstaged,
and ignored; after commit, require them tracked and hash-bound in the manifest
and report. Never leave either findings record ignored-only at completion.

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
foreach ($path in @('.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-findings.md')) {
    $tracked=@(& git ls-files -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect findings tracking: $path" }
    $staged=@(& git diff --cached --name-only --no-renames -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect findings staging: $path" }
    & git check-ignore -q -- $path
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 0 -or $staged.Count -ne 0) { throw "Findings path is not untracked/unstaged/ignored before force-add: $path" }
}
```

Under `Declared Session Proof Boundary`, put exactly: `These records prove only that two different declared orchestration session identifiers were recorded; they do not prove reviewer identity, dispatch, independence, or non-collusion.`

- [ ] **Step 8: Generate the original whole-branch interim review package**

Run this separate exact region in the same controller; do not substitute the Plan E base:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$originalBase='0040b1de1bc196b203014a8e4f94a53babb7e9aa'
& git cat-file -e "$originalBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Original review base is not a commit' }
$reviewHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve whole-branch review head' }
if ($reviewHead.Count -ne 1) { throw 'Whole-branch review head is ambiguous' }
$reviewHead=$reviewHead[0].Trim()
if ($reviewHead -cne $script:PlanEReviewedHead) { throw 'Whole-branch review head differs from the lease head' }
if ($reviewHead -notmatch '^[0-9a-f]{40}$') {
    throw 'Invalid whole-branch review head'
}
& git merge-base --is-ancestor $originalBase $reviewHead
if ($LASTEXITCODE -ne 0) { throw 'Original review base is not an ancestor' }
$reviewRange="$originalBase..$reviewHead"
$stat=@(& git diff --stat $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect whole-branch review stat' }
$log=@(& git log --reverse --oneline $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect whole-branch review log' }
$paths=@(& git diff --name-status --no-renames $reviewRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect whole-branch review paths' }
$package=@(
    'Review kind: original whole-branch interim through Plan E'
    "Review base: $originalBase"
    "Review head: $reviewHead"
    "Review range: $reviewRange"
    'Exact diff command: git diff --full-index --binary "' + $reviewRange + '"'
    ''
    '## Diff Stat'
) + $stat + @('', '## Commits') + $log + @('', '## Paths') + $paths
$packageText=($package -join "`n") + "`n"
$packagePath='.superpowers/sdd/original-whole-branch-interim-review-package.txt'
$packageTemp=Join-Path $script:PlanETempRoot 'original-whole-branch-interim-review-package.tmp'
$diffPath='.superpowers/sdd/original-whole-branch-interim-review.diff'
$diffTemp=Join-Path $script:PlanETempRoot 'original-whole-branch-interim-review.diff.tmp'
foreach ($path in @($packagePath,$packageTemp,$diffPath,$diffTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Whole-branch review output already exists: $path" }
}
try {
    Write-PlanERegisteredText -Path $packageTemp -Text $packageText -ExpectedPhase 'evidence'
    $null=Assert-PlanERegisteredMutationPath -Path $diffTemp -ExpectedPhase 'evidence'
    $diffExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('diff','--full-index','--binary',$reviewRange,("--output=" + $diffTemp)) -ExpectedWorkingDirectory (Get-Location).Path
    if ($diffExit -ne 0) { throw 'Could not write whole-branch review diff temporary' }
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $packageTemp),[Text.UTF8Encoding]::new($false)) -cne $packageText -or -not (Test-Path -LiteralPath $diffTemp -PathType Leaf)) { throw 'Whole-branch review temporary validation failed' }
    Move-PlanERegisteredPath -Source $packageTemp -Destination $packagePath -ExpectedPhase 'evidence'
    Move-PlanERegisteredPath -Source $diffTemp -Destination $diffPath -ExpectedPhase 'evidence'
} finally {
    if (Test-Path -LiteralPath $packageTemp) { Remove-PlanERegisteredPath -Path $packageTemp -ExpectedPhase 'evidence' }
    if (Test-Path -LiteralPath $diffTemp) { Remove-PlanERegisteredPath -Path $diffTemp -ExpectedPhase 'evidence' }
}
Register-PlanECurrentRunArtifacts -Paths @($packagePath,$diffPath)
```

The quoted original review command executed is exactly `git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..$reviewHead"`; the package records that resolved immutable head/range and never substitutes mutable `HEAD`. Expected output paths:

```text
.superpowers/sdd/original-whole-branch-interim-review-package.txt
.superpowers/sdd/original-whole-branch-interim-review.diff
.superpowers/sdd/original-whole-branch-interim-review-findings.md
```

Dispatch a second fresh `original_whole_branch_interim` review session after the
audits are frozen and after the first review record is complete. Independently
review the original-base diff, both audits, exact current-state checks/mutations,
and all
branch behavior, cross-plan contracts, security/trust boundaries,
ownership/order, verification coverage, evidence-loss honesty, and documentation
claims. Do not copy the Plan-E-only findings as a substitute, and do not claim
the later evidence commit already exists or is durable. Write
`.superpowers/sdd/original-whole-branch-interim-review-findings.md` with exact
headings `Review Session`, `Review Base`, `Review Head`, `Review Range`, `Task 6
Audit SHA-256`, `Task 7 Audit SHA-256`, `Historical-Report Availability Honesty`,
`No Reconstructed Historical TDD Claim`, `Git Lineage and Source-Blob Accuracy`,
`Current-State Test and Mutation Sufficiency`, `Artifact-Durability Contract
Adequacy and Prospective 58-Path Inventory Composition`, `Critical`, `Important`,
`Minor`, `Testing Gaps`, `Declared Session Proof Boundary`, `Plan D Rerun
Requirement`, and `Disposition`. Each
criterion contains only `PASS` or `FAIL`. `Plan D Rerun Requirement` must state:
`Rerun git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>" and the full original-base controller review after Plan D is committed and before any final whole-branch/release-readiness claim.`
`Disposition` may be `INTERIM PASS THROUGH PLAN E` only when all five criteria
are `PASS` and no Critical/Important finding remains; otherwise it is `BLOCKED`.
It must never say final whole-branch review complete.
Every whole-branch finding also has severity and file/line; empty sections use
`None.` and may not copy the first record.

Under `Review Session`, put one non-empty opaque orchestration session ID observed
by the controller from the orchestration result on the immediately following
line. Treat it as opaque and require only nonempty single-line text. It must differ from the
Plan-E-only declared ID. The two committed records prove only that two different
opaque identifiers were declared; they do not prove reviewer identity, actual
dispatch, independence, or non-collusion. Under `Review Base`, `Review Head`,
`Review Range`, and both audit-hash headings, put only the literal value on the
immediately following line. Under `Plan D Rerun Requirement`, put the exact
required sentence on the immediately following line. Under `Disposition`, put
only `INTERIM PASS THROUGH PLAN E` or `BLOCKED` on the immediately following
line. Use `None.` under an empty severity/testing section; do not omit a heading.
This file also begins with exact heading `## Review Session`; no prose precedes it.
It uses the same closed heading/body validation.
Under `Declared Session Proof Boundary`, use the same exact sentence required for the Plan-E-only record.
Create this second findings path with exclusive creation, flush/close it, then
register its exact hash as current-token-owned before final report generation.
The helper applies its per-record closed validator before writing; Step 10 then
validates both records together before report commitment.
Invoke `Write-PlanEFindingsRecord` exactly once with
`$Path='.superpowers/sdd/original-whole-branch-interim-review-findings.md'` and
the complete second reviewer-returned record as `$Text`; do not use an editor or
a second write.

The two controller reviews are separate completion gates. Resolve every
Critical/Important finding from either findings file in a separate focused
RED/GREEN/mutation commit. Keep the current lease/mutex, make and commit the
focused fix through `Invoke-PlanEWriter`, and validate its direct-parent,
`test(review):|fix(review):|docs(review):` subject, and closed path policy before
normal owner release. Then start a new mutex/lease run directly in `evidence`
phase and rerun Task 9 Steps 1-8 so exact range paths,
verification, audits, and both packages independently recompute the same later
committed product head and both reviews are repeated. Exception: if a finding requires any
further change to `host/update_engine.py` or `host/test_update_engine_resume.py`,
stop before editing and obtain a human-approved revision of the Windows promotion
spec and this plan. Reset/rebuild all promotion phase maps, transcripts, ledger,
AST record, and Host blob evidence under that revision. Ordinary review-fix flow
may not rewrite Host blobs while retaining old promotion evidence. Do not create
the evidence commit while either review is blocked or the two recorded heads
differ. Minor/testing risks remain recorded separately.
Any review fix changing product, test, plan, audit input, or reviewed head
invalidates both audits and both reviews; never amend findings over old audit
bytes.

After reverting every current-run product/test mutation used only for RED or
mutation proof, leave exactly the intended focused fix unstaged and run this
gate in the same live shell. This is the only authorized review-fix HEAD transition. It
clears current-run mutable evidence only after the commit is durable; owner
release then accepts exactly this validated direct child.

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
$reviewFixParent=$script:PlanEReviewedHead
$reviewFixChronology=@(& git rev-list --reverse "$script:PlanEPlanCommit..$reviewFixParent")
if ($LASTEXITCODE -ne 0 -or $reviewFixChronology.Count -lt 2) { throw 'BLOCKED: focused review-fix cannot resolve promotion chronology' }
$reviewFixImplementation=$reviewFixChronology[1]
$integrationPaths=@(& git diff --name-only --no-renames "0dbb4852931b50153fb898b03129ae0092c46404..$reviewFixImplementation")
if ($LASTEXITCODE -ne 0 -or $integrationPaths.Count -eq 0) { throw 'BLOCKED: focused review-fix cannot resolve the closed integration inventory' }
$preexistingStaged=@(& git diff --cached --name-only --no-renames)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: focused review-fix cannot inspect pre-existing staged paths' }
$reviewFixPaths=@(& git diff --name-only --no-renames | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: focused review-fix cannot inspect unstaged paths' }
$forbiddenFixPaths=@(
    $script:PlanEPlanPath,
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md',
    'host/update_engine.py',
    'host/test_update_engine_resume.py'
)
if ($preexistingStaged.Count -ne 0 -or $reviewFixPaths.Count -eq 0 -or @($reviewFixPaths | Where-Object { $integrationPaths -cnotcontains $_ -or $forbiddenFixPaths -ccontains $_ }).Count -ne 0) { throw 'BLOCKED: focused review-fix unstaged path policy mismatch' }
$reviewFixSubject='fix(review): resolve controller findings'
if ($reviewFixSubject -cnotmatch '^(test|fix|docs)\(review\): .+') { throw 'BLOCKED: focused review-fix subject policy mismatch' }
$reviewFixAddExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList (@('add','--') + $reviewFixPaths) -ExpectedWorkingDirectory (Get-Location).Path
if ($reviewFixAddExit -ne 0) { throw 'Focused review-fix staging failed' }
$stagedFixPaths=@(& git diff --cached --name-only --no-renames | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: focused review-fix cannot inspect staged paths' }
$dirtyUnstaged=@(& git diff --name-only --no-renames)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: focused review-fix cannot inspect remaining unstaged paths' }
if (($stagedFixPaths -join "`n") -cne ($reviewFixPaths -join "`n") -or $dirtyUnstaged.Count -ne 0) { throw 'BLOCKED: focused review-fix staged set differs from validated paths' }
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: focused review-fix staged diff check failed' }
$reviewFixCommitExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('commit','-m',$reviewFixSubject) -ExpectedWorkingDirectory (Get-Location).Path
if ($reviewFixCommitExit -ne 0) { throw 'Focused review-fix commit failed' }
$reviewFixHead=@(& git rev-parse HEAD)
$reviewFixParentObserved=@(& git rev-parse 'HEAD^')
$reviewFixSubjectObserved=@(& git show -s --format=%s HEAD)
$reviewFixPathsObserved=@(& git diff-tree --no-commit-id --name-only --no-renames -r HEAD | Sort-Object)
$reviewFixStatus=@(& git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or $reviewFixHead.Count -ne 1 -or $reviewFixHead[0].Trim() -notmatch '^[0-9a-f]{40}$' -or $reviewFixParentObserved.Count -ne 1 -or $reviewFixParentObserved[0].Trim() -cne $reviewFixParent -or $reviewFixSubjectObserved.Count -ne 1 -or $reviewFixSubjectObserved[0] -cne $reviewFixSubject -or ($reviewFixPathsObserved -join "`n") -cne ($stagedFixPaths -join "`n") -or $reviewFixStatus.Count -ne 0) { throw 'BLOCKED: focused review-fix commit metadata mismatch' }
$script:PlanEAuthorizedReviewFixHead=$reviewFixHead[0].Trim()
Assert-PlanERunLease -ExpectedPhase 'evidence'
foreach ($path in @($script:PlanECurrentRunArtifacts.Keys)) {
    if ($script:PlanEMutableArtifacts -cnotcontains $path -or -not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "BLOCKED: review-fix invalidation artifact is outside current ownership: $path" }
    $tracked=@(& git ls-files -- $path)
    if ($LASTEXITCODE -ne 0) { throw "BLOCKED: could not inspect review-fix artifact tracking: $path" }
    $staged=@(& git diff --cached --name-only --no-renames -- $path)
    if ($LASTEXITCODE -ne 0) { throw "BLOCKED: could not inspect review-fix artifact staging: $path" }
    $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($tracked.Count -ne 0 -or $staged.Count -ne 0 -or $hash -cne $script:PlanECurrentRunArtifacts[$path]) { throw "BLOCKED: review-fix invalidation artifact ownership mismatch: $path" }
    Remove-PlanERegisteredPath -Path $path -ExpectedPhase 'evidence'
    if (Test-Path -LiteralPath $path) { throw "BLOCKED: invalidated review-fix artifact remains: $path" }
    [void]$script:PlanECurrentRunArtifacts.Remove($path)
}
$remainingReviewFixMutable=@($script:PlanEMutableArtifacts | Where-Object { Test-Path -LiteralPath $_ })
if ($remainingReviewFixMutable.Count -ne 0) { throw "BLOCKED: unregistered mutable evidence remains after review-fix invalidation: $($remainingReviewFixMutable -join ', ')" }
```

- [ ] **Step 9: Write the final evidence report with exact observed output**

Before creating the report, run the final-artifact manifest generation block
published in Step 10 against the completed packages/findings and all promotion
artifacts. Record the resulting manifest SHA in the report. Then create
`.superpowers/sdd/plan-e-extension-hardening-report.md` with these completed
sections and only observed values:

Create the report with exclusive `FileMode.CreateNew`, flush/close it, and
immediately register it as current-token-owned. Any later completed report write
must use the owned update helper; writing over a pre-existing unowned report is
forbidden.

```powershell
Assert-PlanERunLease -ExpectedPhase 'evidence'
function Write-PlanEFinalReport {
    param([Parameter(Mandatory=$true)][string]$Text)
    Assert-PlanERunLease -ExpectedPhase 'evidence'
    $path='.superpowers/sdd/plan-e-extension-hardening-report.md'
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($Text -replace "`r`n","`n").TrimEnd("`n") + "`n")
    Write-PlanERegisteredExclusiveBytes -Path $path -Bytes $bytes -ExpectedPhase 'evidence'
    if ([Convert]::ToHexString([IO.File]::ReadAllBytes((Join-Path (Get-Location) $path))) -cne [Convert]::ToHexString($bytes)) { throw 'Final report exclusive-write reread mismatch' }
    Register-PlanECurrentRunArtifact -Path $path
}
```

After replacing every template marker in memory and only after the manifest hash
is known, invoke `Write-PlanEFinalReport -Text $completeReport` exactly once. A
post-creation correction requires the documented owner-only update helper plus
complete revalidation; it is never an unowned editor write. The normal path does
not perform a post-creation correction: validate and complete `$completeReport`
before this one exclusive write.

The canonical root inventory is exactly 58 paths in every generator and
validator: 24 fixed final-verification artifacts (including both findings
files), six exact historical reports (Tasks 1-5 and 8), two current-state audit
JSON files (Tasks 6 and 7), and 26 promotion transcript leaves. The manifest
does not inventory itself or the final report. No repeated inventory may differ
in membership or bytewise sorted order.
The 26 leaves remain eight promotion RED, eight promotion GREEN, five promotion
mutation-failure, and five restored-GREEN files. Task 6/7 current mutation rows
live inside audit JSON, while their exact output text and hashes live inside the
existing focused-result aggregate; neither changes the transcript path inventory.
Literal count invariant: `24 + 6 + 2 + 26 = 58`; adding manifest and report
yields `58 + 2 = 60` committed evidence paths.
Never reduce 58 to fit local availability; only the two authorized report-slot
replacements are permitted.
Manifest validators apply duplicate-key/non-finite/canonical-byte rejection and
require every value to be lowercase 64-hex SHA-256.
The original Task 6/7 report hashes remain declarations only: the manifest
contains the two audit paths instead and contains neither absent report path.
The generator and both manifest validators enforce this exact slot replacement.

The reviewed-product integration inventory is likewise one exact bytewise
sorted 61-path set wherever repeated: the prior 60 paths plus only
`docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md`.
The evidence child contributes 60 previously absent paths, and the literal-base
to final-head union is exactly 121 paths.
Literal relation: `61 reviewed product paths + 60 previously absent evidence
paths = 121 base-to-final paths`.
The two sets are disjoint; validators prove every evidence path was absent at the
reviewed parent.
The amendment spec is a reviewed-product path, never a 58-manifest artifact.

After each mutable final artifact is atomically promoted or each findings/report
file is closed, call `Register-PlanECurrentRunArtifact -Path <exact-path>` once.
If the report is intentionally completed in multiple writes, register it after
exclusive creation, require ownership before every later write, then call
`Update-PlanECurrentRunArtifact` after each closed write. The only other
authorized registered rewrites are the one mutation-binding replacement of
`focused-extension-results.json` and the corresponding one-field hash update in
`reviewed-head-verification.json`; both use the same owner helper and freeze
before audit generation. No other mutable artifact may be rewritten after
registration.
Immediately before final force-add, require the registered path set equals all
14 lease-listed mutable artifacts and every registered SHA-256 still matches.
The other 46 evidence paths are immutable Step 0 chronology/transcripts plus six
surviving reports and are validated by their locked maps/hashes before staging.

The two findings files already occupy two of these 24 fixed slots; committing
them does not increase the 58 count. The 24 fixed paths are exactly:

```text
.superpowers/sdd/focused-extension-results.json
.superpowers/sdd/full-extension-results.json
.superpowers/sdd/host-test-results.json
.superpowers/sdd/invoke-promotion-test.ps1
.superpowers/sdd/original-whole-branch-interim-review.diff
.superpowers/sdd/original-whole-branch-interim-review-findings.md
.superpowers/sdd/original-whole-branch-interim-review-package.txt
.superpowers/sdd/plan-e-only-review.diff
.superpowers/sdd/plan-e-only-review-findings.md
.superpowers/sdd/plan-e-only-review-package.txt
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
.superpowers/sdd/reviewed-head-verification.json
.superpowers/sdd/run-promotion-mutations.ps1
```

Before manifest promotion, derive this fixed subset from `$roots` by excluding
the six report paths, two audit paths, and 26 transcript leaves; require exactly
these 24 literal paths.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$manifestPath='.superpowers/sdd/final-artifacts.sha256.json'
$manifestTemp=Join-Path $script:PlanETempRoot 'final-artifacts.sha256.tmp'
if ((Test-Path -LiteralPath $manifestPath) -or (Test-Path -LiteralPath $manifestTemp)) {
    throw 'Final artifact manifest or temporary already exists; run the documented mutable-result reset first'
}
$roots=@(
    '.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1',
    '.superpowers/sdd/promotion-executor.sha256','.superpowers/sdd/promotion-mutation-runner.sha256',
    '.superpowers/sdd/promotion-red-source.sha256','.superpowers/sdd/promotion-green-source.sha256',
    '.superpowers/sdd/promotion-mutation-source.sha256','.superpowers/sdd/promotion-observed.json',
    '.superpowers/sdd/promotion-ledger.json','.superpowers/sdd/promotion-transcripts.sha256.json',
    '.superpowers/sdd/promotion-red.sha256.json','.superpowers/sdd/promotion-green.sha256.json',
    '.superpowers/sdd/promotion-mutation.sha256.json','.superpowers/sdd/promotion-ast.sha256',
    '.superpowers/sdd/focused-extension-results.json','.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json','.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/plan-e-only-review-package.txt','.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/task-6-audit-evidence.json'
)
$roots += @(
    '.superpowers/sdd/task-1-report.md',
    '.superpowers/sdd/task-2-report.md',
    '.superpowers/sdd/task-3-report.md',
    '.superpowers/sdd/task-4-report.md',
    '.superpowers/sdd/task-5-report.md',
    '.superpowers/sdd/task-7-audit-evidence.json',
    '.superpowers/sdd/task-8-report.md'
)
$transcriptRoot=Join-Path (Get-Location) '.superpowers/sdd/promotion-transcripts'
$expectedTranscriptMethods=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen'
)
$expectedMutationMethods=[ordered]@{classification='test_windows_access_denied_retries_atomic_preparing_promotion';bound='test_persistent_windows_promotion_lock_stops_after_three_attempts';initial='test_preparing_promotion_revalidates_before_and_after_sleep';'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch';'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'}
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@()
foreach ($method in $expectedTranscriptMethods) { $expectedTranscriptFiles += "red/$method.txt"; $expectedTranscriptFiles += "green/$method.txt" }
foreach ($entry in $expectedMutationMethods.GetEnumerator()) { $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"; $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$rootInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ }); $extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ })
$missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ }); $extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if ($rootInfo -isnot [IO.DirectoryInfo] -or ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $unsupportedTranscriptEntries.Count -ne 0 -or $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0) { throw 'Final-manifest transcript topology mismatch' }
$roots += @($actualTranscriptFiles | ForEach-Object { '.superpowers/sdd/promotion-transcripts/' + $_ })
$roots=@($roots | Sort-Object -Unique)
if ($roots.Count -ne 58) { throw "Final artifact path count mismatch: $($roots.Count)" }
if ($roots -ccontains '.superpowers/sdd/task-6-report.md' -or $roots -ccontains '.superpowers/sdd/task-7-report.md' -or $roots -cnotcontains '.superpowers/sdd/task-6-audit-evidence.json' -or $roots -cnotcontains '.superpowers/sdd/task-7-audit-evidence.json') { throw 'Final artifact Task 6/7 slot replacement mismatch' }
$observedManagedFiles=@()
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $info=Get-Item -LiteralPath $path -Force
    if (($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Final artifact is a reparse point: $path" }
    $observedManagedFiles += $path
}
$observedManagedFiles=@($observedManagedFiles | Sort-Object -Unique)
if ($observedManagedFiles.Count -ne 58 -or ($observedManagedFiles -join "`n") -cne ($roots -join "`n")) { throw 'Final-manifest exact artifact inventory mismatch' }
$manifest=[ordered]@{}
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $manifest[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
}
$lockedSurvivingHashes=[ordered]@{
    '.superpowers/sdd/task-1-report.md'='678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba'
    '.superpowers/sdd/task-2-report.md'='edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7'
    '.superpowers/sdd/task-3-report.md'='5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591'
    '.superpowers/sdd/task-4-report.md'='5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2'
    '.superpowers/sdd/task-5-report.md'='323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73'
    '.superpowers/sdd/task-8-report.md'='3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b'
}
foreach ($entry in $lockedSurvivingHashes.GetEnumerator()) { if ($manifest[$entry.Key] -cne $entry.Value) { throw "Surviving report hash mismatch before manifest promotion: $($entry.Key)" } }
if ((@($manifest.Keys) -join "`n") -cne ($roots -join "`n")) { throw 'Manifest insertion order differs from sorted root inventory' }
$manifestCanonicalizer=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or any(type(k) is not str or type(v) is not str or re.fullmatch(r'[0-9a-f]{64}',v) is None for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonical=@((ConvertTo-Json $manifest -Compress) | & 'host\venv\Scripts\python.exe' -c $manifestCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $canonical.Count -ne 1) { throw 'Could not canonicalize final artifact manifest' }
try {
    Write-PlanERegisteredText -Path $manifestTemp -Text ($canonical[0] + "`n") -ExpectedPhase 'evidence'
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $manifestTemp),[Text.UTF8Encoding]::new($false))
    $strict=@($tempText | & 'host\venv\Scripts\python.exe' -c $manifestCanonicalizer)
    if ($LASTEXITCODE -ne 0 -or $strict.Count -ne 1 -or $tempText -cne $strict[0] + "`n" -or (Test-Path -LiteralPath $manifestPath)) { throw 'Final manifest atomic promotion precondition failed' }
    Move-PlanERegisteredPath -Source $manifestTemp -Destination $manifestPath -ExpectedPhase 'evidence'
} finally { if (Test-Path -LiteralPath $manifestTemp) { Remove-PlanERegisteredPath -Path $manifestTemp -ExpectedPhase 'evidence' } }
& git check-ignore -q -- $manifestPath
if ($LASTEXITCODE -ne 0) { throw 'Final artifact manifest is not ignored' }
Register-PlanECurrentRunArtifact -Path $manifestPath
$manifestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
"Final artifact manifest SHA-256: $manifestHash"
```

This manifest generation occurs after both findings files are final and before
the report, because the findings occupy two fixed manifest slots. The report
then binds the manifest hash; the manifest intentionally cannot include the
report or itself, avoiding a hash cycle.
Final readiness separately verifies the report's working/committed blob identity
and computes its actual SHA-256.


```markdown
# Plan E Extension Data and Request Hardening Report

**Integration base:** `0dbb4852931b50153fb898b03129ae0092c46404`
**Final reviewed product head:** `<40-lowercase-hex reviewed head>`

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

Replace all bracketed labels with observed commit IDs. Record the immutable declared 61-path reviewed-product range, all three correction/amendment specs, both plan revisions, Tasks 1-8, controller fixes, and the promotion retry commits. Record exact surviving Task 1-5/8 report hashes. For Task 6 and Task 7 include exactly these forms with their actual audit hashes:
Use one exact `**Task N report SHA-256:**` line for each surviving Task 1-5/8
report; Task 6/7 use only the amendment forms below.

```text
**Task 6 historical report expected SHA-256:** `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef`
**Task 6 historical report availability:** `UNRECOVERABLE`
**Task 6 audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`
**Task 6 audit evidence SHA-256:** `<64-lowercase-hex generated audit hash>`
**Task 7 historical report expected SHA-256:** `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f`
**Task 7 historical report availability:** `UNRECOVERABLE`
**Task 7 audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`
**Task 7 audit evidence SHA-256:** `<64-lowercase-hex generated audit hash>`
```

The report token is exact uppercase `UNRECOVERABLE`; audit JSON uses exact
lowercase enum `unrecoverable`. Validators reject any other casing or value.
The final report replaces each audit-hash placeholder with the actual lowercase
SHA-256 of the frozen file; audits do not contain circular self-hashes.

Under `Historical Report Availability and Current-State Audits`, also include:

```text
**Task 6 current-state checks:** `PASS`
**Task 6 current-state mutations:** `PASS` - 2/2
**Task 7 current-state checks:** `PASS`
**Task 7 current-state mutations:** `PASS` - 1/1
```

The final report must not state that Task 6/7 historical RED, GREEN, mutation, reviewer, edit ordering, or TDD chronology was recovered, recreated, replayed, reproduced, or proved. Their entries in `RED Evidence` and `Restored Mutation Evidence` say only that the historical narrative report is unavailable and point to the current-state audit section; current checks are never historical evidence. Preserve the full RED/GREEN/mutation evidence for Tasks 1-5, Task 8, and the authorized Windows promotion retry, including every promotion checkpoint mutation, clean full Host rerun, stale-D blocker, and frozen handoff contracts. Include exact machine totals, skips, reviewed-head hash, and all PASS gates. Durably summarize each findings file's review kind, opaque declared Review Session, base, head, range, findings-file SHA-256, both audit SHA-256 values, disposition, five `PASS` criteria, zero open Critical/Important findings, and exact Minor/Testing-Gaps counts plus hashes. State that different declared IDs prove only the recorded values, not identity, dispatch, independence, or non-collusion. Preserve the exact post-Plan-D rerun requirement and all forbidden-operation attestations.
The final report validator recomputes that review metadata from the exact
findings bytes to be staged, then the staged-blob gate proves those exact bytes
entered the index; never derive it from controller memory or package prose.
Report review-kind enums are exact `plan_e_only` and
`original_whole_branch_interim`, regardless of human-readable package labels.
Their exact dispositions are respectively `PASS` and `INTERIM PASS THROUGH PLAN
E`; either becomes `BLOCKED` under the criterion/high-severity rule.
Every report hash line uses lowercase 64-hex from exact current/staged bytes;
missing or duplicate lines fail.

Under `Skipped Unsafe Operations`, state exactly that no real Chrome storage,
registry, `%LOCALAPPDATA%\DynamicsHelper`, update, package, publish, install,
MyCases, authenticated model, push, or tag operation occurred.

In `RED Evidence` and `Restored Mutation Evidence`, the exact Task 6/7 exception
lines are respectively `Task 6 historical report unavailable` and `Task 7
historical report unavailable`; add no RED/GREEN/mutation reconstruction prose
for either task.
`Historical Report Availability and Current-State Audits` is the only report
section that interprets the audit claim boundary; RED/mutation sections carry
only those unavailable lines.
`Historical Report Availability and Current-State Audits` also states that both
exact report paths were absent and not recovered from the historical reads,
recovery data, Git objects, bundles, rescued workspaces, and filesystem evidence
examined by the accepted investigation, without assigning a deletion time or
responsible operation.

- [ ] **Step 10: Validate both review records, self-review evidence, and commit the exact evidence set**

Review the report against spec sections 6-10, 11.3-11.4, and 13 Plan E plus all three correction/amendment specs, explicitly checking all 15 sections of the accepted evidence-loss amendment. Search for bracketed labels, incomplete markers, unsupported claims, missing RED/mutation evidence (including every promotion checkpoint mutation), dishonest Task 6/7 historical reconstruction claims, missing 61-path reviewed-product inventory, missing exact 60-path evidence-commit contract, merged/missing review findings, any claim that final whole-branch review is complete, and mismatched totals; correct every occurrence. Then run:

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$requiredReviewArtifacts=@(
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
if ($requiredReviewArtifacts.Count -ne 6 -or $requiredReviewArtifacts.Count -ne @($requiredReviewArtifacts | Sort-Object -Unique).Count) { throw 'Review artifact inventory count/uniqueness mismatch' }
$evidencePath='.superpowers/sdd/plan-e-extension-hardening-report.md'
if (-not (Test-Path -LiteralPath $evidencePath -PathType Leaf)) {
    throw 'Plan E evidence report is missing'
}
$evidence=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) $evidencePath),
    [Text.UTF8Encoding]::new($false)
)
$evidenceHeadings=@(
    'Scope and Constraints','Commit Map','Requirement-to-Test Matrix',
    'A-C Prerequisite and Plan D Handoff Evidence',
    'Historical Report Availability and Current-State Audits','RED Evidence',
    'Restored Mutation Evidence','Focused Extension Results',
    'Full Extension and Build Results','Isolated Host Results',
    'Static and Diff Results','Plan D Handoff Result',
    'Plan-E-Only Controller Review Findings',
    'Original Whole-Branch Interim Review Findings',
    'Plan D Final Whole-Branch Rerun Requirement','Plan E Review Readiness',
    'Skipped Unsafe Operations','Residual Risks'
)
$normalizedEvidence=$evidence -replace "`r`n","`n"
$headingMatches=[regex]::Matches($normalizedEvidence,'(?m)^## ([^\n]+)$')
$actualEvidenceHeadings=@($headingMatches | ForEach-Object { $_.Groups[1].Value })
if (($actualEvidenceHeadings -join "`n") -cne ($evidenceHeadings -join "`n")) {
    throw 'Plan E evidence heading order/set mismatch'
}
if ([regex]::Matches($normalizedEvidence,'(?m)^# Plan E Extension Data and Request Hardening Report$').Count -ne 1) {
    throw 'Plan E evidence title mismatch'
}
$evidenceSections=@{}
for ($index=0; $index -lt $headingMatches.Count; $index++) {
    $heading=$headingMatches[$index].Groups[1].Value
    $start=$headingMatches[$index].Index + $headingMatches[$index].Length
    $end=if ($index + 1 -lt $headingMatches.Count) { $headingMatches[$index + 1].Index } else { $normalizedEvidence.Length }
    $body=$normalizedEvidence.Substring($start,$end-$start).Trim()
    if ([string]::IsNullOrWhiteSpace($body)) { throw "Plan E evidence section is empty: $heading" }
    $evidenceSections[$heading]=$body
}
$taskReportHashes=[ordered]@{}
$expectedTaskReportHashes=[ordered]@{
    '1'='678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba'
    '2'='edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7'
    '3'='5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591'
    '4'='5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2'
    '5'='323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73'
    '6'='3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef'
    '7'='49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f'
    '8'='3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b'
}
if ($expectedTaskReportHashes.Count -ne 8 -or (@($expectedTaskReportHashes.Keys) -join ',') -cne '1,2,3,4,5,6,7,8') { throw 'Final locked Task report hash inventory mismatch' }
foreach ($number in @(1,2,3,4,5,8)) {
    $path=".superpowers/sdd/task-$number-report.md"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Task report missing: $path" }
    $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($hash -cne $expectedTaskReportHashes[[string]$number]) { throw "Task report changed after task review: $number" }
    $taskReportHashes["Task $number report SHA-256"]=$hash
}
foreach ($entry in $taskReportHashes.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence task report hash mismatch: $($entry.Key)"
    }
}
foreach ($number in @(6,7)) {
    $historicalPath=".superpowers/sdd/task-$number-report.md"
    if (Test-Path -LiteralPath $historicalPath) { throw "Task $number historical report path must remain absent" }
    $auditPath=".superpowers/sdd/task-$number-audit-evidence.json"
    if (-not (Test-Path -LiteralPath $auditPath -PathType Leaf)) { throw "Task $number replacement audit is missing" }
    $auditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $auditPath).Hash.ToLowerInvariant()
    foreach ($line in @(
        ('**Task ' + $number + ' historical report expected SHA-256:** `' + $expectedTaskReportHashes[[string]$number] + '`'),
        ('**Task ' + $number + ' historical report availability:** `UNRECOVERABLE`'),
        ('**Task ' + $number + ' audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`'),
        ('**Task ' + $number + ' audit evidence SHA-256:** `' + $auditHash + '`')
    )) {
        if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final evidence Task $number audit boundary mismatch" }
    }
}
$task6Audit=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/task-6-audit-evidence.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
$task7Audit=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/task-7-audit-evidence.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
if ($task6Audit['audit_subject']['commit'] -cne $task7Audit['audit_subject']['commit']) { throw 'Task 6/7 audit subjects differ' }
if ($task6Audit['historical_report']['expected_sha256'] -cne $expectedTaskReportHashes['6'] -or $task7Audit['historical_report']['expected_sha256'] -cne $expectedTaskReportHashes['7']) { throw 'Audit historical report hash declarations changed' }
$testEvidenceValidator=@'
# REVIEWED_TEST_EVIDENCE_VALIDATOR_START
import hashlib,json,pathlib,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
def validate_counts(value,rows,name):
    required={'numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests'}
    if not required.issubset(value): raise SystemExit(name+' missing counter')
    for key,counter in value.items():
        if key.startswith('num') and (type(counter) is not int or counter<0): raise SystemExit(name+' invalid counter '+key)
    if value['numTotalTestSuites']!=value['numPassedTestSuites']+value['numFailedTestSuites']+value['numPendingTestSuites']: raise SystemExit(name+' suite counter relationship')
    if value['numTotalTests']!=value['numPassedTests']+value['numFailedTests']+value['numPendingTests']+value['numTodoTests']: raise SystemExit(name+' test counter relationship')
    if value['numTotalTestSuites']<len(rows) or value['numPassedTestSuites']!=value['numTotalTestSuites']: raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
def strict(path):
    text=pathlib.Path(path).read_text(encoding='utf-8')
    value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
    if '\r' in text or text.startswith('\ufeff') or text!=json.dumps(value,ensure_ascii=True,allow_nan=False,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(path+' noncanonical')
    return value
focused_aggregate,full,host,verification=map(strict,sys.argv[1:5])
head=sys.argv[5]
arguments=sys.argv[6:]
task6_index=arguments.index('--task-6'); task7_index=arguments.index('--task-7'); full_index=arguments.index('--full')
expected_files={
    'plan_e_focused':arguments[:task6_index],
    'task_6_current':arguments[task6_index+1:task7_index],
    'task_7_current':arguments[task7_index+1:full_index],
    'full':arguments[full_index+1:],
}
if type(focused_aggregate) is not dict or set(focused_aggregate)!={'current_mutation_outputs','reviewed_head','schema_version','suites'} or type(focused_aggregate.get('schema_version')) is not int or focused_aggregate.get('schema_version')!=1 or focused_aggregate.get('reviewed_head')!=head: raise SystemExit('focused aggregate shape/head')
suites=focused_aggregate.get('suites')
if type(suites) is not dict or list(suites)!=['plan_e_focused','task_6_current','task_7_current']: raise SystemExit('focused aggregate suites')
mutation_outputs=focused_aggregate.get('current_mutation_outputs')
if type(mutation_outputs) is not dict or list(mutation_outputs)!=['task_6_busy_identity_scan_disabled','task_6_direct_identity_accessor','task_7_explicit_empty_truthy_only']: raise SystemExit('focused aggregate mutation outputs')
for name,row in mutation_outputs.items():
    if type(row) is not dict or set(row)!={'failure_output','failure_sha256','restored_output','restored_sha256','test_title'} or any(type(row.get(key)) is not str or not row[key] for key in row) or any(re.fullmatch(r'[0-9a-f]{64}',row[key]) is None for key in ('failure_sha256','restored_sha256')): raise SystemExit('focused aggregate mutation output '+name)
    for output_key,hash_key in (('failure_output','failure_sha256'),('restored_output','restored_sha256')):
        if hashlib.sha256(row[output_key].encode('utf-8')).hexdigest()!=row[hash_key]: raise SystemExit('focused aggregate mutation output hash '+name)
for name,value in list(suites.items())+[('full',full)]:
    if type(value) is not dict: raise SystemExit(name+' shape')
    if name=='full' and value.get('reviewed_head')!=head: raise SystemExit(name+' reviewed head')
    rows=value.get('testResults')
    if type(rows) is not list or not rows or any(type(row) is not dict for row in rows): raise SystemExit(name+' rows')
    validate_counts(value,rows,name)
    row_keys=[json.dumps(row,sort_keys=True,separators=(',',':')) for row in rows]
    if len(row_keys)!=len(set(row_keys)): raise SystemExit(name+' duplicate testResults row')
    def rel(row):
        path=row.get('name')
        if type(path) is not str: raise SystemExit(name+' path type')
        path=path.replace('\\','/')
        return path.rsplit('/extension/',1)[1] if '/extension/' in path else path.removeprefix('extension/')
    observed=[rel(row) for row in rows]
    expected=expected_files[name]
    if len(observed)!=len(set(observed)) or len(expected)!=len(set(expected)) or set(observed)!=set(expected) or len(observed)!=len(expected): raise SystemExit(name+' exact inventory')
    if value.get('success') is not True or value.get('numFailedTests')!=0 or value.get('numFailedTestSuites')!=0 or value.get('numPendingTests')!=0 or value.get('numPendingTestSuites')!=0 or value.get('numTodoTests')!=0: raise SystemExit(name+' Vitest status')
    if value.get('numTotalTests')!=value.get('numPassedTests') or value.get('numTotalTests',0)<1: raise SystemExit(name+' count')
    for row in rows:
        if row.get('status')!='passed': raise SystemExit(name+' suite status')
        assertions=row.get('assertionResults')
        if type(assertions) is not list or not assertions or any(type(item) is not dict or item.get('status')!='passed' for item in assertions): raise SystemExit(name+' pending/todo/skipped test')
authorized=[{'selector':'host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation','reason':'DH_PLAN_C_FROZEN_ONEDIR not set'}]
expected_skips={'focused':[],'task_7_current':[],'full':authorized,'update_engine':[],'recovery':authorized,'package':[]}
if type(host) is not dict or set(host)!={'schema_version','reviewed_head','focused','task_7_current','full','compile','update_engine','recovery','package'} or type(host.get('schema_version')) is not int or host.get('schema_version')!=1 or host.get('reviewed_head')!=head or host.get('compile')!='passed': raise SystemExit('Host result shape')
for name,skips in expected_skips.items():
    row=host.get(name)
    if type(row) is not dict or set(row)!={'tests','skipped','skips','passed_selectors'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or row['skipped']!=len(skips) or row.get('skips')!=skips or type(row.get('passed_selectors')) is not list or row['passed_selectors']!=sorted(row['passed_selectors']) or len(row['passed_selectors'])!=len(set(row['passed_selectors'])) or len(row['passed_selectors'])!=row['tests']-row['skipped']: raise SystemExit(name+' Host exact skips/count/selectors')
required={'focused_extension','full_extension','host','host_compile','typescript','build','static','diff'}
verification_keys={'schema_version','reviewed_head','tested_source_roots','tested_source_blobs','focused_extension','full_extension','host','host_compile','typescript','build','static','diff','machine_result_sha256','test_summary'}
roots=['extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat']
if type(verification) is not dict or set(verification)!=verification_keys or type(verification.get('schema_version')) is not int or verification.get('schema_version')!=1 or verification.get('reviewed_head')!=head or verification.get('tested_source_roots')!=roots or any(verification.get(key)!='passed' for key in required) or type(verification.get('tested_source_blobs')) is not dict or not verification['tested_source_blobs']: raise SystemExit('reviewed-head verification status/head/shape')
machine_hashes=verification.get('machine_result_sha256')
if type(machine_hashes) is not dict or set(machine_hashes)!={'focused_extension','full_extension','host'} or any(type(value) is not str or re.fullmatch(r'[0-9a-f]{64}',value) is None for value in machine_hashes.values()): raise SystemExit('reviewed-head machine-result hashes')
summary=verification.get('test_summary')
if type(summary) is not dict or set(summary)!={'focused_extension','full_extension','host'}: raise SystemExit('reviewed-head verification summary shape')
focused_expected={suite_name:{'files':len(value['testResults']),'tests':value['numTotalTests']} for suite_name,value in suites.items()}
if summary.get('focused_extension')!=focused_expected: raise SystemExit('focused_extension summary counters')
full_expected={'files':len(full['testResults']),'tests':full['numTotalTests']}
if summary.get('full_extension')!=full_expected: raise SystemExit('full_extension summary counters')
if summary.get('host')!={name:host[name] for name in ('focused','task_7_current','full','update_engine','recovery','package')}: raise SystemExit('reviewed-head verification Host summary')
print(*(item for suite in suites.values() for item in (suite['numTotalTests'],len(suite['testResults']))),full['numTotalTests'],len(full['testResults']),*(host[name][key] for name in ('focused','task_7_current','full','update_engine','recovery','package') for key in ('tests','skipped')))
# REVIEWED_TEST_EVIDENCE_VALIDATOR_END
'@
$reviewPackageForTests=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-package.txt'),[Text.UTF8Encoding]::new($false))
$testReviewedHead=[regex]::Match($reviewPackageForTests,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
if ($testReviewedHead -notmatch '^[0-9a-f]{40}$') { throw 'Could not resolve reviewed head for test evidence' }
if ($task6Audit['audit_subject']['commit'] -cne $testReviewedHead -or $task7Audit['audit_subject']['commit'] -cne $testReviewedHead) { throw 'Audit subject differs from reviewed test head' }
$expectedFocusedForEvidence=@(
    'src/utils/ownData.test.ts','src/utils/bookmarkItems.test.ts','src/components/Options.test.tsx',
    'src/components/MenuLogic.teamCache.test.ts','src/utils/teamCatalog.test.ts','src/background/teamManifestSync.test.ts',
    'src/utils/analysisStore.test.ts','src/background/analyzeBridge.test.ts','src/background/analyzeRequestHandler.test.ts',
    'src/background/nativeMessageWire.test.ts','src/hooks/useAnalysisHydration.test.ts','src/utils/promptSourceErrors.test.ts',
    'src/utils/pageIdentity.test.ts','src/utils/analyzeRequest.test.ts','src/background/contextMenu.test.ts',
    'src/components/ResultPopover.test.tsx','src/components/FAB.pageIdentity.test.tsx','src/components/FAB.analyzeRequest.test.tsx',
    'src/components/FAB.spinner.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/utils/nativeUpdateError.test.ts',
    'src/utils/configUpdateResult.test.ts','src/background/resetExtensionState.test.ts','src/content/updateErrorBridge.test.ts'
)
$expectedTask6FocusedForEvidence=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts')
$expectedTask7FocusedForEvidence=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts')
$expectedFullForEvidence=@(& git ls-tree -r --name-only $testReviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $expectedFullForEvidence.Count -lt 1) { throw 'Could not inventory final full Extension tests' }
$testEvidence=@($testEvidenceValidator | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' '.superpowers/sdd/reviewed-head-verification.json' $testReviewedHead @expectedFocusedForEvidence '--task-6' @expectedTask6FocusedForEvidence '--task-7' @expectedTask7FocusedForEvidence '--full' @expectedFullForEvidence)
if ($LASTEXITCODE -ne 0 -or $testEvidence.Count -ne 1) { throw 'Final machine test evidence validation failed' }
$verificationText=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/reviewed-head-verification.json'),[Text.UTF8Encoding]::new($false))
$verification=$verificationText | ConvertFrom-Json -AsHashtable
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$sourcePaths=@(& git ls-tree -r --name-only $testReviewedHead -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $sourcePaths.Count -lt 1 -or
    ($sourcePaths -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0 -or
    $verification.tested_source_blobs.Count -ne $sourcePaths.Count
) { throw 'Reviewed-head verification tested-source inventory mismatch' }
foreach ($path in $sourcePaths) {
    $blob=@(& git rev-parse "$testReviewedHead`:$path")
    $working=@(& git hash-object -- $path)
    if (
        $LASTEXITCODE -ne 0 -or $blob.Count -ne 1 -or $working.Count -ne 1 -or
        -not $verification.tested_source_blobs.ContainsKey($path) -or
        $verification.tested_source_blobs[$path] -cne $blob[0].Trim() -or
        $working[0].Trim() -cne $blob[0].Trim()
    ) { throw "Reviewed-head verification source blob mismatch: $path" }
}
$expectedMachineHashes=[ordered]@{
    focused_extension=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
    full_extension=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/full-extension-results.json').Hash.ToLowerInvariant()
    host=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/host-test-results.json').Hash.ToLowerInvariant()
}
foreach ($entry in $expectedMachineHashes.GetEnumerator()) {
    if ($verification.machine_result_sha256[$entry.Key] -cne $entry.Value) { throw "Reviewed-head machine-result hash mismatch: $($entry.Key)" }
}
$testCounts=@($testEvidence[0] -split ' ' | ForEach-Object { [int]$_ })
if ($testCounts.Count -ne 20) { throw 'Final machine test evidence count vector is invalid' }
foreach ($line in @(
    ('**Focused Extension gate:** `PASS` - ' + $testCounts[0] + ' tests, ' + $testCounts[1] + ' files'),
    ('**Task 6 current-state Extension gate:** `PASS` - ' + $testCounts[2] + ' tests, ' + $testCounts[3] + ' files'),
    ('**Task 7 current-state Extension gate:** `PASS` - ' + $testCounts[4] + ' tests, ' + $testCounts[5] + ' files'),
    ('**Full Extension gate:** `PASS` - ' + $testCounts[6] + ' tests, ' + $testCounts[7] + ' files'),
    ('**Focused Host gate:** `PASS` - ' + $testCounts[8] + ' tests, ' + $testCounts[9] + ' skipped'),
    ('**Task 7 current-state Host gate:** `PASS` - ' + $testCounts[10] + ' tests, ' + $testCounts[11] + ' skipped'),
    ('**Fresh isolated full Host gate:** `PASS` - ' + $testCounts[12] + ' tests, ' + $testCounts[13] + ' skipped'),
    ('**Update-engine Host gate:** `PASS` - ' + $testCounts[14] + ' tests, ' + $testCounts[15] + ' skipped'),
    ('**Recovery Host gate:** `PASS` - ' + $testCounts[16] + ' tests, ' + $testCounts[17] + ' skipped'),
    ('**Package Host gate:** `PASS` - ' + $testCounts[18] + ' tests, ' + $testCounts[19] + ' skipped')
)) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence machine test count mismatch: $line"
    }
}
$authorizedSkipSelector='host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation'
$authorizedSkipReason='DH_PLAN_C_FROZEN_ONEDIR not set'
foreach ($line in @(
    ('**Full Host authorized skip:** `' + $authorizedSkipSelector + '` - `' + $authorizedSkipReason + '`'),
    ('**Recovery Host authorized skip:** `' + $authorizedSkipSelector + '` - `' + $authorizedSkipReason + '`'),
    '**Focused/Task-7-current/update-engine/package Host skips:** `0`',
    ('**Reviewed-head verification:** `PASS` - ' + $testReviewedHead),
    '**TypeScript gate:** `PASS`',
    '**Production build gate:** `PASS`',
    '**Static scan gate:** `PASS`',
    '**Diff gate:** `PASS`'
)) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence reviewed-head/skip line mismatch: $line"
    }
}
foreach ($section in @('RED Evidence','Restored Mutation Evidence')) {
    foreach ($number in @(1,2,3,4,5,8)) {
        if (-not $evidenceSections[$section].Contains("Task $number")) {
            throw "$section omits Task $number"
        }
    }
}
$auditSection=$evidenceSections['Historical Report Availability and Current-State Audits']
$incidentBoundary='not recovered from the historical reads, recovery data, Git objects, bundles, rescued workspaces, and filesystem evidence examined by the accepted investigation'
if (-not $auditSection.Contains($incidentBoundary) -or $auditSection -match '(?i)(deleted (at|on|during)|caused by|responsible)') { throw 'Final evidence incident boundary is incomplete or overclaims causation' }
$noUserImpact='no user configuration, Chrome storage, prompt, case, installed product, authentication, or release artifact is affected'
if (-not $auditSection.Contains($noUserImpact)) { throw 'Final evidence omits the internal-only incident boundary' }
$scopeBoundary='current immutable commit/state only; historical tdd timeline not reconstructed'
if (($auditSection.ToLowerInvariant().Split($scopeBoundary).Count - 1) -lt 2) { throw 'Final evidence does not state both Task 6/7 current-only claim boundaries' }
$requiredTask67MarkerLines=@()
foreach ($number in @(6,7)) {
    $auditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath ".superpowers/sdd/task-$number-audit-evidence.json").Hash.ToLowerInvariant()
    $requiredTask67MarkerLines += @(
        ('**Task ' + $number + ' historical report expected SHA-256:** `' + $expectedTaskReportHashes[[string]$number] + '`'),
        ('**Task ' + $number + ' historical report availability:** `UNRECOVERABLE`'),
        ('**Task ' + $number + ' audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`'),
        ('**Task ' + $number + ' audit evidence SHA-256:** `' + $auditHash + '`')
    )
}
$actualTask67MarkerLines=@($normalizedEvidence -split "`n" | Where-Object { $_ -match '^\*\*Task [67] (?:historical report expected SHA-256|historical report availability|audit scope|audit evidence SHA-256):\*\*' })
if ($requiredTask67MarkerLines.Count -ne 8 -or $actualTask67MarkerLines.Count -ne 8 -or @($actualTask67MarkerLines | Where-Object { $requiredTask67MarkerLines -cnotcontains $_ }).Count -ne 0) { throw 'Final evidence Task 6/7 exact marker inventory mismatch' }
foreach ($line in $requiredTask67MarkerLines) {
    if ([regex]::Matches($normalizedEvidence,'(?m)^' + [regex]::Escape($line) + '$').Count -ne 1) { throw "Final evidence Task 6/7 marker is missing or duplicated: $line" }
}
$allowedUnavailableLines=@('Task 6 historical report unavailable','Task 7 historical report unavailable')
foreach ($sectionName in @('RED Evidence','Restored Mutation Evidence')) {
    $task67Lines=@($evidenceSections[$sectionName] -split "`n" | Where-Object { $_ -match '(?i)Task\s*(?:6|7)|historical' })
    if ($task67Lines.Count -ne 2 -or @($task67Lines | Where-Object { $allowedUnavailableLines -cnotcontains $_ }).Count -ne 0 -or @($allowedUnavailableLines | Where-Object { $task67Lines -cnotcontains $_ }).Count -ne 0) { throw "$sectionName contains non-allowlisted Task 6/7 historical text" }
}
$allowedTask67ClaimLines=@($requiredTask67MarkerLines + $allowedUnavailableLines | Sort-Object -Unique)
function Get-PlanELocalHistoricalStatements {
    param([Parameter(Mandatory=$true)][string]$Text,[Parameter(Mandatory=$true)][string[]]$AllowedLines)
    $normalizedText=(($Text -replace "`r`n","`n") -replace "`r","`n")
    $remainingLines=@()
    foreach ($line in @($normalizedText -split "`n")) {
        if ($AllowedLines -ccontains $line.Trim()) { $remainingLines += '' } else { $remainingLines += $line }
    }
    $remaining=$remainingLines -join "`n"
    $headingMatches=[regex]::Matches($remaining,'(?m)^#{1,6}\s+[^\n]+$')
    $regions=[Collections.Generic.List[string]]::new()
    if ($headingMatches.Count -eq 0) { $regions.Add($remaining) }
    else {
        if ($headingMatches[0].Index -gt 0) { $regions.Add($remaining.Substring(0,$headingMatches[0].Index)) }
        for ($index=0; $index -lt $headingMatches.Count; $index++) {
            $start=$headingMatches[$index].Index + $headingMatches[$index].Length
            $end=if ($index + 1 -lt $headingMatches.Count) { $headingMatches[$index + 1].Index } else { $remaining.Length }
            $regions.Add($remaining.Substring($start,$end-$start))
        }
    }
    $statements=[Collections.Generic.List[string]]::new()
    foreach ($region in $regions) {
        foreach ($paragraph in @([regex]::Split($region,'\n[ \t]*\n+'))) {
            $normalizedParagraph=[regex]::Replace($paragraph,'\s+',' ').Trim()
            if ([string]::IsNullOrWhiteSpace($normalizedParagraph)) { continue }
            foreach ($sentence in @([regex]::Split($normalizedParagraph,'(?<=[.!?])\s+(?=\S)'))) {
                $statement=$sentence.Trim()
                if (-not [string]::IsNullOrWhiteSpace($statement)) { $statements.Add($statement) }
            }
        }
    }
    return @($statements)
}
function Test-PlanEUnsupportedHistoricalClaim {
    param([Parameter(Mandatory=$true)][string]$Text,[Parameter(Mandatory=$true)][string[]]$AllowedLines)
    $taskPattern='(?i)\btask\s*(?:6|7)\b'
    $chronologyPattern='(?i)\b(?:historical|red|green|mutation|tdd|test[\s-]*first|edit\s+ordering|reviewer\s+timeline|chronology)\b'
    $positivePattern='(?i)\b(?:recover(?:s|ed|ing)?|reconstruct(?:s|ed|ing|ion)?|recreat(?:e|es|ed|ing|ion)|reproduc(?:e|es|ed|ing|tion)|replay(?:s|ed|ing)?|re[\s-]*run(?:s|ning)?|reran|replicat(?:e|es|ed|ing|ion)|demonstrat(?:e|es|ed|ing|ion)|establish(?:es|ed|ing)?|confirm(?:s|ed|ing|ation)?|verif(?:y|ies|ied|ying|ication|ications)|prov(?:e|es|ed|ing|en)|validat(?:e|es|ed|ing|ion))\b'
    foreach ($statement in @(Get-PlanELocalHistoricalStatements -Text $Text -AllowedLines $AllowedLines)) {
        if ($statement -notmatch $taskPattern -or $statement -notmatch $chronologyPattern) { continue }
        foreach ($verb in [regex]::Matches($statement,$positivePattern)) {
            $prefix=$statement.Substring(0,$verb.Index)
            $boundaries=[regex]::Matches($prefix,'(?i)(?:[.;!?]|\bbut\b|\bhowever\b|\byet\b|\band\b(?=\s+[^.!?;]{0,80}\b(?:was|were|is|are|has|have|had|did|can|could|would|should)\b))')
            if ($boundaries.Count -gt 0) { $boundary=$boundaries[$boundaries.Count-1];$prefix=$prefix.Substring($boundary.Index+$boundary.Length) }
            $localPrefix=[regex]::Replace($prefix,'\s+',' ').Trim()
            $directNegation=$localPrefix -match '(?i)(?:\b(?:not|never|cannot|can''t)\b|\bcan\s+not\b|\b(?:did|was|were|is|are|has|have|had|can|could|would|should)\s+not\b)(?:\s+(?:be|been|being|have|having|had)(?:\s+been)?)?$'
            $withoutNegation=$localPrefix -match '(?i)\bwithout\s+(?:being|having(?:\s+been)?)\s*$'
            $initialNoClause=$false
            if ($statement -match '(?i)^\s*No\b' -and $statement -notmatch '(?i)^\s*No\s+doubt\b') {
                $clause=$statement.Substring(0,$verb.Index+$verb.Length)
                $hasBoundary=$clause -match '(?i)(?:[.;!?]|\bbut\b|\bhowever\b|\byet\b|\band\b(?=\s+[^.!?;]{0,80}\b(?:was|were|is|are|has|have|had|did|can|could|would|should)\b))'
                $hasPassive=$prefix -match '(?i)\b(?:was|were|is|are|be|been|being|has\s+been|have\s+been|had\s+been)\s*$'
                $initialNoClause=-not $hasBoundary -and $hasPassive -and $clause -match $taskPattern -and $clause -match $chronologyPattern
            }
            if (-not $directNegation -and -not $withoutNegation -and -not $initialNoClause) { return $true }
        }
    }
    return $false
}
$honestHistoricalSelfTest=(@($requiredTask67MarkerLines + $allowedUnavailableLines) -join "`n")
if (Test-PlanEUnsupportedHistoricalClaim -Text $honestHistoricalSelfTest -AllowedLines $allowedTask67ClaimLines) { throw 'Historical-claim detector rejects required honest Task 6/7 text' }
$neutralHistoricalClaims=@(
    'Task 6 historical report was not recovered.',
    'Task 7 historical GREEN was never replayed.',
    'The locked Task 6 historical report hash is retained; current-state mutation checks are separate.',
    'No historical RED for Task 6 was reproduced.',
    'Task 7 GREEN was not rerun.',
    'Task 6 historical mutation was not verified.',
    'Task 7 historical TDD was documented without being recreated.'
)
foreach ($claim in $neutralHistoricalClaims) { if (Test-PlanEUnsupportedHistoricalClaim -Text $claim -AllowedLines $allowedTask67ClaimLines) { throw "Historical-claim detector rejects neutral text: $claim" } }
$adversarialHistoricalClaims=@(
    'The historical RED for Task 6 was reproduced.',
    'Task 7 GREEN was rerun',
    'Task 6 historical mutation was demonstrated',
    'TDD chronology for Task 7 was confirmed',
    'Task 6 historical RED was recreated',
    'Task 7 GREEN was verified',
    'Historical mutation for Task 6 was proven',
    'No doubt Task 6 historical RED was recreated',
    'Task 7 historical GREEN was discussed without caveat and was verified',
    "Task 6`nhistorical mutation`nwas replayed",
    "Validated`nwas the GREEN chronology`nfor Task 7",
    'Established: mutation, historical, Task 6.',
    'The TDD record was replicated for Task 7.'
)
foreach ($claim in $adversarialHistoricalClaims) { if (-not (Test-PlanEUnsupportedHistoricalClaim -Text $claim -AllowedLines $allowedTask67ClaimLines)) { throw "Historical-claim detector missed adversarial wording: $claim" } }
$fullReportHistoricalSelfTest=@(
    '# Plan E Report',
    '## Historical Report Availability and Current-State Audits',
    $requiredTask67MarkerLines[0],$requiredTask67MarkerLines[1],$requiredTask67MarkerLines[2],$requiredTask67MarkerLines[3],
    'Task 6 and Task 7 implementation commits remain reachable.',
    $requiredTask67MarkerLines[4],$requiredTask67MarkerLines[5],$requiredTask67MarkerLines[6],$requiredTask67MarkerLines[7],
    '',
    '## Promotion Evidence',
    'The promotion mutation replay demonstrated the retry bound.',
    '',
    '## Current Task Mutation Evidence',
    'Task 4 TDD chronology was confirmed by its own current tests.',
    '',
    '## Separate Paragraph Context',
    'Task 6 implementation commits remain reachable. Promotion mutation was demonstrated separately.',
    '',
    'Historical mutation was demonstrated only for the promotion retry.'
) -join "`n"
if (Test-PlanEUnsupportedHistoricalClaim -Text $fullReportHistoricalSelfTest -AllowedLines $allowedTask67ClaimLines) { throw 'Historical-claim detector combines unrelated full-report regions' }
if (Test-PlanEUnsupportedHistoricalClaim -Text $evidence -AllowedLines $allowedTask67ClaimLines) { throw 'Final evidence contains an unsupported positive Task 6/7 historical claim' }
foreach ($line in @(
    '**Task 6 current-state checks:** `PASS`',
    '**Task 6 current-state mutations:** `PASS` - 2/2',
    '**Task 7 current-state checks:** `PASS`',
    '**Task 7 current-state mutations:** `PASS` - 1/1'
)) {
    if ([regex]::Matches($auditSection,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final audit summary mismatch: $line" }
}
foreach ($number in @(6,7)) {
    if (-not $auditSection.Contains("Task $number") -or [regex]::Matches($evidenceSections['RED Evidence'],'(?m)^' + [regex]::Escape("Task $number historical report unavailable") + '\r?$').Count -ne 1 -or [regex]::Matches($evidenceSections['Restored Mutation Evidence'],'(?m)^' + [regex]::Escape("Task $number historical report unavailable") + '\r?$').Count -ne 1) {
        throw "Final evidence does not apply the honest Task $number historical exception"
    }
}
$ledgerPath='.superpowers/sdd/promotion-ledger.json'
if (-not (Test-Path -LiteralPath $ledgerPath -PathType Leaf)) { throw 'Promotion ledger is missing' }
$actualPlanCommit=@($script:PlanEPlanCommit)
if ($actualPlanCommit.Count -ne 1 -or $actualPlanCommit[0] -notmatch '^[0-9a-f]{40}$') { throw 'Could not resolve amendment promotion plan commit' }
$executorHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/invoke-promotion-test.ps1').Hash.ToLowerInvariant()
$runnerHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/run-promotion-mutations.ps1').Hash.ToLowerInvariant()
$expectedRed=@(
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once'
)
$expectedGreen=@($expectedRed + 'test_update_engine_constructor_signature_remains_frozen')
$ledgerValidator=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def exact(actual, expected, path='root'):
    if type(actual) is not type(expected):
        raise SystemExit(f'type mismatch at {path}')
    if isinstance(expected, dict):
        if set(actual) != set(expected): raise SystemExit(f'key mismatch at {path}')
        for key in expected: exact(actual[key], expected[key], f'{path}.{key}')
    elif isinstance(expected, list):
        if len(actual) != len(expected): raise SystemExit(f'length mismatch at {path}')
        for index,(left,right) in enumerate(zip(actual,expected)): exact(left,right,f'{path}[{index}]')
    elif actual != expected:
        raise SystemExit(f'value mismatch at {path}')
path, plan, executor, runner, test_commit, promotion, engine_hash, test_hash, observed_hash, map_hash, red_map_hash, green_map_hash, mutation_map_hash, red_source_hash, green_source_hash, mutation_source_hash, ast_hash = sys.argv[1:]
text=open(path,encoding='utf-8').read()
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
red=['test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once']
expected={'schema_version':1,'plan_commit':plan,'spec_commit':'249b1a3750b50db1336fb39661db9306355a1a18','executor_sha256':executor,'mutation_runner_sha256':runner,'red_methods':red,'constructor_red_phase':'passed','green_methods':red+['test_update_engine_constructor_signature_remains_frozen'],'mutation_passes':['classification','bound','initial','pre-sleep','post-sleep'],'attempts':{'transient_then_success':2,'exhausted':3},'delays':{'transient_then_success':[0.05],'exhausted':[0.05,0.2]},'checkpoint_calls':{'first_success':1,'one_retry':3,'exhausted':5},'hook_counts':{'retry_success':{'before':1,'after':1},'exhausted':{'before':1,'after':0}},'state_and_cause':'passed','test_commit':test_commit,'promotion_commit':promotion,'update_engine_sha256':engine_hash,'update_engine_test_sha256':test_hash,'observed_sha256':observed_hash,'transcript_map_sha256':map_hash,'red_map_sha256':red_map_hash,'green_map_sha256':green_map_hash,'mutation_map_sha256':mutation_map_hash,'red_source_record_sha256':red_source_hash,'green_source_record_sha256':green_source_hash,'mutation_source_record_sha256':mutation_source_hash,'ast_record_sha256':ast_hash}
exact(value,expected)
canonical=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n'
if text != canonical: raise SystemExit('promotion ledger is not canonical')
'@
$testCommitFromEvidence=[regex]::Match($evidence,'(?m)^\*\*Promotion test commit:\*\* `PASS` - 1 path - ([0-9a-f]{40})\r?$').Groups[1].Value
$promotionCommitFromEvidence=[regex]::Match($evidence,'(?m)^\*\*Promotion implementation commit:\*\* `PASS` - 1 path - ([0-9a-f]{40})\r?$').Groups[1].Value
if ($testCommitFromEvidence -notmatch '^[0-9a-f]{40}$' -or $promotionCommitFromEvidence -notmatch '^[0-9a-f]{40}$') { throw 'Promotion commit evidence is missing' }
$engineHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/update_engine.py').Hash.ToLowerInvariant()
$testHash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'host/test_update_engine_resume.py').Hash.ToLowerInvariant()
$promotionEngineBlob=@(& git rev-parse "$promotionCommitFromEvidence`:host/update_engine.py")
$promotionTestBlob=@(& git rev-parse "$testCommitFromEvidence`:host/test_update_engine_resume.py")
$headEngineBlob=@(& git rev-parse "HEAD:host/update_engine.py")
$headTestBlob=@(& git rev-parse "HEAD:host/test_update_engine_resume.py")
if (
    $LASTEXITCODE -ne 0 -or
    @(@($promotionEngineBlob,$promotionTestBlob,$headEngineBlob,$headTestBlob) | Where-Object { $_.Count -ne 1 }).Count -ne 0 -or
    $promotionEngineBlob[0].Trim() -cne $headEngineBlob[0].Trim() -or
    $promotionTestBlob[0].Trim() -cne $headTestBlob[0].Trim()
) { throw 'Reviewed Host blobs differ from promotion evidence commit' }
$observedHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-observed.json').Hash.ToLowerInvariant()
$transcriptMapHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-transcripts.sha256.json').Hash.ToLowerInvariant()
$finalSourceHashes=$headEngineBlob[0].Trim() + ' ' + $headTestBlob[0].Trim()
foreach ($path in @('.superpowers/sdd/promotion-green-source.sha256','.superpowers/sdd/promotion-mutation-source.sha256')) {
    $value=[IO.File]::ReadAllText((Join-Path (Get-Location) $path),[Text.UTF8Encoding]::new($false)).Trim()
    if ($value -cne $finalSourceHashes) { throw "Promotion phase source hash mismatch: $path" }
}
$redSource=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/promotion-red-source.sha256'),[Text.UTF8Encoding]::new($false)).Trim()
if ($redSource -notmatch '^[0-9a-f]{40} [0-9a-f]{40}$') { throw 'Promotion RED source blob record invalid' }
$baseEngineBlob=@(& git rev-parse '0dbb4852931b50153fb898b03129ae0092c46404:host/update_engine.py')
if ($LASTEXITCODE -ne 0 -or $baseEngineBlob.Count -ne 1) { throw 'Could not resolve base engine blob' }
if ($redSource -cne "$($baseEngineBlob[0].Trim()) $($promotionTestBlob[0].Trim())") { throw 'Promotion RED source chronology mismatch' }
$redMapHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-red.sha256.json').Hash.ToLowerInvariant()
$greenMapHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-green.sha256.json').Hash.ToLowerInvariant()
$mutationMapHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-mutation.sha256.json').Hash.ToLowerInvariant()
$redSourceHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-red-source.sha256').Hash.ToLowerInvariant()
$greenSourceHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-green-source.sha256').Hash.ToLowerInvariant()
$mutationSourceHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-mutation-source.sha256').Hash.ToLowerInvariant()
$astRecordHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-ast.sha256').Hash.ToLowerInvariant()
$observedValidator=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
def exact(a,e,p='root'):
    if type(a) is not type(e): raise SystemExit('type '+p)
    if isinstance(e,dict):
        if set(a)!=set(e): raise SystemExit('keys '+p)
        for k in e: exact(a[k],e[k],p+'.'+k)
    elif isinstance(e,list):
        if len(a)!=len(e): raise SystemExit('length '+p)
        for i,(x,y) in enumerate(zip(a,e)): exact(x,y,f'{p}[{i}]')
    elif a!=e: raise SystemExit('value '+p)
value=json.load(open(sys.argv[1],encoding='utf-8'),object_pairs_hook=pairs,parse_constant=reject_constant)
expected={'attempts':{'transient_then_success':2,'exhausted':3},'delays':{'transient_then_success':[0.05],'exhausted':[0.05,0.2]},'checkpoint_calls':{'first_success':1,'one_retry':3,'exhausted':5},'hook_counts':{'retry_success':{'before':1,'after':1},'exhausted':{'before':1,'after':0}},'state_and_cause':'passed'}
exact(value,expected)
'@
& 'host\venv\Scripts\python.exe' -c $observedValidator '.superpowers/sdd/promotion-observed.json'
if ($LASTEXITCODE -ne 0) { throw 'Promotion observed JSON validation failed at final gate' }
& 'host\venv\Scripts\python.exe' -c $ledgerValidator $ledgerPath $actualPlanCommit[0].Trim() $executorHash $runnerHash $testCommitFromEvidence $promotionCommitFromEvidence $engineHash $testHash $observedHash $transcriptMapHash $redMapHash $greenMapHash $mutationMapHash $redSourceHash $greenSourceHash $mutationSourceHash $astRecordHash
if ($LASTEXITCODE -ne 0) { throw 'Promotion ledger validation failed' }
foreach ($requiredText in @(
    '2026-07-28-windows-preparing-promotion-retry-design.md',
    'fix(update): retry locked preparing promotion',
    'PROMOTION_RETRY_DELAYS = (0.05, 0.2)',
    'PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))',
    '61 paths',
    'WinError 5',
    'initial revalidation',
    'pre-sleep revalidation',
    'post-sleep revalidation'
)) {
    if (-not $evidence.Contains($requiredText)) {
        throw "Plan E evidence omits promotion requirement: $requiredText"
    }
}
foreach ($requiredPattern in @(
    '(?m)^\*\*Windows promotion retry RED:\*\* `PASS` - seven assertion failures and one constructor pass\r?$',
    '(?m)^\*\*Windows promotion retry GREEN:\*\* `PASS` - 8/8\r?$',
    '(?m)^\*\*Promotion attempts and delays:\*\* `PASS` - 2 attempts/\[0\.05\] and 3 attempts/\[0\.05, 0\.2\]\r?$',
    '(?m)^\*\*Promotion checkpoint mutations:\*\* `PASS` - classification, bound, initial, pre-sleep, post-sleep; all restored byte-identical\r?$',
    '(?m)^\*\*Promotion conflict cause/state:\*\* `PASS` - final OSError cause, preparing exact, final/active absent, live unchanged\r?$',
    '(?m)^\*\*Promotion AST/constructor audit:\*\* `PASS`\r?$',
    '(?m)^\*\*Promotion test commit:\*\* `PASS` - 1 path - [0-9a-f]{40}\r?$',
    '(?m)^\*\*Promotion implementation commit:\*\* `PASS` - 1 path - [0-9a-f]{40}\r?$',
    '(?m)^\*\*Expanded Plan E range:\*\* `PASS` - 61 paths\r?$',
    '(?m)^\*\*Base-to-final range:\*\* `PASS` - 121 paths\r?$',
    '(?m)^\*\*Final evidence commit contract:\*\* `PASS` - 60 paths - docs\(verification\): record Plan E hardening evidence\r?$',
    '(?m)^\*\*Task 6 current-state Extension gate:\*\* `PASS` - [1-9][0-9]* tests, 4 files\r?$',
    '(?m)^\*\*Task 7 current-state Extension gate:\*\* `PASS` - [1-9][0-9]* tests, 7 files\r?$',
    '(?m)^\*\*Task 7 current-state Host gate:\*\* `PASS` - [1-9][0-9]* tests, 0 skipped\r?$',
    '(?m)^\*\*Fresh isolated full Host gate:\*\* `PASS` - [1-9][0-9]* tests, [0-9]+ skipped\r?$'
)) {
    $matches=[regex]::Matches($evidence,$requiredPattern)
    if ($matches.Count -ne 1) {
        throw "Plan E evidence promotion PASS line is missing or duplicated: $requiredPattern"
    }
}
$artifactHashes=[ordered]@{
    'Promotion executor SHA-256'=$executorHash
    'Promotion mutation runner SHA-256'=$runnerHash
    'Promotion observed SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-observed.json').Hash.ToLowerInvariant()
    'Promotion transcript map SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-transcripts.sha256.json').Hash.ToLowerInvariant()
    'Promotion ledger SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath $ledgerPath).Hash.ToLowerInvariant()
    'Promotion RED map SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-red.sha256.json').Hash.ToLowerInvariant()
    'Promotion GREEN map SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-green.sha256.json').Hash.ToLowerInvariant()
    'Promotion mutation map SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-mutation.sha256.json').Hash.ToLowerInvariant()
    'Promotion AST record SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/promotion-ast.sha256').Hash.ToLowerInvariant()
    'Focused Extension result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
    'Full Extension result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/full-extension-results.json').Hash.ToLowerInvariant()
    'Host test result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/host-test-results.json').Hash.ToLowerInvariant()
    'Reviewed-head verification SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/reviewed-head-verification.json').Hash.ToLowerInvariant()
    'Task 6 audit evidence SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
    'Task 7 audit evidence SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
}
$frozenAuditHashesAtReport=[ordered]@{
    task_6=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
    task_7=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
}
if ($frozenAuditHashesAtReport['task_6'] -cne $script:PlanEAuditHashes['task_6'] -or $frozenAuditHashesAtReport['task_7'] -cne $script:PlanEAuditHashes['task_7']) { throw 'Audit hash changed before final report validation' }
$machineInputHashesAtReport=[ordered]@{
    focused=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/focused-extension-results.json').Hash.ToLowerInvariant()
    verification=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/reviewed-head-verification.json').Hash.ToLowerInvariant()
}
if ($null -eq $script:PlanEFrozenMachineInputHashes -or $machineInputHashesAtReport.focused -cne $script:PlanEFrozenMachineInputHashes.focused -or $machineInputHashesAtReport.verification -cne $script:PlanEFrozenMachineInputHashes.verification) { throw 'Audit machine input changed before final report validation' }
$script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - validate '.superpowers/sdd/task-6-audit-evidence.json'
if ($LASTEXITCODE -ne 0) { throw 'Task 6 audit failed strict final-report validation' }
$script:PlanEAuditProgram | & 'host\venv\Scripts\python.exe' - validate '.superpowers/sdd/task-7-audit-evidence.json'
if ($LASTEXITCODE -ne 0) { throw 'Task 7 audit failed strict final-report validation' }
$audit6ForReport=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/task-6-audit-evidence.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
$audit7ForReport=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/task-7-audit-evidence.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
if ($audit6ForReport['verification']['checks'].Count -ne 1 -or $audit7ForReport['verification']['checks'].Count -ne 2 -or $audit6ForReport['verification']['current_mutations'].Count -ne 2 -or $audit7ForReport['verification']['current_mutations'].Count -ne 1) { throw 'Final report audit check/mutation cardinality mismatch' }
foreach ($entry in $artifactHashes.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence artifact hash mismatch: $($entry.Key)"
    }
}
if ($evidence -match '\[(observed|insert|TO' + 'DO|T' + 'BD)[^\]]*\]') {
    throw 'Plan E evidence retains a placeholder'
}
if ($evidence -match '<(?:40|64)-lowercase-hex') { throw 'Final evidence retains a hash placeholder' }
$testCommitMatch=[regex]::Match(
    $evidence,
    '(?m)^\*\*Promotion test commit:\*\* `PASS` - 1 path - ([0-9a-f]{40})\r?$'
)
$promotionCommitMatch=[regex]::Match($evidence,'(?m)^\*\*Promotion implementation commit:\*\* `PASS` - 1 path - ([0-9a-f]{40})\r?$')
if (-not $testCommitMatch.Success -or -not $promotionCommitMatch.Success) { throw 'Could not resolve promotion commits from evidence' }
$testCommit=$testCommitMatch.Groups[1].Value
$promotionCommit=$promotionCommitMatch.Groups[1].Value
if ($promotionCommitFromEvidence -cne $promotionCommit) { throw 'Promotion evidence commit mismatch' }
if ($testCommitFromEvidence -cne $testCommit) { throw 'Promotion test evidence commit mismatch' }
$subject=@(& git show -s --format=%s $promotionCommit)
if (
    $LASTEXITCODE -ne 0 -or
    $subject.Count -ne 1 -or
    $subject[0] -cne 'fix(update): retry locked preparing promotion'
) { throw 'Promotion commit subject is invalid' }
$promotionPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $promotionCommit)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion commit paths' }
$expectedPromotionPaths=@('host/update_engine.py')
if (
    $promotionPaths.Count -ne 1 -or
    @($expectedPromotionPaths | Where-Object { $promotionPaths -cnotcontains $_ }).Count -ne 0 -or
    @($promotionPaths | Where-Object { $expectedPromotionPaths -cnotcontains $_ }).Count -ne 0
) { throw 'Promotion commit path set is invalid' }
$testPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $testCommit)
$testSubject=@(& git show -s --format=%s $testCommit)
if ($LASTEXITCODE -ne 0 -or $testPaths.Count -ne 1 -or $testPaths[0] -cne 'host/test_update_engine_resume.py' -or $testSubject.Count -ne 1 -or $testSubject[0] -cne 'test(update): cover locked preparing promotion') {
    throw 'Promotion test commit is invalid'
}
& git merge-base --is-ancestor $testCommit $promotionCommit
if ($LASTEXITCODE -ne 0) { throw 'Promotion implementation does not descend from RED test commit' }
$testParent=@(& git rev-parse "$testCommit^")
$promotionParent=@(& git rev-parse "$promotionCommit^")
if (
    $LASTEXITCODE -ne 0 -or $testParent.Count -ne 1 -or $promotionParent.Count -ne 1 -or
    $testParent[0].Trim() -cne $actualPlanCommit[0].Trim() -or
    $promotionParent[0].Trim() -cne $testCommit
) { throw 'Promotion TDD commits are not the direct plan -> RED -> implementation chain' }
$replayRoot=Join-Path $script:PlanETempRoot 'worktrees\promotion-red-replay'
$replayOwner=Join-Path $script:PlanETempRoot 'worktree-owners\promotion-red-replay.json'
$replayOwnerTemp=Join-Path $script:PlanETempRoot "worktree-owners\.promotion-red-replay.$script:PlanEToken.tmp"
$replayBeforeBlob=(@(& git rev-parse "$testCommit`:host/test_update_engine_resume.py")[0].Trim())
$replayExpectedHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes("promotion-red-replay:$testCommit`n"))).ToLowerInvariant()
$replayRegistered=@(& git worktree list --porcelain | Where-Object { $_ -like 'worktree *' } | ForEach-Object { [IO.Path]::GetFullPath($_.Substring(9)) })
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion RED replay registrations' }
if ((Test-Path -LiteralPath $replayRoot) -or (Test-Path -LiteralPath $replayOwner) -or (Test-Path -LiteralPath $replayOwnerTemp) -or $replayRegistered -ccontains [IO.Path]::GetFullPath($replayRoot)) {
    throw 'BLOCKED: promotion RED replay resources already exist'
}
$replayError=$null
$replayCleanupError=$null
$isolation=Join-Path $script:PlanETempRoot 'promotion-red-replay-environment'
$savedLocation=(Get-Location).Path
try {
    New-PlanERegisteredDirectory -Path (Split-Path -Parent $replayRoot) -ExpectedPhase 'evidence' -Parents
    New-PlanERegisteredDirectory -Path (Split-Path -Parent $replayOwner) -ExpectedPhase 'evidence' -Parents
    Write-PlanEExclusiveCanonicalFile -Path $replayOwnerTemp -Value ([ordered]@{
        allowed_source_path='host/test_update_engine_resume.py'
        before_blob=$replayBeforeBlob
        expected_mutated_sha256=$replayExpectedHash
        lease_token=$script:PlanEToken
        mutation_id='promotion_red_replay'
        reviewed_head=$script:PlanEReviewedHead
        schema_version=1
        worktree_head=$testCommit
        worktree_path=[IO.Path]::GetFullPath($replayRoot)
    })
    Move-PlanERegisteredPath -Source $replayOwnerTemp -Destination $replayOwner -ExpectedPhase 'evidence'
    $replayOwnerCheck=Read-PlanEWorktreeOwner -Path $replayOwner
    if ($replayOwnerCheck.lease_token -cne $script:PlanEToken -or $replayOwnerCheck.reviewed_head -cne $script:PlanEReviewedHead -or $replayOwnerCheck.worktree_head -cne $testCommit -or $replayOwnerCheck.worktree_path -cne [IO.Path]::GetFullPath($replayRoot) -or $replayOwnerCheck.mutation_id -cne 'promotion_red_replay' -or $replayOwnerCheck.allowed_source_path -cne 'host/test_update_engine_resume.py' -or $replayOwnerCheck.before_blob -cne $replayBeforeBlob -or $replayOwnerCheck.expected_mutated_sha256 -cne $replayExpectedHash) { throw 'BLOCKED: promoted RED replay owner mismatch' }
        $replayAddExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('worktree','add','--detach',$replayRoot,$testCommit) -ExpectedWorkingDirectory (Get-Location).Path
        if ($replayAddExit -ne 0) { throw 'Could not create promotion RED replay worktree' }
    $python=$script:PlanEPythonCommand
    Push-Location -LiteralPath $replayRoot
    try {
        New-PlanERegisteredDirectory -Path $isolation -ExpectedPhase 'evidence'
        $replayEnvironment=[ordered]@{PYTHONPATH=(Join-Path $replayRoot 'host');PYTHONDONTWRITEBYTECODE='1';DH_PROMOTION_EVIDENCE=$null}
        foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
            $value=Join-Path $isolation $name.ToLowerInvariant()
            New-PlanERegisteredDirectory -Path $value -ExpectedPhase 'evidence'
            $replayEnvironment[$name]=$value
        }
        Invoke-PlanEEnvironmentScope -Context 'promotion RED replay tests' -Overrides $replayEnvironment -Body {
            foreach ($method in $expectedRed) {
                $selector="host.test_update_engine_resume.PreparingPromotionRetryTests.$method"
                $execution=Invoke-PlanERedirectedWriter -FilePath $python -ArgumentList @('-m','unittest',$selector,'-v') -ExpectedWorkingDirectory (Get-Location).Path
                $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
                $text=$lines -join "`n"
                if (
                    $execution.exit_code -ne 1 -or
                    [regex]::Matches($text,('(?m)^' + [regex]::Escape($method) + ' .* \.\.\. FAIL\r?$')).Count -ne 1 -or
                    [regex]::Matches($text,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or
                    [regex]::Matches($text,'(?m)^FAILED \(failures=1\)\r?$').Count -ne 1 -or
                    $text -cmatch '(?m)(^ERROR:|\bskipped\b)'
                ) { throw "Promotion RED replay did not fail correctly: $method" }
            }
            $selector='host.test_update_engine_resume.PreparingPromotionRetryTests.test_update_engine_constructor_signature_remains_frozen'
            $execution=Invoke-PlanERedirectedWriter -FilePath $python -ArgumentList @('-m','unittest',$selector,'-v') -ExpectedWorkingDirectory (Get-Location).Path
            $lines=@(($execution.stdout + $execution.stderr) -split '\r?\n')
            if ($execution.exit_code -ne 0 -or ($lines -join "`n") -cnotmatch '(?m)\.\.\. ok\r?$') { throw 'Promotion constructor replay did not pass' }
        }
    } finally {
        try { Set-Location -LiteralPath $savedLocation } catch { if ($null -eq $replayCleanupError) { $replayCleanupError=$_ } }
    }
} catch { $replayError=$_ } finally {
    if (Test-Path -LiteralPath $replayRoot) {
        try {
            $ownerValue=Read-PlanEWorktreeOwner -Path $replayOwner
            $registered=Get-PlanERegisteredWorktrees
            $replayHead=@(& git -C $replayRoot rev-parse HEAD)
            $replayStatus=@(& git -C $replayRoot status --porcelain=v1 --untracked-files=all)
            if ($LASTEXITCODE -ne 0 -or $ownerValue.lease_token -cne $script:PlanEToken -or $ownerValue.worktree_path -cne [IO.Path]::GetFullPath($replayRoot) -or $ownerValue.reviewed_head -cne $script:PlanEReviewedHead -or $ownerValue.worktree_head -cne $testCommit -or $ownerValue.mutation_id -cne 'promotion_red_replay' -or $ownerValue.allowed_source_path -cne 'host/test_update_engine_resume.py' -or $ownerValue.before_blob -cne $replayBeforeBlob -or $ownerValue.expected_mutated_sha256 -cne $replayExpectedHash -or $registered -cnotcontains [IO.Path]::GetFullPath($replayRoot) -or $replayHead.Count -ne 1 -or $replayHead[0].Trim() -cne $testCommit -or $replayStatus.Count -ne 0) { throw 'promotion RED replay cleanup ownership mismatch; resources retained' }
            $replayRemoveExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('worktree','remove',$replayRoot) -ExpectedWorkingDirectory (Get-Location).Path
            if ($replayRemoveExit -ne 0) { throw 'could not remove promotion RED replay worktree' }
            Remove-PlanERegisteredPath -Path $replayOwner -ExpectedPhase 'evidence'
            if (Test-Path -LiteralPath $replayOwner) { throw 'promotion RED replay owner remains after cleanup' }
        } catch { if ($null -eq $replayCleanupError) { $replayCleanupError=$_ } }
    } elseif (Test-Path -LiteralPath $replayOwner) {
        try {
            $ownerValue=Read-PlanEWorktreeOwner -Path $replayOwner
            $registered=Get-PlanERegisteredWorktrees
            if ($ownerValue.lease_token -ceq $script:PlanEToken -and $ownerValue.worktree_path -ceq [IO.Path]::GetFullPath($replayRoot) -and $ownerValue.reviewed_head -ceq $script:PlanEReviewedHead -and $ownerValue.worktree_head -ceq $testCommit -and $ownerValue.mutation_id -ceq 'promotion_red_replay' -and $ownerValue.allowed_source_path -ceq 'host/test_update_engine_resume.py' -and $ownerValue.before_blob -ceq $replayBeforeBlob -and $ownerValue.expected_mutated_sha256 -ceq $replayExpectedHash -and $registered -cnotcontains [IO.Path]::GetFullPath($replayRoot)) { Remove-PlanERegisteredPath -Path $replayOwner -ExpectedPhase 'evidence'; if (Test-Path -LiteralPath $replayOwner) { throw 'promotion RED replay pre-add owner remains' } }
            else { throw 'promotion RED replay pre-add owner mismatch; record retained' }
        } catch { if ($null -eq $replayCleanupError) { $replayCleanupError=$_ } }
    }
    if (Test-Path -LiteralPath $replayOwnerTemp) {
        try {
            $registered=Get-PlanERegisteredWorktrees
            if ($registered -ccontains [IO.Path]::GetFullPath($replayRoot) -or (Test-Path -LiteralPath $replayRoot)) { throw 'RED replay owner temporary cannot be removed while worktree state exists' }
            Remove-PlanERegisteredPath -Path $replayOwnerTemp -ExpectedPhase 'evidence'
        } catch { if ($null -eq $replayCleanupError) { $replayCleanupError=$_ } }
    }
    if (Test-Path -LiteralPath $isolation) {
        try { $isolationInfo=Get-Item -LiteralPath $isolation -Force; if ($isolationInfo -isnot [IO.DirectoryInfo] -or ($isolationInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'RED replay environment is unsafe at cleanup' }; Remove-PlanERegisteredPath -Path $isolation -ExpectedPhase 'evidence' -Recurse } catch { if ($null -eq $replayCleanupError) { $replayCleanupError=$_ } }
    }
}
if ($null -ne $replayCleanupError) { $primaryClass=if ($null -ne $replayError) { $replayError.Exception.GetType().FullName } else { '<none>' }; throw "BLOCKED: promotion RED replay cleanup failed; primary=$primaryClass; cleanup=$($replayCleanupError.Exception.GetType().FullName); resources retained" }
if ($null -ne $replayError) { throw $replayError }
& git merge-base --is-ancestor '0dbb4852931b50153fb898b03129ae0092c46404' $promotionCommit
if ($LASTEXITCODE -ne 0) { throw 'Promotion commit is not after the Plan E base' }
foreach ($path in $requiredReviewArtifacts) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required review artifact missing: $path"
    }
}
$auditProgramMatch=[regex]::Match((@(& git show "HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md") -join "`n"),'(?s)<!-- PLAN_E_AUDIT_PROGRAM_START -->\n```python\n(.*?)\n```\n<!-- PLAN_E_AUDIT_PROGRAM_END -->')
if (-not $auditProgramMatch.Success) { throw 'Committed audit validator is missing at final evidence gate' }
foreach ($task in @(6,7)) {
    $auditProgramMatch.Groups[1].Value | & 'host\venv\Scripts\python.exe' - validate ".superpowers/sdd/task-$task-audit-evidence.json"
    if ($LASTEXITCODE -ne 0) { throw "Task $task canonical audit validation failed at final evidence gate" }
}
$planEPackage=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-package.txt'),
    [Text.UTF8Encoding]::new($false)
)
$wholePackage=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-package.txt'),
    [Text.UTF8Encoding]::new($false)
)
$planEFindings=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-findings.md'),
    [Text.UTF8Encoding]::new($false)
)
$wholeFindings=[IO.File]::ReadAllText(
    (Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-findings.md'),
    [Text.UTF8Encoding]::new($false)
)
if ($planEPackage -notmatch '(?m)^Review kind: Plan-E-only$') {
    throw 'Plan E review package kind is invalid'
}
if ($wholePackage -notmatch '(?m)^Review base: 0040b1de1bc196b203014a8e4f94a53babb7e9aa$') {
    throw 'Whole-branch review package base is invalid'
}
$planEBase=[regex]::Match($planEPackage,'(?m)^Review base: ([0-9a-f]{40})$').Groups[1].Value
$planEHead=[regex]::Match($planEPackage,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
$planERange=[regex]::Match($planEPackage,'(?m)^Review range: ([0-9a-f]{40}\.\.[0-9a-f]{40})$').Groups[1].Value
$wholeBase=[regex]::Match($wholePackage,'(?m)^Review base: ([0-9a-f]{40})$').Groups[1].Value
$wholeHead=[regex]::Match($wholePackage,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
$wholeRange=[regex]::Match($wholePackage,'(?m)^Review range: ([0-9a-f]{40}\.\.[0-9a-f]{40})$').Groups[1].Value
if (-not $planEBase -or -not $planEHead -or -not $planERange -or -not $wholeBase -or -not $wholeHead -or -not $wholeRange) {
    throw 'Review package metadata is incomplete'
}
if ($planEBase -ne '0dbb4852931b50153fb898b03129ae0092c46404') {
    throw 'Plan E package base is not the immutable declared SHA'
}
& git merge-base --is-ancestor $planEBase $planEHead
if ($LASTEXITCODE -ne 0) { throw 'Plan E review base is not a review-head ancestor' }
& git merge-base --is-ancestor $wholeBase $wholeHead
if ($LASTEXITCODE -ne 0) { throw 'Whole-branch review base is not a review-head ancestor' }
if ($planERange -ne "$planEBase..$planEHead") {
    throw 'Plan E package range does not match its endpoints'
}
if ($wholeRange -ne "$wholeBase..$wholeHead") {
    throw 'Whole-branch package range does not match its endpoints'
}
if ($wholeBase -cne '0040b1de1bc196b203014a8e4f94a53babb7e9aa') { throw 'Whole-branch review base is not the locked original base' }
if ($planEHead -ne $wholeHead) {
    throw 'Review package heads differ'
}
$latestEngineCommit=@(& git log -1 --format=%H $planEHead -- 'host/update_engine.py')
$latestTestCommit=@(& git log -1 --format=%H $planEHead -- 'host/test_update_engine_resume.py')
if (
    $LASTEXITCODE -ne 0 -or $latestEngineCommit.Count -ne 1 -or $latestTestCommit.Count -ne 1 -or
    $latestEngineCommit[0].Trim() -cne $promotionCommit -or $latestTestCommit[0].Trim() -cne $testCommit
) { throw 'A later commit touched promotion evidence Host paths' }
$actualPlanEPaths=@(& git diff --name-only --no-renames $planERange | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect reviewed Plan E range paths' }
if ($actualPlanEPaths.Count -ne 61) { throw 'Reviewed Plan E range is not 61 paths' }
foreach ($path in @(
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md',
    'host/update_engine.py',
    'host/test_update_engine_resume.py'
)) {
    if ($actualPlanEPaths -cnotcontains $path) { throw "Reviewed Plan E range omits $path" }
}
$expectedRangePaths=@(
    'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md',
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md',
    'extension/src/background/analyzeBridge.test.ts','extension/src/background/analyzeBridge.ts',
    'extension/src/background/analyzeRequestHandler.test.ts','extension/src/background/analyzeRequestHandler.ts',
    'extension/src/background/contextMenu.test.ts','extension/src/background/contextMenu.ts',
    'extension/src/background/nativeMessageWire.test.ts','extension/src/background/nativeMessageWire.ts',
    'extension/src/background/resetExtensionState.test.ts','extension/src/background/serviceWorker.ts',
    'extension/src/background/teamManifestSync.test.ts','extension/src/background/teamManifestSync.ts',
    'extension/src/components/FAB.analyzeRequest.test.tsx','extension/src/components/FAB.bookmarkTelemetry.test.tsx',
    'extension/src/components/FAB.pageIdentity.test.tsx','extension/src/components/FAB.promptSourceErrors.test.tsx',
    'extension/src/components/FAB.rootPathOverride.test.ts','extension/src/components/FAB.spinner.test.tsx',
    'extension/src/components/FAB.tsx','extension/src/components/FAB.userPrompt.test.tsx',
    'extension/src/components/MenuLogic.teamCache.test.ts','extension/src/components/MenuLogic.ts',
    'extension/src/components/Options.collapseFolders.test.ts','extension/src/components/Options.test.tsx',
    'extension/src/components/Options.tsx','extension/src/components/ResultPopover.test.tsx',
    'extension/src/components/ResultPopover.tsx','extension/src/content/index.tsx',
    'extension/src/content/updateErrorBridge.test.ts','extension/src/content/updateErrorBridge.ts',
    'extension/src/hooks/useAnalysisHydration.test.ts','extension/src/hooks/useAnalysisHydration.ts',
    'extension/src/test/chromeMock.ts','extension/src/utils/analysisStore.test.ts',
    'extension/src/utils/analysisStore.ts','extension/src/utils/analyzeRequest.test.ts',
    'extension/src/utils/analyzeRequest.ts','extension/src/utils/bookmarkItems.test.ts',
    'extension/src/utils/bookmarkItems.ts','extension/src/utils/configUpdateResult.test.ts',
    'extension/src/utils/configUpdateResult.ts','extension/src/utils/nativeUpdateError.test.ts',
    'extension/src/utils/nativeUpdateError.ts','extension/src/utils/ownData.test.ts',
    'extension/src/utils/ownData.ts','extension/src/utils/pageIdentity.test.ts',
    'extension/src/utils/pageIdentity.ts','extension/src/utils/prefs.ts',
    'extension/src/utils/promptSourceErrors.test.ts','extension/src/utils/promptSourceErrors.ts',
    'extension/src/utils/teamCatalog.test.ts','extension/src/utils/teamCatalog.ts',
    'extension/src/utils/translations.ts','host/dh_native_host.py',
    'host/test_session_workspace.py','host/test_update_engine_resume.py','host/update_engine.py'
)
$expectedRangePaths=@($expectedRangePaths | Sort-Object -Unique)
$missingRange=@($expectedRangePaths | Where-Object { $actualPlanEPaths -cnotcontains $_ })
$extraRange=@($actualPlanEPaths | Where-Object { $expectedRangePaths -cnotcontains $_ })
if ($missingRange.Count -ne 0 -or $extraRange.Count -ne 0 -or $actualPlanEPaths.Count -ne 61 -or $expectedRangePaths.Count -ne 61) {
    throw "Reviewed Plan E exact path mismatch. Missing: $($missingRange -join ', '); Extra: $($extraRange -join ', ')"
}
& git merge-base --is-ancestor $promotionCommit $planEHead
if ($LASTEXITCODE -ne 0) { throw 'Promotion commit is not included in reviewed head' }
$amendmentCommit='d51ca4aabd4a40b91818191424993a8d3ab3cd27'
$planRevision=@($script:PlanEPlanCommit)
$amendmentParent=@(& git rev-parse "$planRevision^")
$redParent=@(& git rev-parse "$testCommit^")
$implementationParent=@(& git rev-parse "$promotionCommit^")
$planRevisionSubject=@(& git show -s --format=%s $planRevision)
if ($LASTEXITCODE -ne 0 -or $planRevision.Count -ne 1 -or $planRevisionSubject.Count -ne 1 -or $planRevisionSubject[0] -cne 'docs(update): integrate Plan E evidence-loss audit' -or $amendmentParent.Count -ne 1 -or $amendmentParent[0].Trim() -cne $amendmentCommit -or $redParent.Count -ne 1 -or $redParent[0].Trim() -cne $planRevision[0].Trim() -or $implementationParent.Count -ne 1 -or $implementationParent[0].Trim() -cne $testCommit) {
    throw 'Reviewed amendment -> plan -> RED -> implementation chronology mismatch'
}
$expectedPlanEPackage=@(
    'Review kind: Plan-E-only',
    "Review base: $planEBase",
    "Review head: $planEHead",
    "Review range: $planERange",
    "Exact diff command: git diff --full-index --binary `"$planERange`"",
    '',
    '## Diff Stat'
) + @(& git diff --stat $planERange) + @('', '## Commits') + @(& git log --reverse --oneline $planERange) + @('', '## Paths') + @(& git diff --name-status --no-renames $planERange)
if ($LASTEXITCODE -ne 0) { throw 'Could not regenerate Plan E package inventory' }
$expectedPlanEPackageText=($expectedPlanEPackage -join "`n") + "`n"
if (($planEPackage -replace "`r`n","`n") -cne $expectedPlanEPackageText) { throw 'Plan E review package inventory is stale' }
$expectedWholePackage=@(
    'Review kind: original whole-branch interim through Plan E',
    "Review base: $wholeBase",
    "Review head: $wholeHead",
    "Review range: $wholeRange",
    "Exact diff command: git diff --full-index --binary `"$wholeRange`"",
    '',
    '## Diff Stat'
) + @(& git diff --stat $wholeRange) + @('', '## Commits') + @(& git log --reverse --oneline $wholeRange) + @('', '## Paths') + @(& git diff --name-status --no-renames $wholeRange)
if ($LASTEXITCODE -ne 0) { throw 'Could not regenerate whole-branch package inventory' }
$expectedWholePackageText=($expectedWholePackage -join "`n") + "`n"
if (($wholePackage -replace "`r`n","`n") -cne $expectedWholePackageText) { throw 'Whole-branch review package inventory is stale' }
$transcriptRoot='.superpowers/sdd/promotion-transcripts'
$expectedMutationMethods=[ordered]@{
    classification='test_windows_access_denied_retries_atomic_preparing_promotion'
    bound='test_persistent_windows_promotion_lock_stops_after_three_attempts'
    initial='test_preparing_promotion_revalidates_before_and_after_sleep'
    'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'
    'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'
}
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@()
foreach ($method in $expectedGreen) { $expectedTranscriptFiles += "red/$method.txt"; $expectedTranscriptFiles += "green/$method.txt" }
foreach ($entry in $expectedMutationMethods.GetEnumerator()) { $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"; $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$transcriptRootInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath((Join-Path (Get-Location) $transcriptRoot),$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath((Join-Path (Get-Location) $transcriptRoot),$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ }); $extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ })
$missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ }); $extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if ($transcriptRootInfo -isnot [IO.DirectoryInfo] -or ($transcriptRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $unsupportedTranscriptEntries.Count -ne 0 -or $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0) { throw 'Final evidence transcript topology mismatch' }
foreach ($method in $expectedRed) {
    $path=Join-Path $transcriptRoot "red/$method.txt"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing RED transcript: $method" }
    $text=[IO.File]::ReadAllText((Join-Path (Get-Location) $path),[Text.UTF8Encoding]::new($false))
    if ([regex]::Matches($text,('(?m)^' + [regex]::Escape($method) + ' .* \.\.\. FAIL\r?$')).Count -ne 1 -or [regex]::Matches($text,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or [regex]::Matches($text,'(?m)^FAILED \(failures=1\)\r?$').Count -ne 1 -or $text -cmatch '(?m)(\.\.\. ok\r?$|^OK\r?$|^ERROR:|\bskipped\b)') { throw "Invalid RED transcript: $method" }
}
$constructorPath=Join-Path $transcriptRoot 'red/test_update_engine_constructor_signature_remains_frozen.txt'
if (-not (Test-Path -LiteralPath $constructorPath -PathType Leaf)) { throw 'Missing constructor RED-phase transcript' }
$constructorText=[IO.File]::ReadAllText((Join-Path (Get-Location) $constructorPath),[Text.UTF8Encoding]::new($false))
if ([regex]::Matches($constructorText,'(?m)^test_update_engine_constructor_signature_remains_frozen .* \.\.\. ok\r?$').Count -ne 1 -or [regex]::Matches($constructorText,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or [regex]::Matches($constructorText,'(?m)^OK\r?$').Count -ne 1 -or $constructorText -cmatch '(?m)(\.\.\. FAIL\r?$|^FAILED|^ERROR:|\bskipped\b)') { throw 'Invalid constructor RED-phase transcript' }
foreach ($method in $expectedGreen) {
    $path=Join-Path $transcriptRoot "green/$method.txt"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing GREEN transcript: $method" }
    $text=[IO.File]::ReadAllText((Join-Path (Get-Location) $path),[Text.UTF8Encoding]::new($false))
    if ([regex]::Matches($text,('(?m)^' + [regex]::Escape($method) + ' .* \.\.\. ok\r?$')).Count -ne 1 -or [regex]::Matches($text,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or [regex]::Matches($text,'(?m)^OK\r?$').Count -ne 1 -or $text -cmatch '(?m)(\.\.\. FAIL\r?$|^FAILED|^ERROR:|\bskipped\b)') { throw "Invalid GREEN transcript: $method" }
}
$transcriptMapPath='.superpowers/sdd/promotion-transcripts.sha256.json'
if (-not (Test-Path -LiteralPath $transcriptMapPath -PathType Leaf)) { throw 'Promotion transcript hash map is missing' }
$recordedMapText=[IO.File]::ReadAllText((Join-Path (Get-Location) $transcriptMapPath),[Text.UTF8Encoding]::new($false))
$strictMapParser=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if not isinstance(value,dict) or any(not isinstance(k,str) or not isinstance(v,str) for k,v in value.items()):
    raise SystemExit('invalid transcript map')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonicalMap=@($recordedMapText | & 'host\venv\Scripts\python.exe' -c $strictMapParser)
if ($LASTEXITCODE -ne 0 -or $canonicalMap.Count -ne 1 -or $recordedMapText -cne $canonicalMap[0] + "`n") { throw 'Promotion transcript hash map is invalid or noncanonical' }
$recordedMap=$canonicalMap[0] | ConvertFrom-Json -AsHashtable
$redMapPath='.superpowers/sdd/promotion-red.sha256.json'
$redMapText=[IO.File]::ReadAllText((Join-Path (Get-Location) $redMapPath),[Text.UTF8Encoding]::new($false))
$canonicalRedMap=@($redMapText | & 'host\venv\Scripts\python.exe' -c $strictMapParser)
if ($LASTEXITCODE -ne 0 -or $canonicalRedMap.Count -ne 1 -or $redMapText -cne $canonicalRedMap[0] + "`n") { throw 'Promotion RED hash map is invalid or noncanonical' }
$recordedRedMap=$canonicalRedMap[0] | ConvertFrom-Json -AsHashtable
$actualRedMap=[ordered]@{}
foreach ($relative in @($actualTranscriptFiles | Where-Object { $_ -like 'red/*' })) {
    $name=[IO.Path]::GetFileName($relative)
    $fullPath=Join-Path $transcriptRoot $relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
    $actualRedMap[$name]=(Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash.ToLowerInvariant()
}
if ($recordedRedMap.Count -ne 8 -or $actualRedMap.Count -ne 8) { throw 'Promotion RED hash count mismatch' }
foreach ($key in $actualRedMap.Keys) {
    if (-not $recordedRedMap.ContainsKey($key) -or $recordedRedMap[$key] -cne $actualRedMap[$key]) { throw "Promotion RED chronology hash mismatch: $key" }
    $fullKey='red/' + $key
    if (-not $recordedMap.ContainsKey($fullKey) -or $recordedMap[$fullKey] -cne $actualRedMap[$key]) { throw "Promotion full map does not preserve RED hash: $key" }
}
$actualMap=[ordered]@{}
foreach ($relative in $actualTranscriptFiles) {
    $fullPath=Join-Path $transcriptRoot $relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
    $actualMap[$relative]=(Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash.ToLowerInvariant()
}
if ($actualMap.Count -ne 26 -or $recordedMap.Count -ne 26) { throw 'Promotion transcript hash count mismatch' }
foreach ($key in $actualMap.Keys) {
    if (-not $recordedMap.ContainsKey($key) -or $recordedMap[$key] -cne $actualMap[$key]) {
        throw "Promotion transcript hash mismatch: $key"
    }
}
$phaseMapSpecs=[ordered]@{
    green=[ordered]@{Path='.superpowers/sdd/promotion-green.sha256.json';Prefix='green/';Count=8}
    mutation=[ordered]@{Path='.superpowers/sdd/promotion-mutation.sha256.json';Prefix='';Count=10}
}
foreach ($entry in $phaseMapSpecs.GetEnumerator()) {
    $phaseText=[IO.File]::ReadAllText((Join-Path (Get-Location) $entry.Value.Path),[Text.UTF8Encoding]::new($false))
    $canonicalPhase=@($phaseText | & 'host\venv\Scripts\python.exe' -c $strictMapParser)
    if ($LASTEXITCODE -ne 0 -or $canonicalPhase.Count -ne 1 -or $phaseText -cne $canonicalPhase[0] + "`n") { throw "Promotion $($entry.Key) hash map is invalid or noncanonical" }
    $phaseMap=$canonicalPhase[0] | ConvertFrom-Json -AsHashtable
    if ($phaseMap.Count -ne $entry.Value.Count) { throw "Promotion $($entry.Key) map count mismatch" }
    foreach ($key in $phaseMap.Keys) {
        if ($entry.Key -eq 'mutation' -and $key -cnotmatch '^mutation-(classification|bound|initial|pre-sleep|post-sleep)/') {
            throw "Promotion mutation map contains unexpected key: $key"
        }
        $fullKey=$entry.Value.Prefix + $key
        if (-not $recordedMap.ContainsKey($fullKey) -or $recordedMap[$fullKey] -cne $phaseMap[$key]) {
            throw "Promotion full map does not preserve $($entry.Key) hash: $key"
        }
    }
}
foreach ($name in @('classification','bound','initial','pre-sleep','post-sleep')) {
    $directory=Join-Path $transcriptRoot "mutation-$name"
    $files=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] -and $_.DirectoryName -ceq (Join-Path (Get-Location) $directory) })
    if ($files.Count -ne 2) { throw "Promotion mutation transcript count mismatch: $name" }
    $expectedMutationMethod=switch ($name) {
        'classification' { 'test_windows_access_denied_retries_atomic_preparing_promotion' }
        'bound' { 'test_persistent_windows_promotion_lock_stops_after_three_attempts' }
        'initial' { 'test_preparing_promotion_revalidates_before_and_after_sleep' }
        default { 'test_preparing_promotion_revalidation_rejects_every_authority_mismatch' }
    }
    $failureFile=$files | Where-Object { $_.Name -ceq "$expectedMutationMethod.txt" }
    $greenFile=$files | Where-Object { $_.Name -ceq "$expectedMutationMethod.restored-green.txt" }
    if ($null -eq $failureFile -or $null -eq $greenFile) { throw "Promotion mutation transcript names invalid: $name" }
    $text=[IO.File]::ReadAllText($failureFile.FullName,[Text.UTF8Encoding]::new($false))
    if ($text -cnotmatch ('(?m)^' + [regex]::Escape($expectedMutationMethod) + ' .* \.\.\. FAIL\r?$') -or $text -cnotmatch '(?m)^Ran 1 test in [0-9.]+s\r?$' -or $text -cnotmatch '(?m)^FAILED \(failures=1\)\r?$' -or $text -cmatch '(?m)(^ERROR:|^ImportError:|^ModuleNotFoundError:|\bskipped\b)') {
        throw "Promotion mutation transcript invalid: $name"
    }
    $greenText=[IO.File]::ReadAllText($greenFile.FullName,[Text.UTF8Encoding]::new($false))
    if ([regex]::Matches($greenText,('(?m)^' + [regex]::Escape($expectedMutationMethod) + ' .* \.\.\. ok\r?$')).Count -ne 1 -or [regex]::Matches($greenText,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or [regex]::Matches($greenText,'(?m)^OK\r?$').Count -ne 1 -or $greenText -cmatch '(?m)(\.\.\. FAIL\r?$|^FAILED|^ERROR:|\bskipped\b)') {
        throw "Promotion restored GREEN transcript invalid: $name"
    }
}
$recheckPlanE=Join-Path $script:PlanETempRoot 'recheck-plan-e.diff'
$recheckWhole=Join-Path $script:PlanETempRoot 'recheck-whole.diff'
try {
    $null=Assert-PlanERegisteredMutationPath -Path $recheckPlanE -ExpectedPhase 'evidence'
    $planERecheckExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('diff','--full-index','--binary',$planERange,("--output=" + $recheckPlanE)) -ExpectedWorkingDirectory (Get-Location).Path
    if ($planERecheckExit -ne 0) { throw 'Could not regenerate Plan E review diff' }
    $null=Assert-PlanERegisteredMutationPath -Path $recheckWhole -ExpectedPhase 'evidence'
    $wholeRecheckExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('diff','--full-index','--binary',$wholeRange,("--output=" + $recheckWhole)) -ExpectedWorkingDirectory (Get-Location).Path
    if ($wholeRecheckExit -ne 0) { throw 'Could not regenerate whole-branch review diff' }
    $planEHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/plan-e-only-review.diff').Hash
    $planERecheckHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $recheckPlanE).Hash
    $wholeHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/original-whole-branch-interim-review.diff').Hash
    $wholeRecheckHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $recheckWhole).Hash
    if ($planEHash -cne $planERecheckHash) { throw 'Plan E review diff bytes are stale' }
    if ($wholeHash -cne $wholeRecheckHash) { throw 'Whole-branch review diff bytes are stale' }
} finally {
    if (Test-Path -LiteralPath $recheckPlanE) { Remove-PlanERegisteredPath -Path $recheckPlanE -ExpectedPhase 'evidence' }
    if (Test-Path -LiteralPath $recheckWhole) { Remove-PlanERegisteredPath -Path $recheckWhole -ExpectedPhase 'evidence' }
}
$currentProductHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve current product head' }
if ($currentProductHead.Count -ne 1) { throw 'Current product head is ambiguous' }
$currentProductHead=$currentProductHead[0].Trim()
if ($planEHead -ne $currentProductHead) {
    throw 'Review packages are stale relative to current product HEAD'
}
$verificationForReviews=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/reviewed-head-verification.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
if ($verificationForReviews['reviewed_head'] -cne $planEHead) { throw 'Review head differs from reviewed-head verification' }
foreach ($task in @(6,7)) {
    $auditValue=[IO.File]::ReadAllText((Join-Path (Get-Location) ".superpowers/sdd/task-$task-audit-evidence.json"),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
    if ($auditValue['audit_subject']['commit'] -cne $planEHead) { throw "Review head differs from Task $task audit subject" }
}
$expectedPlanECommand=
    "Exact diff command: git diff --full-index --binary `"$planERange`""
if (-not $planEPackage.Contains($expectedPlanECommand)) {
    throw 'Plan E package exact diff command is invalid'
}
$expectedWholeCommand=
    "Exact diff command: git diff --full-index --binary `"$wholeRange`""
if (-not $wholePackage.Contains($expectedWholeCommand)) {
    throw 'Whole-branch package exact diff command is invalid'
}
function Read-ReviewSections {
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)][string[]]$ExpectedHeadings
    )
    $normalized=$Text -replace "`r`n", "`n"
    if ($normalized -notmatch '^## ') {
        throw 'Review findings contain text before the first heading'
    }
    $matches=[regex]::Matches(
        $normalized,
        '(?ms)^## ([^\n]+)\n(.*?)(?=^## |\z)'
    )
    $sections=@{}
    $orderedHeadings=@()
    $reconstructedParts=@()
    foreach ($match in $matches) {
        $heading=$match.Groups[1].Value
        if ($sections.ContainsKey($heading)) {
            throw "Duplicate review heading: $heading"
        }
        $body=$match.Groups[2].Value.TrimEnd("`n")
        if ([string]::IsNullOrWhiteSpace($body)) {
            throw "Empty review section: $heading"
        }
        $sections[$heading]=$body
        $orderedHeadings += $heading
        $reconstructedParts += "## $heading`n$body"
    }
    $reconstructed=($reconstructedParts -join "`n") + "`n"
    $canonical=$normalized.TrimEnd("`n") + "`n"
    if ($reconstructed -cne $canonical) {
        throw 'Review findings contain undeclared or malformed text'
    }
    $actualHeadings=@($sections.Keys)
    $missing=@($ExpectedHeadings | Where-Object { $actualHeadings -cnotcontains $_ })
    $extra=@($actualHeadings | Where-Object { $ExpectedHeadings -cnotcontains $_ })
    if ($missing.Count -ne 0 -or $extra.Count -ne 0) {
        throw "Review heading mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
    }
    if (($orderedHeadings -join "`n") -cne ($ExpectedHeadings -join "`n")) {
        throw 'Review headings are out of order'
    }
    return $sections
}
$planESections=Read-ReviewSections -Text $planEFindings -ExpectedHeadings @(
    'Review Session','Review Base','Review Head','Review Range',
    'Task 6 Audit SHA-256','Task 7 Audit SHA-256',
    'Historical-Report Availability Honesty',
    'No Reconstructed Historical TDD Claim',
    'Git Lineage and Source-Blob Accuracy',
    'Current-State Test and Mutation Sufficiency',
    'Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition',
    'Critical','Important','Minor','Testing Gaps','Declared Session Proof Boundary','Disposition'
)
$wholeSections=Read-ReviewSections -Text $wholeFindings -ExpectedHeadings @(
    'Review Session','Review Base','Review Head','Review Range',
    'Task 6 Audit SHA-256','Task 7 Audit SHA-256',
    'Historical-Report Availability Honesty',
    'No Reconstructed Historical TDD Claim',
    'Git Lineage and Source-Blob Accuracy',
    'Current-State Test and Mutation Sufficiency',
    'Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition',
    'Critical','Important','Minor','Testing Gaps','Declared Session Proof Boundary','Plan D Rerun Requirement','Disposition'
)
$criterionHeadings=@(
    'Historical-Report Availability Honesty',
    'No Reconstructed Historical TDD Claim',
    'Git Lineage and Source-Blob Accuracy',
    'Current-State Test and Mutation Sufficiency',
    'Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition'
)
if ($criterionHeadings.Count -ne 5 -or $criterionHeadings.Count -ne @($criterionHeadings | Sort-Object -Unique).Count) { throw 'Review criterion inventory mismatch' }
$task6AuditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
$task7AuditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
if ($task6AuditHash -cne $script:PlanEAuditHashes['task_6'] -or $task7AuditHash -cne $script:PlanEAuditHashes['task_7']) { throw 'Audit hash changed after review dispatch' }
foreach ($sections in @($planESections,$wholeSections)) {
    if ([string]::IsNullOrWhiteSpace($sections['Review Session']) -or $sections['Review Session'] -match '[\r\n]') {
        throw 'Review Session must be one non-empty opaque line'
    }
    if ($sections['Task 6 Audit SHA-256'] -cne $task6AuditHash -or $sections['Task 7 Audit SHA-256'] -cne $task7AuditHash) {
        throw 'Review audit hash binding mismatch'
    }
    foreach ($heading in $criterionHeadings) {
        if ($sections[$heading] -cnotin @('PASS','FAIL')) { throw "Review criterion enum mismatch: $heading" }
    }
}
if ($planESections['Review Session'] -ceq $wholeSections['Review Session']) {
    throw 'Review records declare the same orchestration session ID'
}
if ($planEFindings -ceq $wholeFindings) { throw 'Whole-branch findings copied the Plan-E-only record verbatim' }
foreach ($findings in @($planEFindings,$wholeFindings)) {
    if ($findings -match '(?i)(evidence commit (already )?(exists|is durable|has been committed)|60-path evidence commit (exists|is durable))') { throw 'Prospective review claims the later evidence commit already exists or is durable' }
}
foreach ($pair in @(
    @('Review Base',$planEBase),
    @('Review Head',$planEHead),
    @('Review Range',$planERange)
)) {
    if ($planESections[$pair[0]] -cne $pair[1]) {
        throw "Plan E findings metadata mismatch: $($pair[0])"
    }
}
foreach ($pair in @(
    @('Review Base',$wholeBase),
    @('Review Head',$wholeHead),
    @('Review Range',$wholeRange)
)) {
    if ($wholeSections[$pair[0]] -cne $pair[1]) {
        throw "Whole-branch findings metadata mismatch: $($pair[0])"
    }
}
if ($planESections['Disposition'] -cne 'PASS') {
    throw 'Plan E review disposition is not exactly PASS'
}
if (@($criterionHeadings | Where-Object { $planESections[$_] -cne 'PASS' }).Count -ne 0) {
    throw 'Plan E review criterion failed'
}
foreach ($heading in @('Critical','Important')) {
    if ($planESections[$heading] -cne 'None.') {
        throw "Plan E $heading findings remain"
    }
}
foreach ($heading in @('Minor','Testing Gaps')) {
    if ([string]::IsNullOrWhiteSpace($planESections[$heading])) {
        throw "Plan E $heading section is empty"
    }
}
if ($wholeSections['Disposition'] -cne 'INTERIM PASS THROUGH PLAN E') {
    throw 'Whole-branch interim review disposition is invalid'
}
foreach ($sections in @($planESections,$wholeSections)) {
    $hasCriterionFailure=@($criterionHeadings | Where-Object { $sections[$_] -eq 'FAIL' }).Count -ne 0
    $hasOpenHigh=$sections['Critical'] -cne 'None.' -or $sections['Important'] -cne 'None.'
    if (($hasCriterionFailure -or $hasOpenHigh) -and $sections['Disposition'] -cne 'BLOCKED') { throw 'Review does not fail closed on criterion/high-severity findings' }
}
if ($planESections['Disposition'] -eq 'INTERIM PASS THROUGH PLAN E' -or $wholeSections['Disposition'] -eq 'PASS') { throw 'Review disposition kinds were swapped' }
if (@($criterionHeadings | Where-Object { $wholeSections[$_] -cne 'PASS' }).Count -ne 0) {
    throw 'Whole-branch interim review criterion failed'
}
foreach ($heading in @('Critical','Important')) {
    if ($wholeSections[$heading] -cne 'None.') {
        throw "Whole-branch $heading findings remain"
    }
}
foreach ($heading in @('Minor','Testing Gaps')) {
    if ([string]::IsNullOrWhiteSpace($wholeSections[$heading])) {
        throw "Whole-branch $heading section is empty"
    }
}
foreach ($sections in @($planESections,$wholeSections)) {
    foreach ($heading in @('Testing Gaps','Minor')) {
        $body=$sections[$heading]
        if ($body -cne 'None.') {
            $lines=@($body -split "`n" | Where-Object { $_ -ne '' })
            if ($lines.Count -eq 0 -or @($lines | Where-Object { $_ -cnotmatch '^- \[Minor\] ' }).Count -ne 0) {
                throw "$heading contains a non-Minor or malformed finding"
            }
        }
    }
    foreach ($heading in @('Critical','Important')) {
        if ($sections[$heading] -cne 'None.') { throw "$heading findings remain" }
    }
}
$requiredRerun='Rerun git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>" and the full original-base controller review after Plan D is committed and before any final whole-branch/release-readiness claim.'
if ($wholeSections['Plan D Rerun Requirement'] -cne $requiredRerun) {
    throw 'Whole-branch findings final-D rerun requirement is not exact'
}
$riskHashes=[ordered]@{
    'Plan-E Minor/Testing SHA-256'=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($planESections['Minor'] + "`n" + $planESections['Testing Gaps']))).ToLowerInvariant()
    'Whole-branch Minor/Testing SHA-256'=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($wholeSections['Minor'] + "`n" + $wholeSections['Testing Gaps']))).ToLowerInvariant()
}
$riskMetadata=@(
    [ordered]@{Prefix='Plan-E';Sections=$planESections},
    [ordered]@{Prefix='Whole-branch';Sections=$wholeSections}
)
foreach ($record in $riskMetadata) {
    foreach ($heading in @('Minor','Testing Gaps')) {
        $body=$record.Sections[$heading]
        $count=if ($body -ceq 'None.') { 0 } else { @($body -split "`n" | Where-Object { $_ -ne '' }).Count }
        $line=('**' + $record.Prefix + ' ' + $heading + ' count:** `' + $count + '`')
        if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final evidence staged findings metadata count mismatch: $line" }
    }
}
$findingsHashes=[ordered]@{
    'Plan-E findings SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/plan-e-only-review-findings.md').Hash.ToLowerInvariant()
    'Original whole-branch interim findings SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/original-whole-branch-interim-review-findings.md').Hash.ToLowerInvariant()
}
foreach ($entry in $findingsHashes.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final evidence findings hash mismatch: $($entry.Key)" }
}
foreach ($summary in @(
    [ordered]@{Body='Plan-E-Only Controller Review Findings';Kind='plan_e_only';Sections=$planESections;Base=$planEBase;Head=$planEHead;Range=$planERange;Disposition='PASS';Hash=$findingsHashes['Plan-E findings SHA-256']},
    [ordered]@{Body='Original Whole-Branch Interim Review Findings';Kind='original_whole_branch_interim';Sections=$wholeSections;Base=$wholeBase;Head=$wholeHead;Range=$wholeRange;Disposition='INTERIM PASS THROUGH PLAN E';Hash=$findingsHashes['Original whole-branch interim findings SHA-256']}
)) {
    $body=$evidenceSections[$summary.Body]
    foreach ($line in @(
        ('**Review kind:** `' + $summary.Kind + '`'),
        ('**Review Session:** `' + $summary.Sections['Review Session'] + '`'),
        ('**Review base:** `' + $summary.Base + '`'),
        ('**Review head:** `' + $summary.Head + '`'),
        ('**Review range:** `' + $summary.Range + '`'),
        ('**Findings SHA-256:** `' + $summary.Hash + '`'),
        ('**Task 6 Audit SHA-256:** `' + $task6AuditHash + '`'),
        ('**Task 7 Audit SHA-256:** `' + $task7AuditHash + '`'),
        ('**Disposition:** `' + $summary.Disposition + '`'),
        '**Open Critical/Important findings:** `0`'
    )) {
        if ([regex]::Matches($body,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final evidence review metadata mismatch: $line" }
    }
    foreach ($heading in $criterionHeadings) {
        $line=('**' + $heading + ':** `PASS`')
        if ([regex]::Matches($body,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final evidence review criterion summary mismatch: $heading" }
    }
}
$reviewProofBoundary='Different declared Review Session identifiers prove only the recorded opaque values; they do not prove reviewer identity, dispatch, independence, or non-collusion.'
if (-not $evidence.Contains($reviewProofBoundary)) { throw 'Final evidence omits the review-session proof boundary' }
$findingsProofBoundary='These records prove only that two different declared orchestration session identifiers were recorded; they do not prove reviewer identity, dispatch, independence, or non-collusion.'
foreach ($sections in @($planESections,$wholeSections)) {
    if ($sections['Declared Session Proof Boundary'] -cne $findingsProofBoundary) { throw 'Review findings declared-session proof boundary mismatch' }
}
foreach ($entry in $riskHashes.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence residual-risk hash mismatch: $($entry.Key)"
    }
}
$rerunBody=$evidenceSections['Plan D Final Whole-Branch Rerun Requirement']
if (-not $rerunBody.Contains($requiredRerun)) { throw 'Final evidence omits exact Plan D rerun sentence' }
foreach ($literal in @($planERange,$wholeRange,$planEHead,$promotionCommit)) {
    if (-not $evidence.Contains($literal)) { throw "Final evidence omits reviewed literal: $literal" }
}
foreach ($metadata in @(
    ('**Integration base:** `' + $planEBase + '`'),
    ('**Final reviewed product head:** `' + $planEHead + '`')
)) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($metadata) + '\r?$').Count -ne 1) {
        throw "Final evidence metadata mismatch: $metadata"
    }
}
foreach ($line in @(
    '**Plan-E-only disposition:** `PASS`',
    '**Plan-E-only Critical:** `None.`',
    '**Plan-E-only Important:** `None.`',
    '**Original-base interim Critical:** `None.`',
    '**Original-base interim Important:** `None.`',
    '**Original-base disposition:** `INTERIM PASS THROUGH PLAN E`'
)) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence findings summary mismatch: $line"
    }
}
$planEReviewBody=$evidenceSections['Plan-E-Only Controller Review Findings']
$wholeReviewBody=$evidenceSections['Original Whole-Branch Interim Review Findings']
foreach ($literal in @($planEBase,$planEHead,$planERange,'Plan-E-only Critical','Plan-E-only Important')) {
    if (-not $planEReviewBody.Contains($literal)) { throw "Plan-E evidence review section omits $literal" }
}
foreach ($literal in @($wholeBase,$wholeHead,$wholeRange,'Original-base interim Critical','Original-base interim Important','INTERIM PASS THROUGH PLAN E')) {
    if (-not $wholeReviewBody.Contains($literal)) { throw "Whole-branch evidence review section omits $literal" }
}
$readinessBody=$evidenceSections['Plan E Review Readiness']
if (-not $readinessBody.Contains('Plan E is review-ready') -or -not $readinessBody.Contains('final whole-branch review remains pending Plan D')) {
    throw 'Plan E readiness section is incomplete'
}
if (-not $readinessBody.Contains('**Disposition:** `PASS`')) { throw 'Plan E readiness disposition is not PASS' }
$unsafeLine='No real Chrome storage, registry, %LOCALAPPDATA%\DynamicsHelper, update, package, publish, install, MyCases, authenticated model, push, or tag operation occurred.'
if (-not $evidenceSections['Skipped Unsafe Operations'].Contains($unsafeLine)) { throw 'Final evidence unsafe-operation attestation is incomplete' }
$status=@(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect evidence tracked status' }
$reviewedPlanEPaths=@(& git diff --name-only --no-renames $planERange)
if ($LASTEXITCODE -ne 0) { throw 'Could not derive reviewed Plan E paths' }
& git diff --check -- $reviewedPlanEPaths
if ($LASTEXITCODE -ne 0) { throw 'Evidence Plan E working diff check failed' }
$dirtyReviewedPaths=@(& git status --porcelain=v1 --untracked-files=all -- $reviewedPlanEPaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect reviewed Plan E paths' }
if ($dirtyReviewedPaths.Count -ne 0) {
    throw 'Reviewed Plan E paths changed after review package generation'
}
$testedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$headSource=@(& git ls-tree -r --name-only $planEHead -- $testedSourceRoots)
$trackedSource=@(& git ls-files -- $testedSourceRoots)
$dirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $testedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $headSource.Count -lt 1 -or
    ($headSource -join "`n") -cne ($trackedSource -join "`n") -or
    $dirtySource.Count -ne 0
) { throw 'Final evidence tested source is not globally clean at reviewed head' }
$manifestPath='.superpowers/sdd/final-artifacts.sha256.json'
$manifestText=[IO.File]::ReadAllText((Join-Path (Get-Location) $manifestPath),[Text.UTF8Encoding]::new($false))
$roots=@(
    '.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1',
    '.superpowers/sdd/promotion-executor.sha256','.superpowers/sdd/promotion-mutation-runner.sha256',
    '.superpowers/sdd/promotion-red-source.sha256','.superpowers/sdd/promotion-green-source.sha256',
    '.superpowers/sdd/promotion-mutation-source.sha256',
    '.superpowers/sdd/promotion-observed.json','.superpowers/sdd/promotion-ledger.json',
    '.superpowers/sdd/promotion-transcripts.sha256.json','.superpowers/sdd/promotion-red.sha256.json',
    '.superpowers/sdd/promotion-green.sha256.json','.superpowers/sdd/promotion-mutation.sha256.json',
    '.superpowers/sdd/promotion-ast.sha256',
    '.superpowers/sdd/focused-extension-results.json','.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json','.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review.diff','.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/task-6-audit-evidence.json'
)
$roots += @(
    '.superpowers/sdd/task-1-report.md',
    '.superpowers/sdd/task-2-report.md',
    '.superpowers/sdd/task-3-report.md',
    '.superpowers/sdd/task-4-report.md',
    '.superpowers/sdd/task-5-report.md',
    '.superpowers/sdd/task-7-audit-evidence.json',
    '.superpowers/sdd/task-8-report.md'
)
$transcriptRoot=Join-Path (Get-Location) '.superpowers/sdd/promotion-transcripts'
$expectedTranscriptMethods=@('test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen')
$expectedMutationMethods=[ordered]@{classification='test_windows_access_denied_retries_atomic_preparing_promotion';bound='test_persistent_windows_promotion_lock_stops_after_three_attempts';initial='test_preparing_promotion_revalidates_before_and_after_sleep';'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch';'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'}
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@(); foreach ($method in $expectedTranscriptMethods) { $expectedTranscriptFiles += "red/$method.txt"; $expectedTranscriptFiles += "green/$method.txt" }; foreach ($entry in $expectedMutationMethods.GetEnumerator()) { $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"; $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$transcriptRootInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ }); $extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ }); $missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ }); $extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if ($transcriptRootInfo -isnot [IO.DirectoryInfo] -or ($transcriptRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $unsupportedTranscriptEntries.Count -ne 0 -or $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0) { throw 'Final evidence transcript topology mismatch' }
$roots += @($actualTranscriptFiles | ForEach-Object { '.superpowers/sdd/promotion-transcripts/' + $_ })
$roots=@($roots | Sort-Object -Unique)
if ($roots.Count -ne 58) { throw "Final artifact path count mismatch: $($roots.Count)" }
if ($roots -ccontains '.superpowers/sdd/task-6-report.md' -or $roots -ccontains '.superpowers/sdd/task-7-report.md' -or $roots -cnotcontains '.superpowers/sdd/task-6-audit-evidence.json' -or $roots -cnotcontains '.superpowers/sdd/task-7-audit-evidence.json') { throw 'Final evidence Task 6/7 slot replacement mismatch' }
$observedManagedFiles=@()
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $info=Get-Item -LiteralPath $path -Force
    if (($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Final artifact is a reparse point: $path" }
    $observedManagedFiles += $path
}
$observedManagedFiles=@($observedManagedFiles | Sort-Object -Unique)
if ($observedManagedFiles.Count -ne 58 -or ($observedManagedFiles -join "`n") -cne ($roots -join "`n")) { throw 'Final exact artifact inventory mismatch' }
$mutablePresent=@($script:PlanEMutableArtifacts | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
foreach ($path in $mutablePresent) {
    if (-not $script:PlanECurrentRunArtifacts.ContainsKey($path)) { throw "BLOCKED: mutable artifact exists without current-run registration; adoption forbidden: $path" }
    $currentHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($currentHash -cne $script:PlanECurrentRunArtifacts[$path]) { throw "Registered mutable artifact changed before manifest generation: $path" }
}
$expectedManifest=[ordered]@{}
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $expectedManifest[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
}
if ((@($expectedManifest.Keys) -join "`n") -cne ($roots -join "`n")) { throw 'Expected manifest insertion order differs from sorted roots' }
$manifestParser=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or any(type(k) is not str or type(v) is not str or re.fullmatch(r'[0-9a-f]{64}',v) is None for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonicalManifest=@($manifestText | & 'host\venv\Scripts\python.exe' -c $manifestParser)
if ($LASTEXITCODE -ne 0 -or $canonicalManifest.Count -ne 1 -or $manifestText -cne $canonicalManifest[0] + "`n") { throw 'Final artifact manifest is invalid or noncanonical' }
$manifest=$canonicalManifest[0] | ConvertFrom-Json -AsHashtable
if ($manifest.Count -ne 58 -or $expectedManifest.Count -ne 58) { throw 'Final artifact manifest count mismatch' }
$manifestKeys=@($manifest.Keys | Sort-Object)
if (($manifestKeys -join "`n") -cne ($roots -join "`n")) { throw 'Final artifact manifest sorted key order mismatch' }
foreach ($entry in $expectedManifest.GetEnumerator()) {
    if (-not $manifest.ContainsKey($entry.Key) -or $manifest[$entry.Key] -cne $entry.Value) { throw "Final artifact manifest drift: $($entry.Key)" }
}
& git check-ignore -q -- $manifestPath
if ($LASTEXITCODE -ne 0) { throw 'Final artifact manifest is not ignored' }
$manifestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
$manifestLine=('**Final artifact manifest SHA-256:** `' + $manifestHash + '`')
if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($manifestLine) + '\r?$').Count -ne 1) {
    throw 'Final report manifest hash line is missing or stale'
}
$evidenceCommitPaths=@($roots + @(
    '.superpowers/sdd/final-artifacts.sha256.json',
    '.superpowers/sdd/plan-e-extension-hardening-report.md'
) | Sort-Object -Unique)
if ($evidenceCommitPaths.Count -ne 60) { throw "Final evidence commit allowlist count mismatch: $($evidenceCommitPaths.Count)" }
if ($roots.Count -ne 58 -or $evidenceCommitPaths -cnotcontains '.superpowers/sdd/final-artifacts.sha256.json' -or $evidenceCommitPaths -cnotcontains '.superpowers/sdd/plan-e-extension-hardening-report.md') { throw 'Final evidence 58+manifest+report composition mismatch' }
$reportContractLines=@(
    '**Expanded Plan E range:** `PASS` - 61 paths',
    '**Base-to-final range:** `PASS` - 121 paths',
    '**Final evidence commit contract:** `PASS` - 60 paths - docs(verification): record Plan E hardening evidence',
    ('**Final evidence parent:** `' + $planEHead + '`')
)
foreach ($line in $reportContractLines) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Final report evidence-commit contract line mismatch: $line" }
}
$registeredMutablePaths=@($script:PlanECurrentRunArtifacts.Keys | Sort-Object)
$expectedMutablePaths=@($script:PlanEMutableArtifacts | Sort-Object)
foreach ($path in $expectedMutablePaths) {
    if ((Test-Path -LiteralPath $path) -and -not $script:PlanECurrentRunArtifacts.ContainsKey($path)) { throw "BLOCKED: mutable artifact exists without current-run registration; adoption forbidden: $path" }
}
if (($registeredMutablePaths -join "`n") -cne ($expectedMutablePaths -join "`n")) { throw 'Current-token mutable artifact registration set is not the exact lease inventory' }
$script:PlanECurrentRunArtifactsFrozen=$true
foreach ($path in $registeredMutablePaths) {
    $currentHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($currentHash -cne $script:PlanECurrentRunArtifacts[$path]) { throw "Current-token mutable artifact changed before staging: $path" }
}
$reportBlobHash=(@(& git hash-object -- '.superpowers/sdd/plan-e-extension-hardening-report.md')[0].Trim())
$manifestBlobHash=(@(& git hash-object -- '.superpowers/sdd/final-artifacts.sha256.json')[0].Trim())
if ($reportBlobHash -notmatch '^[0-9a-f]{40}$' -or $manifestBlobHash -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind final report/manifest staged blobs' }
foreach ($path in $evidenceCommitPaths) {
    $trackedAtParent=@(& git ls-tree -r --name-only HEAD -- $path)
    if ($LASTEXITCODE -ne 0 -or $trackedAtParent.Count -ne 0) { throw "Evidence path already exists at reviewed parent: $path" }
}
$stageEvidenceExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList (@('add','-f','--') + $evidenceCommitPaths) -ExpectedWorkingDirectory (Get-Location).Path
if ($stageEvidenceExit -ne 0) { throw 'Could not force-stage complete evidence set' }
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Evidence staged diff check failed' }
$staged=@(git diff --cached --name-only --no-renames | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged evidence' }
if ($staged.Count -ne 60 -or ($staged -join "`n") -cne ($evidenceCommitPaths -join "`n")) {
    throw 'Evidence commit staged set is not the exact 60-path allowlist'
}
$stagedReportBlob=@(& git rev-parse ':0:.superpowers/sdd/plan-e-extension-hardening-report.md')
$stagedManifestBlob=@(& git rev-parse ':0:.superpowers/sdd/final-artifacts.sha256.json')
if ($LASTEXITCODE -ne 0 -or $stagedReportBlob.Count -ne 1 -or $stagedManifestBlob.Count -ne 1 -or $stagedReportBlob[0].Trim() -cne $reportBlobHash -or $stagedManifestBlob[0].Trim() -cne $manifestBlobHash) { throw 'Staged report/manifest blobs differ from validated bytes' }
foreach ($path in @('.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-findings.md','.superpowers/sdd/task-6-audit-evidence.json','.superpowers/sdd/task-7-audit-evidence.json')) {
    $workingBlob=@(& git hash-object -- $path)
    $stagedBlob=@(& git rev-parse ":0:$path")
    if ($LASTEXITCODE -ne 0 -or $workingBlob.Count -ne 1 -or $stagedBlob.Count -ne 1 -or $workingBlob[0].Trim() -cne $stagedBlob[0].Trim()) { throw "Staged audit/findings blob mismatch: $path" }
}
foreach ($path in $roots) {
    $stagedBlob=@(& git rev-parse ":0:$path")
    if ($LASTEXITCODE -ne 0 -or $stagedBlob.Count -ne 1 -or $stagedBlob[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw "Staged manifest artifact blob is missing: $path" }
    $stagedSha=@(& 'host\venv\Scripts\python.exe' -c "import hashlib,subprocess,sys; print(hashlib.sha256(subprocess.check_output(['git','cat-file','blob',sys.argv[1]])).hexdigest())" $stagedBlob[0].Trim())
    if ($LASTEXITCODE -ne 0 -or $stagedSha.Count -ne 1 -or $stagedSha[0].Trim() -cne $manifest[$path]) { throw "Staged manifest artifact bytes differ from manifest: $path" }
}
$stagedManifestSha=@(& 'host\venv\Scripts\python.exe' -c "import hashlib,subprocess,sys; print(hashlib.sha256(subprocess.check_output(['git','cat-file','blob',sys.argv[1]])).hexdigest())" $stagedManifestBlob[0].Trim())
if ($LASTEXITCODE -ne 0 -or $stagedManifestSha.Count -ne 1 -or $stagedManifestSha[0].Trim() -cne $manifestHash) { throw 'Staged manifest bytes differ from the report-bound hash' }
$evidenceCommitExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('commit','-m','docs(verification): record Plan E hardening evidence') -ExpectedWorkingDirectory (Get-Location).Path
if ($evidenceCommitExit -ne 0) { throw 'Evidence commit failed' }
$finalEvidenceHeadLines=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $finalEvidenceHeadLines.Count -ne 1) { throw 'Could not resolve final evidence head' }
$script:PlanEFinalEvidenceHead=$finalEvidenceHeadLines[0].Trim()
if ($script:PlanEFinalEvidenceHead -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind final evidence head' }
if ($script:PlanEFinalEvidenceHead -ceq $script:PlanEReviewedHead) { throw 'Evidence commit did not advance HEAD' }
$finalCommitPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $script:PlanEFinalEvidenceHead | Sort-Object)
$finalCommitParent=@(& git rev-parse "$script:PlanEFinalEvidenceHead^")
$finalCommitSubject=@(& git show -s --format=%s $script:PlanEFinalEvidenceHead)
if ($LASTEXITCODE -ne 0 -or $finalCommitPaths.Count -ne 60 -or $finalCommitParent.Count -ne 1 -or $finalCommitParent[0].Trim() -cne $script:PlanEReviewedHead -or $finalCommitSubject.Count -ne 1 -or $finalCommitSubject[0] -cne 'docs(verification): record Plan E hardening evidence') { throw 'Final evidence commit metadata mismatch immediately after commit' }
$introducedPaths=@(& git diff --diff-filter=A --name-only --no-renames "$script:PlanEReviewedHead..$script:PlanEFinalEvidenceHead" | Sort-Object)
if ($LASTEXITCODE -ne 0 -or $introducedPaths.Count -ne 60 -or ($introducedPaths -join "`n") -cne ($evidenceCommitPaths -join "`n")) { throw 'Final evidence commit did not add exactly 60 previously absent paths' }
$script:PlanECurrentRunArtifacts=[ordered]@{}
$script:PlanECurrentRunArtifactsFrozen=$true
$postCommitStatus=@(& git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or $postCommitStatus.Count -ne 0) { throw 'Final evidence commit did not leave a clean tracked checkout' }
$remainingIgnoredPaths=Assert-PlanEIgnoredTopology -Context 'post-evidence commit' -ExpectedStep0Artifacts @() -CurrentRunArtifacts @() -RequireSurvivingReports $false
```

Expected: all six review artifacts and both audits exist and are frozen; both packages record the same final committed reviewed product head; Plan-E findings are `PASS`; original-base findings are `INTERIM PASS THROUGH PLAN E` and retain the exact final-D rerun requirement. The exact 58 manifest artifacts, including both findings files and both audits, plus the manifest and report are force-staged as 60 previously absent evidence paths. The committed report records both observed literal ranges and all review/audit hashes, so clean-clone validation needs no ignored-only evidence.
Packages/diffs, both findings records, both audits, all six reports, every
machine result/script/map/transcript, manifest, and report are therefore
committed; no clean-clone validation input remains ignored-only.

This exact evidence child is the sole permitted post-review HEAD change. Its one
parent equals both audit subjects and both review heads; any other parent,
subject, path count, or subsequent HEAD change invalidates readiness.
Its exact subject remains `docs(verification): record Plan E hardening evidence`.
The report states that parent relationship and never describes the evidence
commit as part of either reviewed diff.
Findings and audit bytes become durable only through this actual commit and its
post-commit clean-clone gate, not through prospective review prose.
All `git check-ignore` calls are pre-commit safety checks only. Post-commit and
clean-clone validation uses tracked blobs/history and never reads
`.superpowers/sdd/.gitignore` or invokes `git check-ignore`.
Every final/post-commit validator assigns its base directly to literal
`0dbb4852931b50153fb898b03129ae0092c46404`; no local base file may override it.
Every manifest artifact is a committed regular file; no symlink/reparse path is
accepted. Clean-clone validation hashes those committed bytes and independently
compares exact manifest membership.

- [ ] **Step 11: Final readiness check**

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$base='0dbb4852931b50153fb898b03129ae0092c46404'
$status=@(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final status' }
if ($status.Count -ne 0) { throw 'Final tracked checkout is not clean after evidence commit' }
git log -1 --oneline
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final commit' }
$finalHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $finalHead.Count -ne 1) {
    throw 'Could not resolve final Plan E head'
}
$finalHead=$finalHead[0].Trim()
if ([string]::IsNullOrWhiteSpace([string]$script:PlanEFinalEvidenceHead)) { $script:PlanEFinalEvidenceHead=$finalHead }
if ($script:PlanEFinalEvidenceHead -cne $finalHead) { throw 'Final evidence HEAD changed after commit' }
$finalSubject=@(& git show -s --format=%s $finalHead)
$finalParent=@(& git rev-parse "$finalHead^")
$parentCount=@(& git show -s --format=%P $finalHead)
if (
    $LASTEXITCODE -ne 0 -or
    $finalSubject.Count -ne 1 -or
    $finalSubject[0] -cne 'docs(verification): record Plan E hardening evidence' -or
    $finalParent.Count -ne 1 -or $parentCount.Count -ne 1 -or ($parentCount[0].Trim() -split ' ').Count -ne 1
) { throw 'Final HEAD is not the Plan E evidence commit' }
& git merge-base --is-ancestor $base $finalHead
if ($LASTEXITCODE -ne 0) { throw 'Literal Plan E base is not a final-head ancestor' }
$package=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-package.txt'),[Text.UTF8Encoding]::new($false))
$reviewedHead=[regex]::Match($package,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
if ($reviewedHead -notmatch '^[0-9a-f]{40}$' -or $finalParent[0].Trim() -cne $reviewedHead) {
    throw 'Evidence commit parent is not the reviewed product head'
}
if ($reviewedHead -cne $script:PlanEReviewedHead) { throw 'Evidence parent differs from the lease reviewed head' }
foreach ($task in @(6,7)) {
    $audit=[IO.File]::ReadAllText((Join-Path (Get-Location) ".superpowers/sdd/task-$task-audit-evidence.json"),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
    if ($audit['audit_subject']['commit'] -cne $reviewedHead) { throw "Evidence parent differs from Task $task audit subject" }
}
$wholePackage=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-package.txt'),[Text.UTF8Encoding]::new($false))
$wholeReviewedHead=[regex]::Match($wholePackage,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
if ($wholeReviewedHead -cne $reviewedHead -or $finalParent[0].Trim() -cne $wholeReviewedHead) { throw 'Evidence parent differs from one review head' }
$planEFindingsAtFinal=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-findings.md'),[Text.UTF8Encoding]::new($false))
$wholeFindingsAtFinal=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-findings.md'),[Text.UTF8Encoding]::new($false))
foreach ($findings in @($planEFindingsAtFinal,$wholeFindingsAtFinal)) {
    if ([regex]::Match($findings,'(?m)^## Review Head\r?\n([0-9a-f]{40})\r?$').Groups[1].Value -cne $reviewedHead) { throw 'Evidence parent differs from a findings review head' }
}
$finalVerificationValue=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/reviewed-head-verification.json'),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
if ($finalVerificationValue['reviewed_head'] -cne $reviewedHead) { throw 'Evidence parent differs from reviewed-head verification' }
$reviewedPlanBlob=@(& git rev-parse "$reviewedHead`:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md")
if ($LASTEXITCODE -ne 0 -or $reviewedPlanBlob.Count -ne 1 -or $reviewedPlanBlob[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not resolve reviewed plan blob at final readiness' }
foreach ($task in @(6,7)) {
    $audit=[IO.File]::ReadAllText((Join-Path (Get-Location) ".superpowers/sdd/task-$task-audit-evidence.json"),[Text.UTF8Encoding]::new($false)) | ConvertFrom-Json -AsHashtable
    if ($audit['audit_subject']['plan_blob'] -cne $reviewedPlanBlob[0].Trim()) { throw "Task $task audit plan blob differs from reviewed parent" }
}
$finalPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $finalHead | Sort-Object)
if ($LASTEXITCODE -ne 0 -or $finalPaths.Count -ne 60) {
    throw 'Final evidence commit is not exactly 60 paths'
}
$evidencePath='.superpowers/sdd/plan-e-extension-hardening-report.md'
$committedEvidence=@(& git show "HEAD:$evidencePath") -join "`n"
$workingEvidence=[IO.File]::ReadAllText((Join-Path (Get-Location) $evidencePath),[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n"
if ($LASTEXITCODE -ne 0 -or $workingEvidence.TrimEnd("`n") -cne $committedEvidence.TrimEnd("`n")) {
    throw 'Working evidence differs from committed evidence'
}
$artifactPaths=@(
    '.superpowers/sdd/promotion-ledger.json',
    '.superpowers/sdd/promotion-observed.json',
    '.superpowers/sdd/promotion-transcripts.sha256.json',
    '.superpowers/sdd/promotion-red.sha256.json',
    '.superpowers/sdd/promotion-green.sha256.json',
    '.superpowers/sdd/promotion-mutation.sha256.json',
    '.superpowers/sdd/promotion-ast.sha256',
    '.superpowers/sdd/focused-extension-results.json',
    '.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json',
    '.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/task-6-audit-evidence.json',
    '.superpowers/sdd/task-7-audit-evidence.json',
    '.superpowers/sdd/final-artifacts.sha256.json'
)
foreach ($path in $artifactPaths) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final evidence artifact missing: $path" }
    $tracked=@(& git ls-files --error-unmatch -- $path 2>$null)
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 1 -or $tracked[0] -cne $path) { throw "Final evidence artifact is not committed: $path" }
}
$committedEvidenceSet=@($finalPaths)
foreach ($path in $committedEvidenceSet) {
    $tracked=@(& git ls-files --error-unmatch -- $path 2>$null)
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 1 -or $tracked[0] -cne $path) { throw "Final evidence path is not tracked: $path" }
}
$finalReportBlob=@(& git rev-parse "$finalHead`:.superpowers/sdd/plan-e-extension-hardening-report.md")
$workingReportBlob=@(& git hash-object -- '.superpowers/sdd/plan-e-extension-hardening-report.md')
if ($LASTEXITCODE -ne 0 -or $finalReportBlob.Count -ne 1 -or $workingReportBlob.Count -ne 1 -or $finalReportBlob[0].Trim() -cne $workingReportBlob[0].Trim()) { throw 'Final report working/committed blob mismatch' }
$finalReportSha=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/plan-e-extension-hardening-report.md').Hash.ToLowerInvariant()
if ($finalReportSha -notmatch '^[0-9a-f]{64}$') { throw 'Final report SHA-256 is invalid' }
$hashLabels=[ordered]@{
    'Promotion ledger SHA-256'='.superpowers/sdd/promotion-ledger.json'
    'Promotion observed SHA-256'='.superpowers/sdd/promotion-observed.json'
    'Promotion transcript map SHA-256'='.superpowers/sdd/promotion-transcripts.sha256.json'
    'Promotion RED map SHA-256'='.superpowers/sdd/promotion-red.sha256.json'
    'Promotion GREEN map SHA-256'='.superpowers/sdd/promotion-green.sha256.json'
    'Promotion mutation map SHA-256'='.superpowers/sdd/promotion-mutation.sha256.json'
    'Promotion AST record SHA-256'='.superpowers/sdd/promotion-ast.sha256'
    'Focused Extension result SHA-256'='.superpowers/sdd/focused-extension-results.json'
    'Full Extension result SHA-256'='.superpowers/sdd/full-extension-results.json'
    'Host test result SHA-256'='.superpowers/sdd/host-test-results.json'
    'Reviewed-head verification SHA-256'='.superpowers/sdd/reviewed-head-verification.json'
    'Task 6 audit evidence SHA-256'='.superpowers/sdd/task-6-audit-evidence.json'
    'Task 7 audit evidence SHA-256'='.superpowers/sdd/task-7-audit-evidence.json'
}
foreach ($entry in $hashLabels.GetEnumerator()) {
    $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Value).Hash.ToLowerInvariant()
    $line=('**' + $entry.Key + ':** `' + $hash + '`')
    if ([regex]::Matches($committedEvidence,'(?m)^' + [regex]::Escape($line) + '$').Count -ne 1) {
        throw "Committed evidence hash no longer matches artifact: $($entry.Key)"
    }
}
$finalPhaseMapValidator=@'
import hashlib,json,pathlib,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
def strict(path):
    text=path.read_text(encoding='utf-8')
    value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
    if type(value) is not dict or any(type(k) is not str or type(v) is not str for k,v in value.items()): raise SystemExit(str(path)+' shape')
    if '\r' in text or text.startswith('\ufeff') or text!=json.dumps(value,ensure_ascii=True,allow_nan=False,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(str(path)+' noncanonical')
    return value
root=pathlib.Path(sys.argv[1])
methods=[
    'test_windows_access_denied_retries_atomic_preparing_promotion',
    'test_windows_sharing_errors_32_and_33_are_retryable',
    'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'test_non_windows_or_unlisted_promotion_errors_are_not_retried',
    'test_preparing_promotion_revalidates_before_and_after_sleep',
    'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'test_preparing_promotion_hooks_wrap_the_logical_operation_once',
    'test_update_engine_constructor_signature_remains_frozen',
]
mutation_methods={
    'classification':'test_windows_access_denied_retries_atomic_preparing_promotion',
    'bound':'test_persistent_windows_promotion_lock_stops_after_three_attempts',
    'initial':'test_preparing_promotion_revalidates_before_and_after_sleep',
    'pre-sleep':'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
    'post-sleep':'test_preparing_promotion_revalidation_rejects_every_authority_mismatch',
}
expected_directories={'red','green',*(f'mutation-{name}' for name in mutation_methods)}
expected_files={*(f'{phase}/{method}.txt' for phase in ('red','green') for method in methods)}
for name,method in mutation_methods.items():
    expected_files.add(f'mutation-{name}/{method}.txt')
    expected_files.add(f'mutation-{name}/{method}.restored-green.txt')
entries=list(root.rglob('*'))
if not root.is_dir() or root.is_symlink() or any(path.is_symlink() or (not path.is_dir() and not path.is_file()) for path in entries): raise SystemExit('unsupported transcript entry')
actual_directories={path.relative_to(root).as_posix() for path in entries if path.is_dir()}
actual_files={path.relative_to(root).as_posix() for path in entries if path.is_file()}
if actual_directories!=expected_directories or actual_files!=expected_files: raise SystemExit('phase transcript topology')
red_files=sorted(root/path for path in actual_files if path.startswith('red/'))
green_files=sorted(root/path for path in actual_files if path.startswith('green/'))
mutation_files=sorted(root/path for path in actual_files if path.startswith('mutation-'))
red={path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in red_files}
green={path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in green_files}
mutation={path.relative_to(root).as_posix():hashlib.sha256(path.read_bytes()).hexdigest() for path in mutation_files}
complete={path.relative_to(root).as_posix():hashlib.sha256(path.read_bytes()).hexdigest() for path in red_files+green_files+mutation_files}
expected={
    pathlib.Path(sys.argv[2]):red,
    pathlib.Path(sys.argv[3]):green,
    pathlib.Path(sys.argv[4]):mutation,
    pathlib.Path(sys.argv[5]):complete,
}
for path,inventory in expected.items():
    if strict(path)!=inventory: raise SystemExit(str(path)+' inventory')
'@
& 'host\venv\Scripts\python.exe' -c $finalPhaseMapValidator `
    '.superpowers/sdd/promotion-transcripts' `
    '.superpowers/sdd/promotion-red.sha256.json' `
    '.superpowers/sdd/promotion-green.sha256.json' `
    '.superpowers/sdd/promotion-mutation.sha256.json' `
    '.superpowers/sdd/promotion-transcripts.sha256.json'
if ($LASTEXITCODE -ne 0) { throw 'Final canonical promotion phase-map validation failed' }
$finalVerificationPath='.superpowers/sdd/reviewed-head-verification.json'
$finalVerificationText=[IO.File]::ReadAllText((Join-Path (Get-Location) $finalVerificationPath),[Text.UTF8Encoding]::new($false))
$finalExpectedFocusedSummary=@(
    'src/utils/ownData.test.ts','src/utils/bookmarkItems.test.ts','src/components/Options.test.tsx',
    'src/components/MenuLogic.teamCache.test.ts','src/utils/teamCatalog.test.ts','src/background/teamManifestSync.test.ts',
    'src/utils/analysisStore.test.ts','src/background/analyzeBridge.test.ts','src/background/analyzeRequestHandler.test.ts',
    'src/background/nativeMessageWire.test.ts','src/hooks/useAnalysisHydration.test.ts','src/utils/promptSourceErrors.test.ts',
    'src/utils/pageIdentity.test.ts','src/utils/analyzeRequest.test.ts','src/background/contextMenu.test.ts',
    'src/components/ResultPopover.test.tsx','src/components/FAB.pageIdentity.test.tsx','src/components/FAB.analyzeRequest.test.tsx',
    'src/components/FAB.spinner.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/utils/nativeUpdateError.test.ts',
    'src/utils/configUpdateResult.test.ts','src/background/resetExtensionState.test.ts','src/content/updateErrorBridge.test.ts'
)
$finalExpectedTask6Summary=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts')
$finalExpectedTask7Summary=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts')
$finalExpectedFullSummary=@(& git ls-tree -r --name-only $reviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $finalExpectedFullSummary.Count -lt 1) { throw 'Could not inventory final reviewed Extension summary' }
$finalVerificationParser=@'
import hashlib,json,pathlib,subprocess,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value):
    raise ValueError('non-finite JSON constant: '+value)
path=pathlib.Path(sys.argv[1]); head=sys.argv[2]
arguments=sys.argv[3:]
task6_index=arguments.index('--task-6'); task7_index=arguments.index('--task-7'); full_index=arguments.index('--full')
expected_files={
    'plan_e_focused':arguments[:task6_index],
    'task_6_current':arguments[task6_index+1:task7_index],
    'task_7_current':arguments[task7_index+1:full_index],
    'full_extension':arguments[full_index+1:],
}
text=path.read_text(encoding='utf-8'); value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
if '\r' in text or text.startswith('\ufeff') or text!=json.dumps(value,ensure_ascii=True,allow_nan=False,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit('verification noncanonical')
keys={'schema_version','reviewed_head','tested_source_roots','tested_source_blobs','focused_extension','full_extension','host','host_compile','typescript','build','static','diff','machine_result_sha256','test_summary'}
passed={'focused_extension','full_extension','host','host_compile','typescript','build','static','diff'}
roots=['extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat']
if set(value)!=keys or type(value.get('schema_version')) is not int or value.get('schema_version')!=1 or value.get('reviewed_head')!=head or value.get('tested_source_roots')!=roots or any(value.get(key)!='passed' for key in passed): raise SystemExit('verification shape/status/head')
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',head,'--',*roots],text=True,encoding='utf-8').splitlines()
blobs=value.get('tested_source_blobs')
if type(blobs) is not dict or set(blobs)!=set(paths): raise SystemExit('verification source inventory')
for item in paths:
    expected=subprocess.check_output(['git','rev-parse',f'{head}:{item}'],text=True,encoding='utf-8').strip()
    working=subprocess.check_output(['git','hash-object','--',item],text=True,encoding='utf-8').strip()
    if blobs.get(item)!=expected or working!=expected: raise SystemExit('verification source blob '+item)
expected_hashes={'focused_extension':'.superpowers/sdd/focused-extension-results.json','full_extension':'.superpowers/sdd/full-extension-results.json','host':'.superpowers/sdd/host-test-results.json'}
hashes=value.get('machine_result_sha256')
if type(hashes) is not dict or set(hashes)!=set(expected_hashes): raise SystemExit('verification result hash shape')
for key,file in expected_hashes.items():
    if hashes.get(key)!=hashlib.sha256(pathlib.Path(file).read_bytes()).hexdigest(): raise SystemExit('verification result hash '+key)
summary=value.get('test_summary')
if type(summary) is not dict or set(summary)!={'focused_extension','full_extension','host'}: raise SystemExit('verification summary shape')
focused_summary=summary.get('focused_extension')
if type(focused_summary) is not dict or list(focused_summary)!=['plan_e_focused','task_6_current','task_7_current']: raise SystemExit('verification focused summary inventory')
for key,row in focused_summary.items():
    if type(row) is not dict or set(row)!={'files','tests'} or type(row.get('tests')) is not int or row['tests']<1 or row.get('files')!=len(expected_files[key]): raise SystemExit('verification focused summary counters '+key)
full_summary=summary.get('full_extension')
if type(full_summary) is not dict or set(full_summary)!={'files','tests'} or type(full_summary.get('tests')) is not int or full_summary['tests']<1 or full_summary.get('files')!=len(expected_files['full_extension']): raise SystemExit('verification full summary counters')
host=summary.get('host')
if type(host) is not dict or set(host)!={'focused','task_7_current','full','update_engine','recovery','package'}: raise SystemExit('verification Host summary shape')
for key,row in host.items():
    if type(row) is not dict or set(row)!={'tests','skipped','skips','passed_selectors'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or type(row.get('skips')) is not list or len(row['skips'])!=row['skipped'] or type(row.get('passed_selectors')) is not list or row['passed_selectors']!=sorted(row['passed_selectors']) or len(row['passed_selectors'])!=len(set(row['passed_selectors'])) or len(row['passed_selectors'])!=row['tests']-row['skipped']: raise SystemExit('verification Host summary counters/selectors '+key)
required_task7={
    'TestSessionIdentityLifecycle.test_explicit_empty_analyze_root_overrides_config_for_one_request',
    'TestSessionIdentityLifecycle.test_request_after_explicit_empty_without_marker_uses_configured_root',
    'TestSessionIdentityLifecycle.test_malformed_explicit_marker_uses_legacy_fallback',
    'TestSessionIdentityLifecycle.test_explicit_marker_with_non_string_root_uses_legacy_fallback',
}
if not all(any(item.endswith(selector) for item in host['task_7_current']['passed_selectors']) for selector in required_task7): raise SystemExit('verification Task 7 named selectors')
'@
& 'host\venv\Scripts\python.exe' -c $finalVerificationParser $finalVerificationPath $reviewedHead @finalExpectedFocusedSummary '--task-6' @finalExpectedTask6Summary '--task-7' @finalExpectedTask7Summary '--full' @finalExpectedFullSummary
if ($LASTEXITCODE -ne 0) { throw 'Final reviewed-head verification validation failed' }
$planAtFinal=@(& git show 'HEAD:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not read committed plan for final strict test validation' }
$strictTestMatch=[regex]::Match($planAtFinal,'(?s)# REVIEWED_TEST_EVIDENCE_VALIDATOR_START\n(.*?)\n# REVIEWED_TEST_EVIDENCE_VALIDATOR_END')
if (-not $strictTestMatch.Success) { throw 'Final strict test-evidence validator contract missing' }
$finalExpectedFocused=@(
    'src/utils/ownData.test.ts','src/utils/bookmarkItems.test.ts','src/components/Options.test.tsx',
    'src/components/MenuLogic.teamCache.test.ts','src/utils/teamCatalog.test.ts','src/background/teamManifestSync.test.ts',
    'src/utils/analysisStore.test.ts','src/background/analyzeBridge.test.ts','src/background/analyzeRequestHandler.test.ts',
    'src/background/nativeMessageWire.test.ts','src/hooks/useAnalysisHydration.test.ts','src/utils/promptSourceErrors.test.ts',
    'src/utils/pageIdentity.test.ts','src/utils/analyzeRequest.test.ts','src/background/contextMenu.test.ts',
    'src/components/ResultPopover.test.tsx','src/components/FAB.pageIdentity.test.tsx','src/components/FAB.analyzeRequest.test.tsx',
    'src/components/FAB.spinner.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/utils/nativeUpdateError.test.ts',
    'src/utils/configUpdateResult.test.ts','src/background/resetExtensionState.test.ts','src/content/updateErrorBridge.test.ts'
)
$finalExpectedTask6Focused=@('src/components/FAB.pageIdentity.test.tsx','src/components/FAB.spinner.test.tsx','src/hooks/useAnalysisHydration.test.ts','src/utils/pageIdentity.test.ts')
$finalExpectedTask7Focused=@('src/background/contextMenu.test.ts','src/components/FAB.analyzeRequest.test.tsx','src/components/FAB.bookmarkTelemetry.test.tsx','src/components/FAB.promptSourceErrors.test.tsx','src/components/FAB.spinner.test.tsx','src/components/FAB.userPrompt.test.tsx','src/utils/analyzeRequest.test.ts')
$finalExpectedFull=@(& git ls-tree -r --name-only $reviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $finalExpectedFull.Count -lt 1) { throw 'Could not inventory final reviewed Extension tests' }
$finalStrictTest=@($strictTestMatch.Groups[1].Value | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' '.superpowers/sdd/reviewed-head-verification.json' $reviewedHead @finalExpectedFocused '--task-6' @finalExpectedTask6Focused '--task-7' @finalExpectedTask7Focused '--full' @finalExpectedFull)
if ($LASTEXITCODE -ne 0 -or $finalStrictTest.Count -ne 1) { throw 'Final strict Vitest/Host evidence validation failed' }
$manifestPath='.superpowers/sdd/final-artifacts.sha256.json'
$manifestText=[IO.File]::ReadAllText((Join-Path (Get-Location) $manifestPath),[Text.UTF8Encoding]::new($false))
$manifestParser=@'
import json,re,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if not isinstance(value,dict) or any(type(k) is not str or type(v) is not str or re.fullmatch(r'[0-9a-f]{64}',v) is None for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonicalManifest=@($manifestText | & 'host\venv\Scripts\python.exe' -c $manifestParser)
if ($LASTEXITCODE -ne 0 -or $canonicalManifest.Count -ne 1 -or $manifestText -cne $canonicalManifest[0] + "`n") { throw 'Final artifact manifest invalid or noncanonical' }
$manifest=$canonicalManifest[0] | ConvertFrom-Json -AsHashtable
if ($manifest.Count -ne 58) { throw 'Final artifact manifest count mismatch' }
$manifestKeys=@($manifest.Keys | Sort-Object)
$finalExpectedArtifacts=@(
    '.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1',
    '.superpowers/sdd/promotion-executor.sha256','.superpowers/sdd/promotion-mutation-runner.sha256',
    '.superpowers/sdd/promotion-red-source.sha256','.superpowers/sdd/promotion-green-source.sha256',
    '.superpowers/sdd/promotion-mutation-source.sha256','.superpowers/sdd/promotion-observed.json',
    '.superpowers/sdd/promotion-ledger.json','.superpowers/sdd/promotion-transcripts.sha256.json',
    '.superpowers/sdd/promotion-red.sha256.json','.superpowers/sdd/promotion-green.sha256.json',
    '.superpowers/sdd/promotion-mutation.sha256.json','.superpowers/sdd/promotion-ast.sha256',
    '.superpowers/sdd/focused-extension-results.json','.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json','.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/plan-e-only-review-package.txt','.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/task-6-audit-evidence.json'
)
$finalExpectedArtifacts += @(
    '.superpowers/sdd/task-1-report.md',
    '.superpowers/sdd/task-2-report.md',
    '.superpowers/sdd/task-3-report.md',
    '.superpowers/sdd/task-4-report.md',
    '.superpowers/sdd/task-5-report.md',
    '.superpowers/sdd/task-7-audit-evidence.json',
    '.superpowers/sdd/task-8-report.md'
)
$transcriptRoot=Join-Path (Get-Location) '.superpowers/sdd/promotion-transcripts'
$expectedTranscriptMethods=@('test_windows_access_denied_retries_atomic_preparing_promotion','test_windows_sharing_errors_32_and_33_are_retryable','test_persistent_windows_promotion_lock_stops_after_three_attempts','test_non_windows_or_unlisted_promotion_errors_are_not_retried','test_preparing_promotion_revalidates_before_and_after_sleep','test_preparing_promotion_revalidation_rejects_every_authority_mismatch','test_preparing_promotion_hooks_wrap_the_logical_operation_once','test_update_engine_constructor_signature_remains_frozen')
$expectedMutationMethods=[ordered]@{classification='test_windows_access_denied_retries_atomic_preparing_promotion';bound='test_persistent_windows_promotion_lock_stops_after_three_attempts';initial='test_preparing_promotion_revalidates_before_and_after_sleep';'pre-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch';'post-sleep'='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'}
$expectedTranscriptDirectories=@('red','green') + @($expectedMutationMethods.Keys | ForEach-Object { "mutation-$_" })
$expectedTranscriptFiles=@(); foreach ($method in $expectedTranscriptMethods) { $expectedTranscriptFiles += "red/$method.txt"; $expectedTranscriptFiles += "green/$method.txt" }; foreach ($entry in $expectedMutationMethods.GetEnumerator()) { $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).txt"; $expectedTranscriptFiles += "mutation-$($entry.Key)/$($entry.Value).restored-green.txt" }
$transcriptRootInfo=Get-Item -LiteralPath $transcriptRoot -Force
$transcriptEntries=@(Get-ChildItem -LiteralPath $transcriptRoot -Force -Recurse)
$unsupportedTranscriptEntries=@($transcriptEntries | Where-Object { ($_ -isnot [IO.FileInfo] -and $_ -isnot [IO.DirectoryInfo]) -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
$actualTranscriptDirectories=@($transcriptEntries | Where-Object { $_ -is [IO.DirectoryInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$actualTranscriptFiles=@($transcriptEntries | Where-Object { $_ -is [IO.FileInfo] } | ForEach-Object { [IO.Path]::GetRelativePath($transcriptRoot,$_.FullName).Replace('\','/') } | Sort-Object)
$missingTranscriptDirectories=@($expectedTranscriptDirectories | Where-Object { $actualTranscriptDirectories -cnotcontains $_ }); $extraTranscriptDirectories=@($actualTranscriptDirectories | Where-Object { $expectedTranscriptDirectories -cnotcontains $_ }); $missingTranscriptFiles=@($expectedTranscriptFiles | Where-Object { $actualTranscriptFiles -cnotcontains $_ }); $extraTranscriptFiles=@($actualTranscriptFiles | Where-Object { $expectedTranscriptFiles -cnotcontains $_ })
if ($transcriptRootInfo -isnot [IO.DirectoryInfo] -or ($transcriptRootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $unsupportedTranscriptEntries.Count -ne 0 -or $actualTranscriptDirectories.Count -ne 7 -or $actualTranscriptFiles.Count -ne 26 -or $missingTranscriptDirectories.Count -ne 0 -or $extraTranscriptDirectories.Count -ne 0 -or $missingTranscriptFiles.Count -ne 0 -or $extraTranscriptFiles.Count -ne 0) { throw 'Final-readiness transcript topology mismatch' }
$finalExpectedArtifacts += @($actualTranscriptFiles | ForEach-Object { '.superpowers/sdd/promotion-transcripts/' + $_ })
$finalExpectedArtifacts=@($finalExpectedArtifacts | Sort-Object -Unique)
if ($finalExpectedArtifacts -ccontains '.superpowers/sdd/task-6-report.md' -or $finalExpectedArtifacts -ccontains '.superpowers/sdd/task-7-report.md' -or $finalExpectedArtifacts -cnotcontains '.superpowers/sdd/task-6-audit-evidence.json' -or $finalExpectedArtifacts -cnotcontains '.superpowers/sdd/task-7-audit-evidence.json') { throw 'Final-readiness Task 6/7 slot replacement mismatch' }
if (($manifestKeys -join "`n") -cne ($finalExpectedArtifacts -join "`n")) { throw 'Final-readiness manifest sorted key inventory mismatch' }
$survivingReportPaths=@('.superpowers/sdd/task-1-report.md','.superpowers/sdd/task-2-report.md','.superpowers/sdd/task-3-report.md','.superpowers/sdd/task-4-report.md','.superpowers/sdd/task-5-report.md','.superpowers/sdd/task-8-report.md')
if ($survivingReportPaths.Count -ne 6 -or @($survivingReportPaths | Where-Object { $finalExpectedArtifacts -cnotcontains $_ }).Count -ne 0) { throw 'Final-readiness six-report inventory mismatch' }
$expectedFinalCommitPaths=@($finalExpectedArtifacts + @(
    '.superpowers/sdd/final-artifacts.sha256.json',
    '.superpowers/sdd/plan-e-extension-hardening-report.md'
) | Sort-Object -Unique)
if ($expectedFinalCommitPaths.Count -ne 60 -or ($finalPaths -join "`n") -cne ($expectedFinalCommitPaths -join "`n")) {
    throw 'Final-readiness evidence commit exact path set mismatch'
}
$finalAddedPaths=@(& git diff --diff-filter=A --name-only --no-renames "$reviewedHead..$finalHead" | Sort-Object)
if ($LASTEXITCODE -ne 0 -or $finalAddedPaths.Count -ne 60 -or ($finalAddedPaths -join "`n") -cne ($expectedFinalCommitPaths -join "`n")) { throw 'Final-readiness evidence paths were not all newly added' }
foreach ($path in @('.superpowers/sdd/task-6-report.md','.superpowers/sdd/task-7-report.md')) {
    $committedMissing=@(& git ls-tree -r --name-only $finalHead -- $path)
    if ($LASTEXITCODE -ne 0 -or $committedMissing.Count -ne 0 -or (Test-Path -LiteralPath $path)) { throw "Historical report path is not absent at final readiness: $path" }
}
$baseToFinalPaths=@(& git diff --name-only --no-renames "$base..$finalHead" | Sort-Object)
$reviewedProductPaths=@(& git diff --name-only --no-renames "$base..$reviewedHead" | Sort-Object)
$expectedUnion=@($reviewedProductPaths + $expectedFinalCommitPaths | Sort-Object -Unique)
if ($reviewedProductPaths.Count -ne 61 -or $baseToFinalPaths.Count -ne 121 -or $expectedUnion.Count -ne 121 -or ($baseToFinalPaths -join "`n") -cne ($expectedUnion -join "`n") -or @($reviewedProductPaths | Where-Object { $expectedFinalCommitPaths -ccontains $_ }).Count -ne 0) { throw 'Final-readiness 61+60=121 path union mismatch' }
$amendmentPath='docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md'
if ($reviewedProductPaths -cnotcontains $amendmentPath) { throw 'Final reviewed range omits the accepted amendment path' }
$observedManagedFiles=@()
foreach ($path in $finalExpectedArtifacts) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final-readiness artifact missing: $path" }
    $info=Get-Item -LiteralPath $path -Force
    if (($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Final-readiness artifact is a reparse point: $path" }
    $observedManagedFiles += $path
}
$observedManagedFiles=@($observedManagedFiles | Sort-Object -Unique)
if ($observedManagedFiles.Count -ne 58 -or ($observedManagedFiles -join "`n") -cne ($finalExpectedArtifacts -join "`n")) { throw 'Final-readiness exact artifact inventory mismatch' }
$missingManifest=@($finalExpectedArtifacts | Where-Object { -not $manifest.ContainsKey($_) })
$extraManifest=@($manifest.Keys | Where-Object { $finalExpectedArtifacts -cnotcontains $_ })
if ($finalExpectedArtifacts.Count -ne 58 -or $missingManifest.Count -ne 0 -or $extraManifest.Count -ne 0) {
    throw "Final artifact manifest path set mismatch. Missing: $($missingManifest -join ', '); Extra: $($extraManifest -join ', ')"
}
if ($expectedFinalCommitPaths.Count -ne 60) { throw 'Final-readiness 58+2 evidence path count mismatch' }
$committedManifestText=@(& git show "$finalHead`:$manifestPath") -join "`n"
if ($LASTEXITCODE -ne 0 -or $committedManifestText.TrimEnd("`n") -cne ($manifestText -replace "`r`n","`n").TrimEnd("`n")) { throw 'Final-readiness committed manifest bytes mismatch' }
foreach ($entry in $manifest.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key -PathType Leaf)) { throw "Manifest artifact missing: $($entry.Key)" }
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Key).Hash.ToLowerInvariant()
    $blobId=@(& git rev-parse "$finalHead`:$($entry.Key)")
    if ($LASTEXITCODE -ne 0 -or $blobId.Count -ne 1 -or $blobId[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw "Committed manifest artifact blob is missing: $($entry.Key)" }
    $blobHash=@(& 'host\venv\Scripts\python.exe' -c "import hashlib,subprocess,sys; print(hashlib.sha256(subprocess.check_output(['git','cat-file','blob',sys.argv[1]])).hexdigest())" $blobId[0].Trim())
    if ($LASTEXITCODE -ne 0 -or $blobHash.Count -ne 1 -or $actual -cne $entry.Value -or $blobHash[0].Trim() -cne $entry.Value) { throw "Manifest working/committed artifact drift: $($entry.Key)" }
}
$manifestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
$manifestLine=('**Final artifact manifest SHA-256:** `' + $manifestHash + '`')
if ([regex]::Matches($committedEvidence,'(?m)^' + [regex]::Escape($manifestLine) + '$').Count -ne 1) {
    throw 'Committed evidence manifest hash mismatch'
}
$lockedHistoricalReportHashes=[ordered]@{
    '.superpowers/sdd/task-1-report.md'='678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba'
    '.superpowers/sdd/task-2-report.md'='edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7'
    '.superpowers/sdd/task-3-report.md'='5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591'
    '.superpowers/sdd/task-4-report.md'='5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2'
    '.superpowers/sdd/task-5-report.md'='323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73'
    '.superpowers/sdd/task-8-report.md'='3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b'
}
foreach ($entry in $lockedHistoricalReportHashes.GetEnumerator()) {
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Key).Hash.ToLowerInvariant()
    if ($actual -cne $entry.Value -or $manifest[$entry.Key] -cne $entry.Value) { throw "Historical report/manifest hash mismatch: $($entry.Key)" }
}
foreach ($task in @(6,7)) {
    $auditPath=".superpowers/sdd/task-$task-audit-evidence.json"
    $auditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $auditPath).Hash.ToLowerInvariant()
    if ($manifest[$auditPath] -cne $auditHash) { throw "Audit/manifest hash mismatch: Task $task" }
}
foreach ($path in @('.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-findings.md')) {
    $findingsHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($manifest[$path] -cne $findingsHash) { throw "Findings/manifest hash mismatch: $path" }
}
$finalAuditProgramMatch=[regex]::Match($planAtFinal,'(?s)<!-- PLAN_E_AUDIT_PROGRAM_START -->\n```python\n(.*?)\n```\n<!-- PLAN_E_AUDIT_PROGRAM_END -->')
if (-not $finalAuditProgramMatch.Success) { throw 'Final canonical audit validator contract missing' }
foreach ($task in @(6,7)) {
    $finalAuditProgramMatch.Groups[1].Value | & 'host\venv\Scripts\python.exe' - validate ".superpowers/sdd/task-$task-audit-evidence.json"
    if ($LASTEXITCODE -ne 0) { throw "Final Task $task audit validation failed" }
}
$committedReviewFiles=@('.superpowers/sdd/plan-e-only-review-findings.md','.superpowers/sdd/original-whole-branch-interim-review-findings.md')
foreach ($path in $committedReviewFiles) {
    $blob=@(& git rev-parse "$finalHead`:$path")
    $working=@(& git hash-object -- $path)
    if ($LASTEXITCODE -ne 0 -or $blob.Count -ne 1 -or $working.Count -ne 1 -or $blob[0].Trim() -cne $working[0].Trim()) { throw "Committed findings blob mismatch: $path" }
}
$planEFindings=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-findings.md'),[Text.UTF8Encoding]::new($false))
$wholeFindings=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-findings.md'),[Text.UTF8Encoding]::new($false))
if ($planEFindings -notmatch '(?m)^## Disposition\r?\nPASS\r?$' -or $wholeFindings -notmatch '(?m)^## Disposition\r?\nINTERIM PASS THROUGH PLAN E\r?$') {
    throw 'Final controller findings disposition changed'
}
$finalPlanEAuditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-6-audit-evidence.json').Hash.ToLowerInvariant()
$finalTask7AuditHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/task-7-audit-evidence.json').Hash.ToLowerInvariant()
$finalReviewSessions=@(
    [regex]::Match($planEFindings,'(?m)^## Review Session\r?\n([^\r\n]+)\r?$').Groups[1].Value,
    [regex]::Match($wholeFindings,'(?m)^## Review Session\r?\n([^\r\n]+)\r?$').Groups[1].Value
)
if ($finalReviewSessions.Count -ne 2 -or [string]::IsNullOrWhiteSpace($finalReviewSessions[0]) -or [string]::IsNullOrWhiteSpace($finalReviewSessions[1]) -or $finalReviewSessions[0] -match '[\r\n]' -or $finalReviewSessions[1] -match '[\r\n]' -or $finalReviewSessions[0] -ceq $finalReviewSessions[1]) {
    throw 'Final review records do not retain different declared session IDs'
}
foreach ($findings in @($planEFindings,$wholeFindings)) {
    foreach ($heading in @('Historical-Report Availability Honesty','No Reconstructed Historical TDD Claim','Git Lineage and Source-Blob Accuracy','Current-State Test and Mutation Sufficiency','Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition')) {
        if ([regex]::Matches($findings,'(?m)^## ' + [regex]::Escape($heading) + '\r?\nPASS\r?$').Count -ne 1) { throw "Final review criterion is not PASS: $heading" }
    }
    if ([regex]::Matches($findings,'(?m)^## Declared Session Proof Boundary\r?\nThese records prove only that two different declared orchestration session identifiers were recorded; they do not prove reviewer identity, dispatch, independence, or non-collusion\.\r?$').Count -ne 1) { throw 'Final review declared-session proof boundary changed' }
}
foreach ($findings in @($planEFindings,$wholeFindings)) {
    foreach ($pair in @(@('Task 6 Audit SHA-256',$finalPlanEAuditHash),@('Task 7 Audit SHA-256',$finalTask7AuditHash))) {
        if ([regex]::Matches($findings,'(?m)^## ' + [regex]::Escape($pair[0]) + '\r?\n' + [regex]::Escape($pair[1]) + '\r?$').Count -ne 1) { throw "Final review audit binding mismatch: $($pair[0])" }
    }
}
$planDSentinels=@('extension/src/background/nativePortClient.ts','extension/src/background/hostGate.ts','extension/src/background/updateProtocol.ts','extension/src/background/updateCoordinator.ts','extension/src/background/serviceWorker.update.test.ts')
foreach ($path in $planDSentinels) { if (Test-Path -LiteralPath $path) { throw "Plan D sentinel appeared after evidence: $path" } }
$finalTestedSourceRoots=@('extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat')
$finalHeadSource=@(& git ls-tree -r --name-only $reviewedHead -- $finalTestedSourceRoots)
$finalTrackedSource=@(& git ls-files -- $finalTestedSourceRoots)
$finalDirtySource=@(& git status --porcelain=v1 --untracked-files=no -- $finalTestedSourceRoots)
if (
    $LASTEXITCODE -ne 0 -or $finalHeadSource.Count -lt 1 -or
    ($finalHeadSource -join "`n") -cne ($finalTrackedSource -join "`n") -or
    $finalDirtySource.Count -ne 0
) { throw 'Final tracked product/test source is not globally clean at reviewed head' }
$currentFinalHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $currentFinalHead.Count -ne 1 -or $currentFinalHead[0].Trim() -cne $finalHead) { throw 'HEAD changed during final readiness validation' }
$trackedPlanEPaths=@(& git diff --name-only --no-renames "$base..$finalHead")
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final Plan E paths' }
$dirtyPlanEPaths=@(& git status --porcelain=v1 --untracked-files=all -- $trackedPlanEPaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final Plan E path status' }
if ($dirtyPlanEPaths.Count -ne 0) { throw 'A final Plan E path is dirty' }
git diff --check "$base..$finalHead"
if ($LASTEXITCODE -ne 0) { throw 'Final Plan E diff check failed' }
$cleanClone=Join-Path $script:PlanETempRoot 'clean-clone'
if (Test-Path -LiteralPath $cleanClone) { throw 'Clean-clone validation path already exists' }
$cloneExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('clone','--no-local','--no-checkout',$script:PlanECanonicalRepository,$cleanClone) -ExpectedWorkingDirectory (Get-Location).Path
if ($cloneExit -ne 0) { throw 'Could not create clean-clone validation repository' }
$cloneConfigExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('-C',$cleanClone,'config','core.autocrlf','false') -ExpectedWorkingDirectory (Get-Location).Path
if ($cloneConfigExit -ne 0) { throw 'Could not disable clean-clone checkout conversion' }
$cloneEolExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('-C',$cleanClone,'config','core.eol','lf') -ExpectedWorkingDirectory (Get-Location).Path
if ($cloneEolExit -ne 0) { throw 'Could not bind clean-clone checkout EOL' }
$cloneCheckoutExit=Invoke-PlanEWriter -FilePath $script:PlanEGitCommand -ArgumentList @('-C',$cleanClone,'checkout','--detach',$finalHead) -ExpectedWorkingDirectory (Get-Location).Path
if ($cloneCheckoutExit -ne 0) { throw 'Could not checkout final evidence commit in clean clone' }
$cloneHead=@(& git -C $cleanClone rev-parse HEAD)
$cloneStatus=@(& git -C $cleanClone status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $cloneHead.Count -ne 1 -or $cloneHead[0].Trim() -cne $finalHead -or $cloneStatus.Count -ne 0) { throw 'Clean clone is not exact and clean at final evidence head' }
& git -C $cleanClone merge-base --is-ancestor '0dbb4852931b50153fb898b03129ae0092c46404' $finalHead
if ($LASTEXITCODE -ne 0) { throw 'Literal integration base is not a clean-clone final-head ancestor' }
$cloneManifestPath=Join-Path $cleanClone '.superpowers/sdd/final-artifacts.sha256.json'
$cloneReportPath=Join-Path $cleanClone '.superpowers/sdd/plan-e-extension-hardening-report.md'
$cloneManifestText=[IO.File]::ReadAllText($cloneManifestPath,[Text.UTF8Encoding]::new($false))
$cloneManifestCanonical=@($cloneManifestText | & 'host\venv\Scripts\python.exe' -c $manifestParser)
if ($LASTEXITCODE -ne 0 -or $cloneManifestCanonical.Count -ne 1 -or $cloneManifestText -cne $cloneManifestCanonical[0] + "`n") { throw 'Clean-clone manifest is invalid or noncanonical' }
$cloneManifest=$cloneManifestCanonical[0] | ConvertFrom-Json -AsHashtable
if ($cloneManifest.Count -ne 58) { throw 'Clean-clone manifest count mismatch' }
$cloneExpectedArtifacts=@($finalExpectedArtifacts | Sort-Object)
if (($cloneManifest.Keys | Sort-Object) -join "`n" -cne ($cloneExpectedArtifacts -join "`n")) { throw 'Clean-clone manifest exact path inventory mismatch' }
foreach ($path in $cloneExpectedArtifacts) {
    $tracked=@(& git -C $cleanClone ls-files --error-unmatch -- $path 2>$null)
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 1 -or $tracked[0] -cne $path) { throw "Clean-clone manifest path is not tracked: $path" }
}
foreach ($entry in $cloneManifest.GetEnumerator()) {
    $clonePath=Join-Path $cleanClone $entry.Key
    if (-not (Test-Path -LiteralPath $clonePath -PathType Leaf)) { throw "Clean-clone artifact missing: $($entry.Key)" }
    $cloneHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $clonePath).Hash.ToLowerInvariant()
    if ($cloneHash -cne $entry.Value) { throw "Clean-clone artifact hash mismatch: $($entry.Key)" }
}
foreach ($path in @('.superpowers/sdd/task-6-report.md','.superpowers/sdd/task-7-report.md')) {
    if (Test-Path -LiteralPath (Join-Path $cleanClone $path)) { throw "Clean-clone historical report path unexpectedly exists: $path" }
}
$cloneReport=[IO.File]::ReadAllText($cloneReportPath,[Text.UTF8Encoding]::new($false))
foreach ($line in @(
    '**Integration base:** `0dbb4852931b50153fb898b03129ae0092c46404`',
    ('**Final artifact manifest SHA-256:** `' + (Get-FileHash -Algorithm SHA256 -LiteralPath $cloneManifestPath).Hash.ToLowerInvariant() + '`'),
    '**Expanded Plan E range:** `PASS` - 61 paths',
    '**Base-to-final range:** `PASS` - 121 paths',
    '**Final evidence commit contract:** `PASS` - 60 paths - docs(verification): record Plan E hardening evidence',
    ('**Final evidence parent:** `' + $reviewedHead + '`')
)) {
    if ([regex]::Matches($cloneReport,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Clean-clone report binding mismatch: $line" }
}
$clonePlanPath=Join-Path $cleanClone 'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
$cloneAuditProgramMatch=[regex]::Match(([IO.File]::ReadAllText($clonePlanPath,[Text.UTF8Encoding]::new($false)) -replace "`r`n","`n"),'(?s)<!-- PLAN_E_AUDIT_PROGRAM_START -->\n```python\n(.*?)\n```\n<!-- PLAN_E_AUDIT_PROGRAM_END -->')
if (-not $cloneAuditProgramMatch.Success) { throw 'Clean-clone audit validator contract is missing' }
$clonePlanBlob=@(& git -C $cleanClone rev-parse "$reviewedHead`:docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md")
if ($LASTEXITCODE -ne 0 -or $clonePlanBlob.Count -ne 1 -or $clonePlanBlob[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Clean-clone plan blob is unavailable at audit subject' }
Push-Location -LiteralPath $cleanClone
try {
    foreach ($task in @(6,7)) {
        $cloneAuditProgramMatch.Groups[1].Value | & (Join-Path $script:PlanECanonicalRepository 'host\venv\Scripts\python.exe') - validate ".superpowers/sdd/task-$task-audit-evidence.json"
        if ($LASTEXITCODE -ne 0) { throw "Clean-clone Task $task audit validation failed" }
    }
} finally { Pop-Location }
$clonePlanEFindings=[IO.File]::ReadAllText((Join-Path $cleanClone '.superpowers/sdd/plan-e-only-review-findings.md'),[Text.UTF8Encoding]::new($false))
$cloneWholeFindings=[IO.File]::ReadAllText((Join-Path $cleanClone '.superpowers/sdd/original-whole-branch-interim-review-findings.md'),[Text.UTF8Encoding]::new($false))
$cloneReviewBindings=[ordered]@{
    'Plan-E findings SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/plan-e-only-review-findings.md')).Hash.ToLowerInvariant()
    'Original whole-branch interim findings SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/original-whole-branch-interim-review-findings.md')).Hash.ToLowerInvariant()
    'Task 6 audit evidence SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/task-6-audit-evidence.json')).Hash.ToLowerInvariant()
    'Task 7 audit evidence SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/task-7-audit-evidence.json')).Hash.ToLowerInvariant()
}
foreach ($findings in @($clonePlanEFindings,$cloneWholeFindings)) {
    foreach ($heading in @('Historical-Report Availability Honesty','No Reconstructed Historical TDD Claim','Git Lineage and Source-Blob Accuracy','Current-State Test and Mutation Sufficiency','Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition')) {
        if ([regex]::Matches($findings,'(?m)^## ' + [regex]::Escape($heading) + '\r?\nPASS\r?$').Count -ne 1) { throw "Clean-clone review criterion mismatch: $heading" }
    }
    if ([regex]::Matches($findings,'(?m)^## Declared Session Proof Boundary\r?\nThese records prove only that two different declared orchestration session identifiers were recorded; they do not prove reviewer identity, dispatch, independence, or non-collusion\.\r?$').Count -ne 1) { throw 'Clean-clone review proof boundary mismatch' }
    foreach ($pair in @(@('Task 6 Audit SHA-256',$cloneReviewBindings['Task 6 audit evidence SHA-256']),@('Task 7 Audit SHA-256',$cloneReviewBindings['Task 7 audit evidence SHA-256']))) {
        if ([regex]::Matches($findings,'(?m)^## ' + [regex]::Escape($pair[0]) + '\r?\n' + [regex]::Escape($pair[1]) + '\r?$').Count -ne 1) { throw "Clean-clone findings audit binding mismatch: $($pair[0])" }
    }
}
foreach ($entry in $cloneReviewBindings.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($cloneReport,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Clean-clone report review/audit hash mismatch: $($entry.Key)" }
}
$cloneMachineBindings=[ordered]@{
    'Focused Extension result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/focused-extension-results.json')).Hash.ToLowerInvariant()
    'Full Extension result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/full-extension-results.json')).Hash.ToLowerInvariant()
    'Host test result SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/host-test-results.json')).Hash.ToLowerInvariant()
    'Reviewed-head verification SHA-256'=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $cleanClone '.superpowers/sdd/reviewed-head-verification.json')).Hash.ToLowerInvariant()
}
foreach ($entry in $cloneMachineBindings.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($cloneReport,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) { throw "Clean-clone report machine hash mismatch: $($entry.Key)" }
}
$cloneReviewSessions=@(
    [regex]::Match($clonePlanEFindings,'(?m)^## Review Session\r?\n([^\r\n]+)\r?$').Groups[1].Value,
    [regex]::Match($cloneWholeFindings,'(?m)^## Review Session\r?\n([^\r\n]+)\r?$').Groups[1].Value
)
if ([string]::IsNullOrWhiteSpace($cloneReviewSessions[0]) -or [string]::IsNullOrWhiteSpace($cloneReviewSessions[1]) -or $cloneReviewSessions[0] -match '[\r\n]' -or $cloneReviewSessions[1] -match '[\r\n]' -or $cloneReviewSessions[0] -ceq $cloneReviewSessions[1]) { throw 'Clean-clone declared review sessions mismatch' }
foreach ($findings in @($clonePlanEFindings,$cloneWholeFindings)) {
    if ([regex]::Match($findings,'(?m)^## Review Head\r?\n([0-9a-f]{40})\r?$').Groups[1].Value -cne $reviewedHead) { throw 'Clean-clone findings review head mismatch' }
}
$cloneFinalPaths=@(& git -C $cleanClone diff-tree --no-commit-id --name-only --no-renames -r $finalHead | Sort-Object)
$cloneReviewedPaths=@(& git -C $cleanClone diff --name-only --no-renames "0dbb4852931b50153fb898b03129ae0092c46404..$reviewedHead" | Sort-Object)
$cloneBasePaths=@(& git -C $cleanClone diff --name-only --no-renames "0dbb4852931b50153fb898b03129ae0092c46404..$finalHead" | Sort-Object)
$cloneAddedPaths=@(& git -C $cleanClone diff --diff-filter=A --name-only --no-renames "$reviewedHead..$finalHead" | Sort-Object)
if ($LASTEXITCODE -ne 0 -or $cloneReviewedPaths.Count -ne 61 -or $cloneFinalPaths.Count -ne 60 -or $cloneAddedPaths.Count -ne 60 -or ($cloneAddedPaths -join "`n") -cne ($expectedFinalCommitPaths -join "`n") -or $cloneBasePaths.Count -ne 121 -or (@($cloneReviewedPaths + $cloneAddedPaths | Sort-Object -Unique) -join "`n") -cne ($cloneBasePaths -join "`n")) { throw 'Clean-clone committed path counts/additions mismatch' }
$postCloneHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $postCloneHead.Count -ne 1 -or $postCloneHead[0].Trim() -cne $finalHead) { throw 'Primary HEAD changed after clean-clone validation' }
if (-not (Test-Path -LiteralPath $cleanClone -PathType Container)) { throw 'Clean-clone path disappeared before owner cleanup' }
```

Expected: no tracked product/test dependency differs from the reviewed product head; latest commit is the exact 60-path evidence child; the literal-base range is exactly 121 paths; and a clean clone validates all 58 manifest entries, manifest/report bindings, audit/review/machine evidence, and history without `plan-e-base.txt`, `.superpowers/sdd/.gitignore`, or post-commit `git check-ignore`. No later HEAD change is allowed. Plan E is review-ready, while final whole-branch review remains pending the exact post-D rerun.
Every clean-clone assertion is derived from committed blobs and Git history; no
ignored working-tree file is an input.

After every final gate passes, perform normal owner-only release. The same
routine may run after the live owner creates and validates an authorized
review-fix commit. In that mode HEAD must equal the recorded direct child of the
lease's reviewed head, final-evidence assertions are omitted, and invalidated
mutable evidence must already have been removed by exact live-token ownership;
then a wholly new run starts at that reviewed fix. This is the only scripted cleanup
path. It verifies every token-root child against the closed
allowlist, rejects reparse points, requires no worktree owner record or
registration remains, restores primary location and saved process environment,
uses a no-follow traversal so a root replacement/junction/reparse is rejected,
removes exact owned regular-file leaves and then empty directories/root, removes
the lease, then releases the mutex
last. Any mismatch leaves all remaining artifacts and mutex/lease state for
operator inspection and returns `BLOCKED`; never retry cleanup by broad deletion,
`git worktree prune`, `--force`, ownership inference, or PID-liveness logic.
Any cleanup mismatch stops before lease deletion or mutex release, reports the
exact path/record, and leaves all remaining resources intact for human-authorized
inspection.
`PlanEPrimaryLocation` must equal the canonical repository, and the primary
checkout must remain on its original branch rather than detached before and
after every temporary worktree operation. Detached checkout is allowed only
under exact owned worktree paths.

```powershell
$ErrorActionPreference='Stop'
Assert-PlanERunLease -ExpectedPhase 'evidence'
$leaseKeys=@('allowed_relative_paths','audit_temporaries','canonical_repository','lease_token','lease_transition_temporary','mutable_artifacts','mutation_source_paths','mutation_worktrees','phase','pid','process_creation_utc_ticks','reviewed_head','run_start_head','schema_version','step0_artifact_sha256','step0_artifacts','step0_temporaries','temporary_owner_record','temporary_root','worktree_owner_records')
$ownerKeys=@('allowed_relative_paths','canonical_repository','external_temporaries','lease_token','phase','primary_branch','reviewed_head','run_start_head','schema_version','temporary_root')
$releaseLease=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $leaseKeys
$releaseOwner=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
$releaseLeaseBytes=[IO.File]::ReadAllBytes($script:PlanELeasePath)
$releaseOwnerBytes=[IO.File]::ReadAllBytes($script:PlanETempOwnerPath)
if ($releaseLease.step0_artifact_sha256 -isnot [Collections.IDictionary]) { throw 'BLOCKED: release lease Step 0 hash map type mismatch' }
$releaseHashKeys=@($releaseLease.step0_artifact_sha256.Keys)
$expectedReleaseHashKeys=@($script:PlanEStep0ArtifactHashes.Keys)
if (
    $releaseLease.schema_version -isnot [long] -or $releaseLease.schema_version -ne 1 -or $releaseLease.pid -isnot [long] -or $releaseLease.process_creation_utc_ticks -isnot [long] -or -not (Test-PlanEStringFields -Value $releaseLease -Keys @('canonical_repository','lease_token','lease_transition_temporary','phase','reviewed_head','run_start_head','temporary_owner_record','temporary_root')) -or $releaseLease.phase -cne 'evidence' -or $releaseLease.lease_token -cne $script:PlanEToken -or
    $releaseLease.canonical_repository -cne $script:PlanECanonicalRepository -or $releaseLease.run_start_head -cne $script:PlanERunStartHead -or
    $releaseLease.reviewed_head -cne $script:PlanEReviewedHead -or $releaseLease.temporary_root -cne $script:PlanETempRoot -or
    $releaseLease.pid -ne $PID -or $releaseLease.process_creation_utc_ticks -ne (Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks -or
    $releaseLease.temporary_owner_record -cne $script:PlanETempOwnerPath -or $releaseLease.lease_transition_temporary -cne $script:PlanELeaseTransitionPath -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.audit_temporaries -Expected $script:PlanEAuditTemporaries) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.mutable_artifacts -Expected $script:PlanEMutableArtifacts) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.mutation_source_paths -Expected $script:PlanEMutationSourcePaths) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.mutation_worktrees -Expected $script:PlanEMutationWorktrees) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.step0_artifacts -Expected $script:PlanEStep0Artifacts) -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.step0_temporaries -Expected $script:PlanEStep0Temporaries) -or
    $releaseHashKeys.Count -ne $expectedReleaseHashKeys.Count -or @($releaseHashKeys | Where-Object { $_ -isnot [string] -or $expectedReleaseHashKeys -cnotcontains $_ }).Count -ne 0 -or
    @($script:PlanEStep0ArtifactHashes.Keys | Where-Object { $releaseLease.step0_artifact_sha256[$_] -isnot [string] -or $releaseLease.step0_artifact_sha256[$_] -notmatch '^[0-9a-f]{64}$' -or $releaseLease.step0_artifact_sha256[$_] -cne $script:PlanEStep0ArtifactHashes[$_] }).Count -ne 0 -or
    -not (Test-PlanEExactStringArray -Actual $releaseLease.worktree_owner_records -Expected $script:PlanEWorktreeOwnerRecords) -or
    $releaseOwner.schema_version -isnot [long] -or $releaseOwner.schema_version -ne 1 -or -not (Test-PlanEStringFields -Value $releaseOwner -Keys @('canonical_repository','lease_token','phase','primary_branch','reviewed_head','run_start_head','temporary_root')) -or $releaseOwner.phase -cne 'evidence' -or $releaseOwner.lease_token -cne $script:PlanEToken -or
    $releaseOwner.canonical_repository -cne $script:PlanECanonicalRepository -or $releaseOwner.primary_branch -cne $script:PlanEPrimaryBranch -or
    $releaseOwner.run_start_head -cne $script:PlanERunStartHead -or $releaseOwner.reviewed_head -cne $script:PlanEReviewedHead -or
    $releaseOwner.temporary_root -cne $script:PlanETempRoot -or
    -not (Test-PlanEExactStringArray -Actual $releaseOwner.allowed_relative_paths -Expected $script:PlanEAllowedTempRelativePaths) -or
    -not (Test-PlanEExactStringArray -Actual $releaseOwner.external_temporaries -Expected $script:PlanEExternalTemporaries)
) { throw 'BLOCKED: lease/temporary-owner mismatch before cleanup' }
$canonicalTempParent=[IO.Path]::GetFullPath($script:PlanETempParent).TrimEnd('\')
$canonicalTempRoot=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
if ($canonicalTempRoot -cne (Join-Path $canonicalTempParent $script:PlanEToken) -or -not $canonicalTempRoot.StartsWith($canonicalTempParent + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'BLOCKED: canonical token-root containment mismatch before cleanup' }
foreach ($path in @($canonicalTempParent,$canonicalTempRoot,$script:PlanETempOwnerPath)) {
    $info=Get-Item -LiteralPath $path -Force
    if (($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: cleanup path is a reparse point: $path" }
}
if ((Get-Item -LiteralPath $canonicalTempParent -Force) -isnot [IO.DirectoryInfo] -or (Get-Item -LiteralPath $canonicalTempRoot -Force) -isnot [IO.DirectoryInfo] -or (Get-Item -LiteralPath $script:PlanETempOwnerPath -Force) -isnot [IO.FileInfo]) { throw 'BLOCKED: cleanup root/owner type mismatch' }
$incompleteWriters=@($script:PlanELaunchedWriters | Where-Object { $_.started -ne $true -or $_.terminated -ne $true -or $null -eq $_.exit_code -or $_.exit_code -is [bool] })
if ($incompleteWriters.Count -ne 0) { throw 'BLOCKED: a launched writer has not terminated cleanly' }
$reviewFixRelease=[string]::IsNullOrWhiteSpace([string]$script:PlanEFinalEvidenceHead)
if ($reviewFixRelease -and ([string]::IsNullOrWhiteSpace([string]$script:PlanEAuthorizedReviewFixHead) -or $script:PlanECurrentRunArtifacts.Count -ne 0)) { throw 'BLOCKED: review-fix release lacks a validated owned commit or retains invalidated evidence' }
if ($script:PlanECurrentRunArtifacts.Count -ne 0) { throw 'BLOCKED: mutable ownership records remain at owner release' }
$currentHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: could not resolve primary HEAD at normal release' }
$primaryStatus=@(& git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or $currentHead.Count -ne 1 -or $currentHead[0].Trim() -notmatch '^[0-9a-f]{40}$' -or $primaryStatus.Count -ne 0 -or ($reviewFixRelease -and $currentHead[0].Trim() -cne $script:PlanEAuthorizedReviewFixHead) -or (-not $reviewFixRelease -and $currentHead[0].Trim() -cne $script:PlanEFinalEvidenceHead)) {
    throw 'BLOCKED: primary checkout is not clean at final evidence head'
}
if ((Get-Location).Path -cne $script:PlanECanonicalRepository) { throw 'BLOCKED: primary location is not canonical at release' }
$ownerDirectory=Join-Path $script:PlanETempRoot 'worktree-owners'
$ownerDirectoryInfo=Get-Item -LiteralPath $ownerDirectory -Force
if ($ownerDirectoryInfo -isnot [IO.DirectoryInfo] -or ($ownerDirectoryInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: worktree owner directory is unsafe at normal release' }
$remainingOwners=@(Get-ChildItem -LiteralPath $ownerDirectory -Force)
$unexpectedOwners=@($remainingOwners | Where-Object { $script:PlanEWorktreeOwnerRecords -cnotcontains [IO.Path]::GetFullPath($_.FullName) })
$registeredLines=@(& git worktree list --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: Could not inspect worktree registrations at normal release' }
$registered=@($registeredLines | Where-Object { $_ -like 'worktree *' } | ForEach-Object { [IO.Path]::GetFullPath($_.Substring(9)) })
$ownedWorktreeRoot=Join-Path $script:PlanETempRoot 'worktrees'
$ownedRegistrations=@($registered | Where-Object { $_ -ceq [IO.Path]::GetFullPath($ownedWorktreeRoot) -or $_.StartsWith([IO.Path]::GetFullPath($ownedWorktreeRoot) + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) })
$remainingWorktreePaths=@($script:PlanEMutationWorktrees | Where-Object { Test-Path -LiteralPath $_ })
if ($unexpectedOwners.Count -ne 0 -or $remainingOwners.Count -ne 0 -or $ownedRegistrations.Count -ne 0 -or $remainingWorktreePaths.Count -ne 0) {
    throw 'BLOCKED: owner record or worktree registration remains at normal release'
}
$entryList=[Collections.Generic.List[IO.FileSystemInfo]]::new()
$pending=[Collections.Generic.Stack[string]]::new()
$pending.Push($canonicalTempRoot)
while ($pending.Count -gt 0) {
    $directoryPath=$pending.Pop()
    $directoryInfo=Get-Item -LiteralPath $directoryPath -Force
    if ($directoryInfo -isnot [IO.DirectoryInfo] -or ($directoryInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: unsafe directory encountered during no-follow traversal: $directoryPath" }
    foreach ($child in @(Get-ChildItem -LiteralPath $directoryPath -Force)) {
        $childFull=[IO.Path]::GetFullPath($child.FullName)
        if (-not $childFull.StartsWith($canonicalTempRoot + '\',[StringComparison]::OrdinalIgnoreCase) -or ($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: unsafe token-root child encountered without traversal: $childFull" }
        if ($childFull -cne [IO.Path]::GetFullPath($script:PlanETempOwnerPath)) { $entryList.Add($child) }
        if ($child -is [IO.DirectoryInfo]) { $pending.Push($childFull) }
        elseif ($child -isnot [IO.FileInfo]) { throw "BLOCKED: unsupported token-root entry type: $childFull" }
    }
}
$entries=@($entryList)
foreach ($entry in $entries) {
    $entryFull=[IO.Path]::GetFullPath($entry.FullName)
    if (-not $entryFull.StartsWith($canonicalTempRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw "BLOCKED: token-root entry escaped canonical containment: $entryFull" }
    if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: reparse point in token root: $($entry.FullName)" }
    $relative=[IO.Path]::GetRelativePath($script:PlanETempRoot,$entry.FullName).Replace('\','/')
    $allowed=$script:PlanEAllowedTempRelativePaths -ccontains $relative
    $allowedOwnedSubtree=@($script:PlanEAllowedTempRelativePaths | Where-Object {
        if ($_ -notlike '*/<owned-subtree>') { return $false }
        $root=$_.Substring(0,$_.Length - '/<owned-subtree>'.Length)
        return $relative -ceq $root -or $relative.StartsWith($root + '/', [StringComparison]::Ordinal)
    }).Count -gt 0
    $allowedAncestor=@($script:PlanEAllowedTempRelativePaths | Where-Object { $_.StartsWith($relative + '/', [StringComparison]::Ordinal) }).Count -gt 0
    if (-not $allowed -and -not $allowedOwnedSubtree -and -not $allowedAncestor) { throw "BLOCKED: unlisted token-root child: $relative" }
}
function Remove-PlanEValidatedCleanupPath {
    param([Parameter(Mandatory=$true)][string]$Path,[switch]$Recurse)
    Assert-PlanEMutexOwner
    $cleanupLease=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $leaseKeys
    if ($cleanupLease.lease_token -cne $script:PlanEToken -or $cleanupLease.phase -cne 'evidence' -or [Convert]::ToHexString([IO.File]::ReadAllBytes($script:PlanELeasePath)) -cne [Convert]::ToHexString($releaseLeaseBytes)) { throw 'BLOCKED: cleanup lease changed before deletion' }
    $full=[IO.Path]::GetFullPath($Path)
    $root=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
    $registeredInfrastructure=$full -ceq [IO.Path]::GetFullPath($script:PlanETempOwnerPath) -or $full -ceq $root -or $full -ceq [IO.Path]::GetFullPath($script:PlanETempParent) -or $full -ceq [IO.Path]::GetFullPath($script:PlanELeasePath)
    $validatedEntry=@($entries | Where-Object { [IO.Path]::GetFullPath($_.FullName) -ceq $full }).Count -eq 1
    if (-not $registeredInfrastructure -and -not $validatedEntry) { throw "BLOCKED: cleanup deletion path is not validated/registered: $Path" }
    Remove-Item -LiteralPath $full -Force -Recurse:$Recurse
}
Set-Location -LiteralPath $script:PlanEPrimaryLocation
$releaseLeaseAgain=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $leaseKeys
$releaseOwnerAgain=Read-PlanEStrictCanonicalRecord -Path $script:PlanETempOwnerPath -ExpectedKeys $ownerKeys
$rootAgain=[IO.Path]::GetFullPath($script:PlanETempRoot).TrimEnd('\')
$rootInfoAgain=Get-Item -LiteralPath $rootAgain -Force
$parentInfoAgain=Get-Item -LiteralPath $canonicalTempParent -Force
if ([Convert]::ToHexString([IO.File]::ReadAllBytes($script:PlanELeasePath)) -cne [Convert]::ToHexString($releaseLeaseBytes) -or [Convert]::ToHexString([IO.File]::ReadAllBytes($script:PlanETempOwnerPath)) -cne [Convert]::ToHexString($releaseOwnerBytes) -or $rootAgain -cne $canonicalTempRoot -or $rootInfoAgain -isnot [IO.DirectoryInfo] -or $parentInfoAgain -isnot [IO.DirectoryInfo] -or ($rootInfoAgain.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or ($parentInfoAgain.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $releaseLeaseAgain.lease_token -cne $script:PlanEToken -or $releaseOwnerAgain.lease_token -cne $script:PlanEToken -or $releaseLeaseAgain.temporary_root -cne $canonicalTempRoot -or $releaseOwnerAgain.temporary_root -cne $canonicalTempRoot) { throw 'BLOCKED: lease/owner/root changed immediately before exact deletion' }
foreach ($leaf in @($entries | Where-Object { $_ -is [IO.FileInfo] } | Sort-Object { $_.FullName.Length } -Descending)) {
    $leafNow=Get-Item -LiteralPath $leaf.FullName -Force
    if ($leafNow -isnot [IO.FileInfo] -or ($leafNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: owned leaf changed before deletion: $($leaf.FullName)" }
    Remove-PlanEValidatedCleanupPath -Path $leaf.FullName
}
foreach ($directory in @($entries | Where-Object { $_ -is [IO.DirectoryInfo] } | Sort-Object { $_.FullName.Length } -Descending)) {
    $directoryNow=Get-Item -LiteralPath $directory.FullName -Force
    if ($directoryNow -isnot [IO.DirectoryInfo] -or ($directoryNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "BLOCKED: owned directory changed before deletion: $($directory.FullName)" }
    if (@(Get-ChildItem -LiteralPath $directory.FullName -Force).Count -ne 0) { throw "BLOCKED: owned directory is not empty after leaf cleanup: $($directory.FullName)" }
    Remove-PlanEValidatedCleanupPath -Path $directory.FullName
}
if (@($entries | Where-Object { Test-Path -LiteralPath $_.FullName }).Count -ne 0) { throw 'BLOCKED: validated token-root entry remains after exact deletion' }
foreach ($auditTemporary in $script:PlanEAuditTemporaries) {
    if (Test-Path -LiteralPath $auditTemporary) { throw "BLOCKED: same-directory audit temporary remains: $auditTemporary" }
}
$remainingExternalTemporaries=@($script:PlanEExternalTemporaries | Where-Object { Test-Path -LiteralPath $_ })
if ($remainingExternalTemporaries.Count -ne 0) { throw "BLOCKED: external atomic-promotion temporary remains at normal release: $($remainingExternalTemporaries -join ', ')" }
$ownerNow=Get-Item -LiteralPath $script:PlanETempOwnerPath -Force
if ($ownerNow -isnot [IO.FileInfo] -or ($ownerNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or [Convert]::ToHexString([IO.File]::ReadAllBytes($script:PlanETempOwnerPath)) -cne [Convert]::ToHexString($releaseOwnerBytes)) { throw 'BLOCKED: temporary owner changed before deletion' }
Remove-PlanEValidatedCleanupPath -Path $script:PlanETempOwnerPath
if (@(Get-ChildItem -LiteralPath $canonicalTempRoot -Force).Count -ne 0) { throw 'BLOCKED: token root is not empty after exact cleanup' }
$rootNow=Get-Item -LiteralPath $canonicalTempRoot -Force
if ($rootNow -isnot [IO.DirectoryInfo] -or ($rootNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: token root changed before deletion' }
Remove-PlanEValidatedCleanupPath -Path $canonicalTempRoot
if (Test-Path -LiteralPath $script:PlanETempRoot) { throw 'BLOCKED: token root remains after owner cleanup' }
$tempParentNow=Get-Item -LiteralPath $script:PlanETempParent -Force
if ($tempParentNow -isnot [IO.DirectoryInfo] -or ($tempParentNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'BLOCKED: temporary parent changed before deletion' }
$tempParentEntries=@(Get-ChildItem -LiteralPath $script:PlanETempParent -Force)
if ($tempParentEntries.Count -ne 0) { throw "BLOCKED: temporary parent contains unowned entries: $($tempParentEntries.FullName -join ', ')" }
Remove-PlanEValidatedCleanupPath -Path $script:PlanETempParent
$finalReleaseLocation=(Get-Location).Path
$finalReleaseHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: could not resolve primary HEAD after owner cleanup' }
$finalReleaseBranch=@(& git symbolic-ref --short HEAD)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: could not resolve primary branch after owner cleanup' }
$finalReleaseStatus=@(& git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or $finalReleaseLocation -cne $script:PlanECanonicalRepository -or $finalReleaseHead.Count -ne 1 -or $finalReleaseHead[0].Trim() -cne $currentHead[0].Trim() -or $finalReleaseBranch.Count -ne 1 -or $finalReleaseBranch[0] -cne $script:PlanEPrimaryBranch -or $finalReleaseStatus.Count -ne 0) { throw 'BLOCKED: primary checkout changed during owner cleanup' }
$lease=Read-PlanEStrictCanonicalRecord -Path $script:PlanELeasePath -ExpectedKeys $leaseKeys
$reviewFixParentAtRelease=@()
if ($reviewFixRelease) {
    $reviewFixParentAtRelease=@(& git rev-parse "$($script:PlanEAuthorizedReviewFixHead)^")
    if ($LASTEXITCODE -ne 0 -or $reviewFixParentAtRelease.Count -ne 1) { throw 'BLOCKED: could not resolve authorized review-fix parent at release' }
}
if ($lease.lease_token -cne $script:PlanEToken -or $lease.reviewed_head -cne $script:PlanEReviewedHead -or $lease.temporary_root -cne $script:PlanETempRoot -or ($reviewFixRelease -and $reviewFixParentAtRelease[0].Trim() -cne $lease.reviewed_head)) { throw 'BLOCKED: lease mismatch at normal release' }
$leaseNow=Get-Item -LiteralPath $script:PlanELeasePath -Force
if ($leaseNow -isnot [IO.FileInfo] -or ($leaseNow.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or [Convert]::ToHexString([IO.File]::ReadAllBytes($script:PlanELeasePath)) -cne [Convert]::ToHexString($releaseLeaseBytes)) { throw 'BLOCKED: lease changed before deletion' }
Remove-PlanEValidatedCleanupPath -Path $script:PlanELeasePath
if (Test-Path -LiteralPath $script:PlanELeasePath) { throw 'BLOCKED: lease remains after normal release' }
$script:PlanEMutex.ReleaseMutex()
$script:PlanEMutexOwned=$false
$script:PlanEMutex.Dispose()
```

---

## Plan Self-Review Checklist

- [ ] Sections 6.1-6.3 map to Tasks 1-3, including strict schema/no ID, safe unknown own data, depth/cycle/no coercion, discriminated reads, authoritative empty, changed/304 team-cache parsing, external import validation, and one-set Reset with explicit supersession.
- [ ] `BookmarkLoadResult` is exactly `loaded|invalid|failed`; every caller narrows `loaded` before `items/source`; team-collapse removal failures retain Reset local cleanup and never replace bookmarks.
- [ ] Sections 7.1-7.2 map to Tasks 4-5, including mandatory top-level `requestId`/`_persist`, stripping `_persist` plus caller warnings, strict `{markdown:string,saved_to?:string}`, prewritten FAB RED cases, fixed malformed errors, no serialization, fixed warning order, three cleanup attempts, and non-masking Host outcomes.
- [ ] The approved Plan E correction maps to Task 1's sole generic `ownDataProperty`, Task 5's fresh frozen non-Analyze snapshot, parser-payload/final-wire inert `toJSON` shadows, safe request-ID augmentation, register-before-post, and one unregister on post failure.
- [ ] The authorized Windows promotion correction maps to Task 9 Step 0's frozen constructor, three private seams, three-attempt `5/32/33` retry, `0.05/0.2` sleeper arguments, complete initial/pre-sleep/post-sleep revalidation, hook order, one test-only RED commit followed directly by one production-only commit, expanded Host gates, and 61-path reviews.
- [ ] Task 4's first and ownership REDs use namespace/runtime-key access for new exports in existing `analysisStore.ts`; every intended title collects and fails an assertion, never module linking or missing-export collection.
- [ ] Task 5 freezes one-snapshot exact payload/action parse, one atomic transport acquisition, start, and leased-send behavior; invalid/denied requests perform no persistence/send, disconnect cannot reacquire/reconnect under prior authorization, and non-Analyze messages never return or send their source object.
- [ ] Sections 8.1-8.2 map to Task 4, including one pending+owner start write, latest-started singleton, request-only cleanup, strict persisted schemas, legacy records, duration zero, and Reset owner removal.
- [ ] Sections 9.1-9.2 map to Tasks 6-7, including descriptor-safe identity/plain scrape snapshots, case-first/title fallback, busy identity-only scans, post-run full scan, no old-case visible UI, pure context-menu boundary, immutable per-request Root, explicit empty, and old Host fallback.
- [ ] Busy A-to-B identity records origin request/identity and a change flag; post-run scan forcibly replaces user-edited A with B and clears edit/auto-analysis flags.
- [ ] Sections 10.1-10.2 map to Task 8's Plan E-owned helper, baseline runtime/tab/DOM delivery, raw-data non-observability, exact config matrix, and retryable revisions.
- [ ] Task 8 records helper and baseline Options/content-bridge/FAB RED/GREEN; downstream-plan sentinels remain absent and only the handoff contract is documented.
- [ ] Missing-module RED is used once only for `ownData.ts`, `bookmarkItems.ts`, `analyzeRequestHandler.ts`, `pageIdentity.ts`, `analyzeRequest.ts`, and `nativeUpdateError.ts`; `nativeMessageWire.ts`, ResultPopover/content bridge, and every subsequent RED import successfully and fail named assertions.
- [ ] Sections 11 and 13 Plan E map to every task's RED/GREEN/mutation/commit gates, Task 9's Plan-E-only review from immutable `0dbb4852931b50153fb898b03129ae0092c46404` to a resolved literal review head, and the separate interim original whole-branch review from `0040b1de1bc196b203014a8e4f94a53babb7e9aa` to that same literal head.
- [ ] Accepted amendment sections 1-15 map to locked absent Task 6/7 report identities, closed canonical current-state audits, exact lineage/blobs/checks/mutations, mutex/lease/worktree ownership, two declared-session review records, 58-artifact manifest, exact 60-path evidence child, 61-path reviewed range, 121-path final union, clean-clone validation, and owner-only release.
- [ ] Plan-E-only and original-base findings are recorded in separate files and report sections, ignored only before final force-add and committed afterward; Plan E never claims the original whole-branch review is final, and Plan D must rerun it through `<final-D-head>`.
- [ ] Both findings files are prospective before commit, declare different opaque Review Session IDs, bind both audit hashes, carry five exact PASS/FAIL criteria and the proof-boundary sentence, and are force-added with the final evidence.
- [ ] Every temp/environment command restores process state with `try/finally`; Task 1-8 remain fresh-shell-safe, while Task 9 deliberately retains only the mutex/lease owner state and rereads durable evidence for all other facts.
- [ ] Plan D handoff marks the current D document stale and tells the later coordinator extraction to route Analyze through `handleAnalyzeRequest(inner,{acquireAuthorizedTransport})`, never bypass parser/acquisition or reuse authorization across port identities, use only `guarded.forwarded` for non-Analyze acquisition, preserve `postNativeMessageWire` semantics on the leased port, and replace current direct-port/UI-owned update behavior while preserving Plan E contracts.
- [ ] Every created/modified/deleted file is listed, every cross-task symbol has one exact signature, every Task 1-8 commit and the Task 9 promotion commit compare the full staged set to their exact allowlists, and no implementation step leaves an unresolved authoring marker.
