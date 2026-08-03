# Plan E Extension Data and Request Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bookmark, Analyze, SPA identity, per-request Root, update-error, and config-acknowledgment boundaries strict and non-destructive without changing the approved Prompt Scope Cleanup product contract.

**Architecture:** Small shared parsers turn untrusted Chrome storage, packaged JSON, Native Messaging, DOM identity, and update events into explicit typed values before consumers act. One shared own-data primitive underlies the single-property trust boundaries; a frozen shallow non-Analyze snapshot and a pure final-wire sender close mutation, request-ID augmentation, and Native serialization gaps without recursively migrating legacy payloads. A pure Plan E-owned Analyze request handler constructs one exact three-property inner action, atomically acquires an authorized transport lease for that action, then delegates the lease-bound send plus frozen persistence context to the bridge that owns start/completion. The baseline Service Worker supplies an allow-all lease around its current sender; later Plan D must supply a port-specific gated lease without reconnecting under an old authorization. FAB separates live page identity from editable context and forces post-run replacement after a busy identity switch. Plan E exclusively creates and freezes `nativeUpdateError.ts`; later Plan D consumes these contracts while extracting ports and update coordination.

**Tech Stack:** React 19, TypeScript 5.9 strict mode, Chrome Manifest V3 APIs, Vitest 3 with Testing Library/jsdom, Python 3.13 `unittest`, Copilot SDK 1.0.5

## Global Constraints

- Work only in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`. Execution order is frozen: `A -> B -> C -> E -> D`.
- Plan E precondition: reviewed committed Plans A-C are HEAD ancestors; Plan D has not started and none of `extension/src/background/nativePortClient.ts`, `hostGate.ts`, `updateProtocol.ts`, `updateCoordinator.ts`, or `serviceWorker.update.test.ts` exists. Stop on any mismatch; no alternate order is supported.
- Implement only authoritative spec sections 6-10, 11, and 13 Plan E plus the approved corrections `docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md` and `docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`. The corrections govern every conflict in this plan. Do not activate/recreate Plan D behavior; Plan D later consumes the frozen Plan E interfaces.
- Use TDD for every production change. Capture each named RED failure before implementation, then the matching GREEN output and restored mutation proof in the final evidence report.
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
- Authorized Task 9 product/test exception: `docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md` permits only `host/update_engine.py` and `host/test_update_engine_resume.py` to change, with the exact bounded Windows promotion retry contract. Task 9 also creates only the ignored evidence artifacts and forced evidence report listed below. No other Plan A-C or Plan D behavior may change.
- Tasks 1-8 each end in one independently reviewable commit. Task 9 deliberately uses the already-required plan commit, one test-only RED commit, its direct one-path production child, and one final evidence-only commit; this is the sole multi-commit task exception. Immediately before every Task 1-8 commit and each Task 9 commit, compare the complete staged path set against that step's literal allowlist and stop on any missing or extra path. Do not stage unrelated worktree changes.
- Every standalone TypeScript command runs with tool working directory `extension/` as `npm exec tsc -- --noEmit -p tsconfig.json`. This authored command was verified to exit 0; do not use root-level `npm --prefix extension exec ... -p tsconfig.json`, which resolves the project path incorrectly.
- Every filtered Vitest command uses `--reporter=verbose`, titles declared verbatim in the preceding test-writing step, and explicit expected exit handling. “No tests found,” zero matched tests, or unrelated import/configuration failure is never evidence.
- Missing-module import failure is acceptable exactly once as the isolated first RED for each of these six new production modules: `extension/src/utils/ownData.ts`, `extension/src/utils/bookmarkItems.ts`, `extension/src/background/analyzeRequestHandler.ts`, `extension/src/utils/pageIdentity.ts`, `extension/src/utils/analyzeRequest.ts`, and `extension/src/utils/nativeUpdateError.ts`. No other missing module/export is valid RED. After each first import RED, create the task's specified compile-only shell or implementation before any behavioral/multi-file RED; every subsequent RED must import successfully, execute the named test, and fail its assertion. `extension/src/background/nativeMessageWire.ts`, `extension/src/components/ResultPopover.tsx`, and `extension/src/content/updateErrorBridge.ts` are deliberately created as compile-only shells before their first test runs, so their imports may never be used as RED evidence.
- A new export added to an existing module is never valid module-link RED evidence. Before its first run, either add a compile-only production export shell or import the existing module as a namespace, access the candidate through a runtime string key, and fail a named existence/behavior assertion after collection. Task 4 uses and retains namespace access through all parser/ownership RED phases.
- Treat every shell fence/tool call as a fresh PowerShell process. A block may use only variables it initializes itself or values reread from a known file. Any block that changes process environment variables or creates temporary roots saves prior values and restores/deletes them in that same block's `finally`; never publish a separate cleanup command that depends on prior shell state.
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
    '249b1a3750b50db1336fb39661db9306355a1a18'
)
foreach ($commit in $expectedPlanningCommits) {
    & git merge-base --is-ancestor $commit HEAD
    if ($LASTEXITCODE -ne 0) { throw "Approved Plan E planning commit is not a HEAD ancestor: $commit" }
}
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

The controller confirms the human review/signoff for the three printed evidence commits; automation proves those commits and representative A-C implementation files are committed ancestors of current HEAD and unchanged after the declared base. Expected: all checks pass, every Plan D sentinel is absent, no Plan E product/test path differs from the declared base, and `.superpowers/sdd/plan-e-base.txt` contains exactly `0dbb4852931b50153fb898b03129ae0092c46404` plus LF and is ignored by Git. An existing correct file remains byte-for-byte unchanged; an absent file is restored only to that declared value.

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
- `.superpowers/sdd/plan-e-extension-hardening-report.md`: committed RED/GREEN/mutation/final-gate evidence. Add this ignored-path exception with `git add -f` only in Task 9.
- `.superpowers/sdd/plan-e-base.txt`: ignored immutable declared SHA `0dbb4852931b50153fb898b03129ae0092c46404`; validated/restored before Task 1 and never staged or committed.
- `.superpowers/sdd/plan-e-only-review-package.txt`: ignored Plan-E range/stat/log/path review package generated from `plan-e-base.txt` to the final committed reviewed product head (Task 8 or a later focused review-fix commit).
- `.superpowers/sdd/plan-e-only-review.diff`: ignored full-index/binary Plan-E-only review diff.
- `.superpowers/sdd/plan-e-only-review-findings.md`: ignored controller findings for only the Plan-E integration range.
- `.superpowers/sdd/original-whole-branch-interim-review-package.txt`: ignored original-base range/stat/log/path package through the committed Plan E head.
- `.superpowers/sdd/original-whole-branch-interim-review.diff`: ignored full-index/binary original-base-to-Plan-E-head diff.
- `.superpowers/sdd/original-whole-branch-interim-review-findings.md`: ignored separate interim whole-branch findings; never represented as the final post-Plan-D branch review.
- `.superpowers/sdd/invoke-promotion-test.ps1`: ignored exact per-selector RED/GREEN/mutation executor extracted from the committed plan.
- `.superpowers/sdd/run-promotion-mutations.ps1`: ignored exact five-row promotion mutation runner extracted from the committed plan.
- `.superpowers/sdd/promotion-executor.sha256`, `.superpowers/sdd/promotion-mutation-runner.sha256`: ignored script integrity records.
- `.superpowers/sdd/promotion-red-source.sha256`, `.superpowers/sdd/promotion-green-source.sha256`, `.superpowers/sdd/promotion-mutation-source.sha256`: ignored phase source-blob chronology records.
- `.superpowers/sdd/promotion-red.sha256.json`, `.superpowers/sdd/promotion-green.sha256.json`, `.superpowers/sdd/promotion-mutation.sha256.json`, `.superpowers/sdd/promotion-transcripts.sha256.json`: ignored canonical transcript maps.
- `.superpowers/sdd/promotion-transcripts/red/<eight exact method names>.txt`, `.superpowers/sdd/promotion-transcripts/green/<eight exact method names>.txt`, and `.superpowers/sdd/promotion-transcripts/mutation-<classification|bound|initial|pre-sleep|post-sleep>/<mapped method>.{txt,restored-green.txt}`: the exact 26 ignored transcript leaves generated and enumerated in Task 9 Step 0.
- `.superpowers/sdd/promotion-observed.json`, `.superpowers/sdd/promotion-ledger.json`, `.superpowers/sdd/promotion-ast.sha256`: ignored canonical observed values, aggregation, and AST/source integrity evidence.
- `.superpowers/sdd/focused-extension-results.json`, `.superpowers/sdd/full-extension-results.json`, `.superpowers/sdd/host-test-results.json`: ignored canonical, reviewed-head-bound machine test evidence generated in Task 9.
- `.superpowers/sdd/reviewed-head-verification.json`: ignored canonical verification result binding the tracked tested-source inventory, TypeScript, build, static, diff, focused/full Extension, and every Host phase to one reviewed product head.
- `.superpowers/sdd/final-artifacts.sha256.json`: ignored canonical manifest over the exact 58 final evidence artifacts.
- `.superpowers/sdd/task-1-report.md` through `.superpowers/sdd/task-8-report.md`: ignored hash-pinned completed-task reports; their historical RED evidence predates the Task 9 plan amendment and is validated rather than rewritten.

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
- Create ignored review artifacts: `.superpowers/sdd/plan-e-only-review-package.txt`, `.superpowers/sdd/plan-e-only-review.diff`, `.superpowers/sdd/plan-e-only-review-findings.md`, `.superpowers/sdd/original-whole-branch-interim-review-package.txt`, `.superpowers/sdd/original-whole-branch-interim-review.diff`, `.superpowers/sdd/original-whole-branch-interim-review-findings.md`
- Create ignored promotion executors/integrity records: `.superpowers/sdd/invoke-promotion-test.ps1`, `.superpowers/sdd/run-promotion-mutations.ps1`, `.superpowers/sdd/promotion-executor.sha256`, `.superpowers/sdd/promotion-mutation-runner.sha256`, `.superpowers/sdd/promotion-ast.sha256`
- Create ignored promotion phase/source records: `.superpowers/sdd/promotion-red-source.sha256`, `.superpowers/sdd/promotion-green-source.sha256`, `.superpowers/sdd/promotion-mutation-source.sha256`, `.superpowers/sdd/promotion-red.sha256.json`, `.superpowers/sdd/promotion-green.sha256.json`, `.superpowers/sdd/promotion-mutation.sha256.json`, `.superpowers/sdd/promotion-transcripts.sha256.json`, `.superpowers/sdd/promotion-observed.json`, `.superpowers/sdd/promotion-ledger.json`
- Create exactly 26 ignored transcript leaves under `.superpowers/sdd/promotion-transcripts/`: eight `red/<method>.txt`, eight `green/<method>.txt`, and two leaves for each of `mutation-classification`, `mutation-bound`, `mutation-initial`, `mutation-pre-sleep`, and `mutation-post-sleep`, with exact names defined in Step 0
- Create ignored final verification/manifest evidence: `.superpowers/sdd/focused-extension-results.json`, `.superpowers/sdd/full-extension-results.json`, `.superpowers/sdd/host-test-results.json`, `.superpowers/sdd/reviewed-head-verification.json`, `.superpowers/sdd/final-artifacts.sha256.json`
- Consume without modifying: `.superpowers/sdd/task-1-report.md` through `.superpowers/sdd/task-8-report.md`

**Interfaces:**
- Consumes: committed Tasks 1-8, their RED/GREEN/mutation output, authoritative specs, the authorized Windows promotion retry correction, and the immutable declared Plan E base validated before execution.
- Produces: reproducible final gate evidence, one Plan-E-only review package/findings record, and one required original-base interim whole-branch package/findings record. Task 9 changes no release or other documentation; blocking review fixes may add focused product/test commits before the evidence-only commit. The interim whole-branch review is not final branch-review completion because Plan D is absent.

Tasks 1-8 and their hash-pinned reports were completed before this Task 9 plan
amendment. Their accepted reports remain the historical authority for named RED
assertions; this amendment does not fabricate or rerun past RED chronology.

Before any Task 9 step, run this historical-report preflight. All eight reports
are requirements even if a restored machine currently has fewer. Each report
must already exist and match its locked SHA-256. If a report is missing after a
machine restore, recover its exact bytes only from accepted historical evidence
and rerun this block. If exact accepted bytes cannot be recovered, stop with
Task 9 `BLOCKED`; never synthesize, summarize, regenerate, or fabricate a report.
The final artifact gate remains fail-closed over all eight reports and must not
reduce the locked hashes or artifact count to fit the files present on one
machine.

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
foreach ($number in 1..8) {
    $path=".superpowers/sdd/task-$number-report.md"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "BLOCKED: recover exact accepted historical report before Task 9: $path"
    }
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -cne $expectedTaskReportHashes[[string]$number]) {
        throw "BLOCKED: historical Task $number report does not match its locked SHA-256"
    }
}
```

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

- [ ] **Step 0: Implement the authorized Windows promotion retry with TDD**

The human authorization and accepted design are committed in
`docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`.
This revised implementation plan must also be committed and clean before either
authorized Host path is edited. Resolve and record both full planning SHAs, then
require them as HEAD ancestors. Before RED, require
`git diff --quiet HEAD -- host/update_engine.py host/test_update_engine_resume.py`
and require the base-to-HEAD Host diff to be absent; after implementation these
two paths are the only newly authorized Host delta.

Run this fail-closed precondition before writing tests:

```powershell
$ErrorActionPreference='Stop'
$base='0dbb4852931b50153fb898b03129ae0092c46404'
$acceptedSpecCommit='249b1a3750b50db1336fb39661db9306355a1a18'
$plan='docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'
$spec='docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md'
foreach ($path in @($plan,$spec)) {
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
if (
    $LASTEXITCODE -ne 0 -or
    $head.Count -ne 1 -or
    $planHead.Count -ne 1 -or
    $specHead.Count -ne 1 -or
    $head[0].Trim() -cne $planHead[0].Trim()
) { throw 'The revised Plan E plan is not the current committed HEAD' }
$planPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $planHead[0].Trim())
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion plan commit paths' }
$planSubject=@(& git show -s --format=%s $planHead[0].Trim())
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect promotion plan commit subject' }
if (
    $planPaths.Count -ne 1 -or $planPaths[0] -cne $plan -or
    $planSubject.Count -ne 1 -or $planSubject[0] -cne 'docs(update): harden Windows promotion execution plan'
) { throw 'Promotion plan commit path or subject is invalid' }
foreach ($commit in @($planHead[0].Trim(),$specHead[0].Trim())) {
    if ($commit -notmatch '^[0-9a-f]{40}$') { throw 'Invalid promotion planning SHA' }
    & git merge-base --is-ancestor $commit HEAD
    if ($LASTEXITCODE -ne 0) { throw "Promotion planning SHA is not a HEAD ancestor: $commit" }
    "Promotion planning commit: $commit"
}
if ($specHead[0].Trim() -cne $acceptedSpecCommit) {
    throw 'Windows promotion retry spec is not the accepted commit'
}
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
$root=Join-Path ([IO.Path]::GetTempPath()) ('dh-promotion-red-' + [guid]::NewGuid().ToString('N'))
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH','DH_PROMOTION_EVIDENCE')
$saved=@{}
foreach ($name in $envNames) { $saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
$exit=99
try {
    New-Item -ItemType Directory -Path $root | Out-Null
    foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
        $value=Join-Path $root $name.ToLowerInvariant()
        New-Item -ItemType Directory -Path $value | Out-Null
        [Environment]::SetEnvironmentVariable($name,$value,'Process')
    }
    [Environment]::SetEnvironmentVariable('PYTHONPATH',(Resolve-Path -LiteralPath 'host').Path,'Process')
    Remove-Item -LiteralPath 'Env:DH_PROMOTION_EVIDENCE' -ErrorAction SilentlyContinue
    & 'host\venv\Scripts\python.exe' -m unittest host.test_update_engine_resume.PreparingPromotionRetryTests -v
    $exit=$LASTEXITCODE
} finally {
    foreach ($name in $envNames) {
        if ($null -eq $saved[$name]) { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
    }
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
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
function Invoke-PromotionTest {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][int]$ExpectedExit,
        [Parameter(Mandatory=$true)][string]$ExpectedStatus,
        [string]$EvidencePath
    )
    $root=Join-Path ([IO.Path]::GetTempPath()) ('dh-promotion-one-' + [guid]::NewGuid().ToString('N'))
    $envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH','DH_PROMOTION_EVIDENCE')
    $saved=@{}
    foreach ($name in $envNames) { $saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
    $lines=@()
    $exit=99
    try {
        New-Item -ItemType Directory -Path $root | Out-Null
        foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
            $value=Join-Path $root $name.ToLowerInvariant()
            New-Item -ItemType Directory -Path $value | Out-Null
            [Environment]::SetEnvironmentVariable($name,$value,'Process')
        }
        [Environment]::SetEnvironmentVariable('PYTHONPATH',(Resolve-Path -LiteralPath 'host').Path,'Process')
        if ($EvidencePath) {
            [Environment]::SetEnvironmentVariable('DH_PROMOTION_EVIDENCE',$EvidencePath,'Process')
        } else {
            Remove-Item -LiteralPath 'Env:DH_PROMOTION_EVIDENCE' -ErrorAction SilentlyContinue
        }
        $selector="host.test_update_engine_resume.PreparingPromotionRetryTests.$Method"
        $lines=@(& 'host\venv\Scripts\python.exe' -m unittest $selector -v 2>&1)
        $exit=$LASTEXITCODE
    } finally {
        foreach ($name in $envNames) {
            if ($null -eq $saved[$name]) { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
        }
        if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
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

Before invoking any later fresh shell, create the ignored UTF-8-no-BOM script
`.superpowers/sdd/invoke-promotion-test.ps1` with `apply_patch`; its complete
contents are the exact function fence between the two promotion-executor markers
above and nothing else. Read it back,
require exactly one `function Invoke-PromotionTest`, compute SHA-256, and record
the hash. Every later RED/GREEN/mutation block begins with:

```powershell
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

and verifies the script is a leaf, has no BOM, matches the recorded SHA, and is
ignored with `git check-ignore -q`. The script is a
Task 9 evidence artifact, never staged; its SHA-256 is recorded in the final
report. This satisfies the fresh-shell rule without relying on prior function
state.

Immediately validate it:

```powershell
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
$executorHashTemp="$executorHashPath.tmp"
foreach ($path in @($executorHashPath,$executorHashTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion executor hash-record path already exists: $path" }
}
try {
    $tempFullPath=Join-Path (Get-Location) $executorHashTemp
    $expectedBytes=[Text.UTF8Encoding]::new($false).GetBytes($executorHash + "`n")
    $stream=$null
    try {
        $stream=[IO.FileStream]::new(
            $tempFullPath,
            [IO.FileMode]::CreateNew,
            [IO.FileAccess]::Write,
            [IO.FileShare]::None
        )
        $stream.Write($expectedBytes,0,$expectedBytes.Length)
        $stream.Flush($true)
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
    }
    $actualBytes=[IO.File]::ReadAllBytes($tempFullPath)
    if ([Convert]::ToHexString($actualBytes) -cne [Convert]::ToHexString($expectedBytes)) { throw 'Promotion executor hash-record temporary validation failed' }
    [IO.File]::Move((Join-Path (Get-Location) $executorHashTemp),(Join-Path (Get-Location) $executorHashPath),$false)
} finally {
    Remove-Item -LiteralPath $executorHashTemp -Force -ErrorAction SilentlyContinue
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
foreach ($path in @($preMapPath,"$preMapPath.tmp",$redSourcePath,"$redSourcePath.tmp")) {
    if (Test-Path -LiteralPath $path) { throw "Promotion RED chronology path already exists: $path" }
}
New-Item -ItemType Directory -Path $redDir | Out-Null
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
    $temporary=Join-Path $redDir "$method.txt.tmp"
    [IO.File]::WriteAllText((Join-Path (Get-Location) $temporary),$text + "`n",[Text.UTF8Encoding]::new($false))
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw "Promotion RED transcript validation failed: $method" }
    [IO.File]::Move((Join-Path (Get-Location) $temporary),(Join-Path (Get-Location) $target))
}
$constructor='test_update_engine_constructor_signature_remains_frozen'
$text=Invoke-PromotionTest -Method $constructor -ExpectedExit 0 -ExpectedStatus 'ok'
$target=Join-Path $redDir "$constructor.txt"
$temporary=Join-Path $redDir "$constructor.txt.tmp"
[IO.File]::WriteAllText((Join-Path (Get-Location) $temporary),$text + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw 'Promotion constructor transcript validation failed' }
[IO.File]::Move((Join-Path (Get-Location) $temporary),(Join-Path (Get-Location) $target))
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
$preMapCanonical=@((ConvertTo-Json $preMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $preMapCanonical.Count -ne 1) { throw 'Could not canonicalize promotion RED map' }
[IO.File]::WriteAllText((Join-Path (Get-Location) "$preMapPath.tmp"),$preMapCanonical[0] + "`n",[Text.UTF8Encoding]::new($false))
$lockedRedMap=[IO.File]::ReadAllText((Join-Path (Get-Location) "$preMapPath.tmp"),[Text.UTF8Encoding]::new($false))
if ($lockedRedMap -cne $preMapCanonical[0] + "`n") { throw 'Promotion RED map bytes are not canonical' }
[IO.File]::Move((Join-Path (Get-Location) "$preMapPath.tmp"),(Join-Path (Get-Location) $preMapPath))
$redSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
[IO.File]::WriteAllText((Join-Path (Get-Location) "$redSourcePath.tmp"),$redSource + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$redSourcePath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $redSource + "`n") { throw 'Promotion RED source record validation failed' }
[IO.File]::Move((Join-Path (Get-Location) "$redSourcePath.tmp"),(Join-Path (Get-Location) $redSourcePath))
& git check-ignore -q -- $preMapPath
if ($LASTEXITCODE -ne 0) { throw 'Promotion RED hash map is not ignored' }
```

Commit the accepted RED tests before touching production. Stage exactly
`host/test_update_engine_resume.py`, require `host/update_engine.py` unchanged
from HEAD, run cached diff check, and commit exact subject
`test(update): cover locked preparing promotion`. Record the full test commit SHA
in the ledger inputs. This commit must contain one path only.

```powershell
$expected=@('host/test_update_engine_resume.py')
& git diff --quiet HEAD -- 'host/update_engine.py'
if ($LASTEXITCODE -ne 0) { throw 'Production changed before RED test commit' }
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage promotion RED tests' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0 -or $actual.Count -ne 1 -or $actual[0] -cne $expected[0]) {
    throw 'Promotion RED test commit path mismatch'
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Promotion RED staged diff check failed' }
& git commit -m "test(update): cover locked preparing promotion"
if ($LASTEXITCODE -ne 0) { throw 'Promotion RED test commit failed' }
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
foreach ($path in @($greenDir,$greenMapPath,"$greenMapPath.tmp",$greenSourcePath,"$greenSourcePath.tmp")) {
    if (Test-Path -LiteralPath $path) { throw "Promotion GREEN chronology path already exists: $path" }
}
New-Item -ItemType Directory -Path $greenDir | Out-Null
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
    $temporary=Join-Path $greenDir "$method.txt.tmp"
    [IO.File]::WriteAllText((Join-Path (Get-Location) $temporary),$text + "`n",[Text.UTF8Encoding]::new($false))
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $temporary),[Text.UTF8Encoding]::new($false)) -cne $text + "`n" -or (Test-Path -LiteralPath $target)) { throw "Promotion GREEN transcript validation failed: $method" }
    [IO.File]::Move((Join-Path (Get-Location) $temporary),(Join-Path (Get-Location) $target))
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
$greenCanonical=@((ConvertTo-Json $greenMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $greenCanonical.Count -ne 1) { throw 'Could not canonicalize promotion GREEN map' }
[IO.File]::WriteAllText((Join-Path (Get-Location) "$greenMapPath.tmp"),$greenCanonical[0] + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$greenMapPath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $greenCanonical[0] + "`n") { throw 'Promotion GREEN map bytes are not canonical' }
[IO.File]::Move((Join-Path (Get-Location) "$greenMapPath.tmp"),(Join-Path (Get-Location) $greenMapPath))
$greenSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
[IO.File]::WriteAllText((Join-Path (Get-Location) "$greenSourcePath.tmp"),$greenSource + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$greenSourcePath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $greenSource + "`n") { throw 'Promotion GREEN source record validation failed' }
[IO.File]::Move((Join-Path (Get-Location) "$greenSourcePath.tmp"),(Join-Path (Get-Location) $greenSourcePath))
```

Then run:

```powershell
$ErrorActionPreference='Stop'
$root=Join-Path ([IO.Path]::GetTempPath()) ('dh-promotion-green-' + [guid]::NewGuid().ToString('N'))
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH','DH_PROMOTION_EVIDENCE')
$saved=@{}
foreach ($name in $envNames) { $saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
try {
    New-Item -ItemType Directory -Path $root | Out-Null
    foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
        $value=Join-Path $root $name.ToLowerInvariant()
        New-Item -ItemType Directory -Path $value | Out-Null
        [Environment]::SetEnvironmentVariable($name,$value,'Process')
    }
    [Environment]::SetEnvironmentVariable('PYTHONPATH',(Resolve-Path -LiteralPath 'host').Path,'Process')
    Remove-Item -LiteralPath 'Env:DH_PROMOTION_EVIDENCE' -ErrorAction SilentlyContinue
    & 'host\venv\Scripts\python.exe' -m unittest host.test_update_engine_resume -v
    if ($LASTEXITCODE -ne 0) { throw 'Update-engine resume suite failed' }
} finally {
    foreach ($name in $envNames) {
        if ($null -eq $saved[$name]) { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
    }
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
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

Create `.superpowers/sdd/run-promotion-mutations.ps1` with `apply_patch` as a
second ignored UTF-8-no-BOM evidence script. It defines a five-row literal table
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
fixed PASS lines; neither script is staged.

Its complete body is:

<!-- PROMOTION_MUTATION_RUNNER_START -->
```powershell
$ErrorActionPreference='Stop'
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
if ((Test-Path -LiteralPath $mutationMapPath) -or (Test-Path -LiteralPath "$mutationMapPath.tmp")) { throw 'Promotion mutation map or temporary already exists' }
foreach ($row in $rows) {
    $directory=Join-Path $outputRoot ("mutation-" + $row.Name)
    if (Test-Path -LiteralPath $directory) { throw "Mutation transcript exists: $($row.Name)" }
    New-Item -ItemType Directory -Path $directory | Out-Null
    try {
        $text=[Text.UTF8Encoding]::new($false,$true).GetString($original)
        if ([regex]::Matches($text,[regex]::Escape($row.Old)).Count -ne 1) {
            throw "Mutation source block mismatch: $($row.Name)"
        }
        $mutated=$text.Replace($row.Old,$row.New)
        [IO.File]::WriteAllText((Join-Path (Get-Location) $path),$mutated,[Text.UTF8Encoding]::new($false))
        $failure=Invoke-PromotionTest -Method $row.Method -ExpectedExit 1 -ExpectedStatus 'FAIL'
        $failureTarget=Join-Path $directory "$($row.Method).txt"
        $failureTemp=Join-Path $directory "$($row.Method).txt.tmp"
        [IO.File]::WriteAllText((Join-Path (Get-Location) $failureTemp),$failure + "`n",[Text.UTF8Encoding]::new($false))
        if ([IO.File]::ReadAllText((Join-Path (Get-Location) $failureTemp),[Text.UTF8Encoding]::new($false)) -cne $failure + "`n" -or (Test-Path -LiteralPath $failureTarget)) { throw "Promotion mutation transcript validation failed: $($row.Name)" }
        [IO.File]::Move((Join-Path (Get-Location) $failureTemp),(Join-Path (Get-Location) $failureTarget))
    } finally {
        [IO.File]::WriteAllBytes((Join-Path (Get-Location) $path),$original)
    }
    $restored=[IO.File]::ReadAllBytes((Join-Path (Get-Location) $path))
    $restoredHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($restored))
    if ([Convert]::ToHexString($restored) -cne [Convert]::ToHexString($original) -or $restoredHash -cne $originalHash) {
        throw "Mutation restoration mismatch: $($row.Name)"
    }
    $restoredGreen=Invoke-PromotionTest -Method $row.Method -ExpectedExit 0 -ExpectedStatus 'ok'
    $greenTarget=Join-Path $directory "$($row.Method).restored-green.txt"
    $greenTemp=Join-Path $directory "$($row.Method).restored-green.txt.tmp"
    [IO.File]::WriteAllText((Join-Path (Get-Location) $greenTemp),$restoredGreen + "`n",[Text.UTF8Encoding]::new($false))
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $greenTemp),[Text.UTF8Encoding]::new($false)) -cne $restoredGreen + "`n" -or (Test-Path -LiteralPath $greenTarget)) { throw "Promotion restored GREEN transcript validation failed: $($row.Name)" }
    [IO.File]::Move((Join-Path (Get-Location) $greenTemp),(Join-Path (Get-Location) $greenTarget))
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
$mutationCanonical=@((ConvertTo-Json $mutationMap -Compress) | & 'host\venv\Scripts\python.exe' -c $mapCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $mutationCanonical.Count -ne 1) { throw 'Could not canonicalize promotion mutation map' }
[IO.File]::WriteAllText((Join-Path (Get-Location) "$mutationMapPath.tmp"),$mutationCanonical[0] + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$mutationMapPath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $mutationCanonical[0] + "`n") { throw 'Promotion mutation map bytes are not canonical' }
[IO.File]::Move((Join-Path (Get-Location) "$mutationMapPath.tmp"),(Join-Path (Get-Location) $mutationMapPath))
```
<!-- PROMOTION_MUTATION_RUNNER_END -->

Invoke and validate the mutation runner in a fresh shell:

```powershell
$ErrorActionPreference='Stop'
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
$runnerHashTemp="$runnerHashPath.tmp"
foreach ($path in @($runnerHashPath,$runnerHashTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Promotion mutation-runner hash-record path already exists: $path" }
}
try {
    $tempFullPath=Join-Path (Get-Location) $runnerHashTemp
    $expectedBytes=[Text.UTF8Encoding]::new($false).GetBytes($runnerHash + "`n")
    $stream=$null
    try {
        $stream=[IO.FileStream]::new(
            $tempFullPath,
            [IO.FileMode]::CreateNew,
            [IO.FileAccess]::Write,
            [IO.FileShare]::None
        )
        $stream.Write($expectedBytes,0,$expectedBytes.Length)
        $stream.Flush($true)
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
    }
    $actualBytes=[IO.File]::ReadAllBytes($tempFullPath)
    if ([Convert]::ToHexString($actualBytes) -cne [Convert]::ToHexString($expectedBytes)) { throw 'Promotion mutation-runner hash-record temporary validation failed' }
    [IO.File]::Move((Join-Path (Get-Location) $runnerHashTemp),(Join-Path (Get-Location) $runnerHashPath),$false)
} finally {
    Remove-Item -LiteralPath $runnerHashTemp -Force -ErrorAction SilentlyContinue
}
$mutationSourcePath='.superpowers/sdd/promotion-mutation-source.sha256'
if ((Test-Path -LiteralPath $mutationSourcePath) -or (Test-Path -LiteralPath "$mutationSourcePath.tmp")) { throw 'Promotion mutation source record or temporary already exists' }
$lines=@(& $runner 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Promotion mutation runner failed`n$($lines -join "`n")" }
foreach ($name in @('classification','bound','initial','pre-sleep','post-sleep')) {
    if (@($lines | Where-Object { $_ -ceq "MUTATION PASS: $name" }).Count -ne 1) {
        throw "Promotion mutation PASS line mismatch: $name"
    }
}
$mutationSource=(@(& git hash-object 'host/update_engine.py')[0].Trim()) + ' ' + (@(& git hash-object 'host/test_update_engine_resume.py')[0].Trim())
[IO.File]::WriteAllText((Join-Path (Get-Location) "$mutationSourcePath.tmp"),$mutationSource + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$mutationSourcePath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $mutationSource + "`n") { throw 'Promotion mutation source record validation failed' }
[IO.File]::Move((Join-Path (Get-Location) "$mutationSourcePath.tmp"),(Join-Path (Get-Location) $mutationSourcePath))
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
if ((Test-Path -LiteralPath $astRecordPath) -or (Test-Path -LiteralPath "$astRecordPath.tmp")) { throw 'Promotion pre-commit AST record or temporary already exists' }
$astRecord="$auditHash $engineHash $testHash`n"
[IO.File]::WriteAllText((Join-Path (Get-Location) "$astRecordPath.tmp"),$astRecord,[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$astRecordPath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $astRecord) { throw 'Promotion AST record validation failed' }
[IO.File]::Move((Join-Path (Get-Location) "$astRecordPath.tmp"),(Join-Path (Get-Location) $astRecordPath))
```

Use exact subject `fix(update): retry locked preparing promotion`. Record this
focused RED/GREEN/mutation/commit and the historical uncontrolled/controlled
WinError observations in the final report. Only after this commit continue to
Step 1.

```powershell
$expected=@('host/update_engine.py')
& git add -- $expected
if ($LASTEXITCODE -ne 0) { throw 'Could not stage promotion retry paths' }
$actual=@(& git diff --cached --name-only --no-renames --)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged promotion paths' }
$missing=@($expected | Where-Object { $actual -cnotcontains $_ })
$extra=@($actual | Where-Object { $expected -cnotcontains $_ })
if ($missing.Count -ne 0 -or $extra.Count -ne 0 -or $actual.Count -ne 1) {
    throw "Promotion staged path mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
}
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Promotion staged diff check failed' }
& git commit -m "fix(update): retry locked preparing promotion"
if ($LASTEXITCODE -ne 0) { throw 'Promotion retry commit failed' }
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
$observedPath='.superpowers/sdd/promotion-observed.json'
$observedTemp='.superpowers/sdd/promotion-observed.tmp'
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
[IO.File]::Move((Join-Path (Get-Location) $observedTemp),(Join-Path (Get-Location) $observedPath))
$planCommit=@(& git log -1 --format=%H HEAD -- 'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md')
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
foreach ($path in @($ledgerPath,"$ledgerPath.tmp",$transcriptMapPath,"$transcriptMapPath.tmp")) {
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
[IO.File]::WriteAllText((Join-Path (Get-Location) "$transcriptMapPath.tmp"),$transcriptMapCanonical[0] + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$transcriptMapPath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $transcriptMapCanonical[0] + "`n") { throw 'Promotion transcript map bytes are not canonical' }
[IO.File]::Move((Join-Path (Get-Location) "$transcriptMapPath.tmp"),(Join-Path (Get-Location) $transcriptMapPath))
$ledger.transcript_map_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $transcriptMapPath).Hash.ToLowerInvariant()
$ledgerDraft=$ledger | ConvertTo-Json -Depth 8 -Compress
$ledgerLines=@($ledgerDraft | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
if ($LASTEXITCODE -ne 0 -or $ledgerLines.Count -ne 1) { throw 'Could not finalize promotion ledger' }
[IO.File]::WriteAllText((Join-Path (Get-Location) "$ledgerPath.tmp"),$ledgerLines[0] + "`n",[Text.UTF8Encoding]::new($false))
if ([IO.File]::ReadAllText((Join-Path (Get-Location) "$ledgerPath.tmp"),[Text.UTF8Encoding]::new($false)) -cne $ledgerLines[0] + "`n") { throw 'Promotion ledger bytes are not canonical' }
[IO.File]::Move((Join-Path (Get-Location) "$ledgerPath.tmp"),(Join-Path (Get-Location) $ledgerPath))
foreach ($path in @($ledgerPath,$observedPath,$transcriptMapPath,'.superpowers/sdd/invoke-promotion-test.ps1','.superpowers/sdd/run-promotion-mutations.ps1')) {
    & git check-ignore -q -- $path
    if ($LASTEXITCODE -ne 0) { throw "Promotion evidence artifact is not ignored: $path" }
}
```

The controller writes one `promotion-transcripts.sha256.json` canonical ordered
JSON map of all 26 transcripts: 8 RED-phase, 8 focused GREEN, 5 mutation
failures, and 5 post-restoration mutation GREEN runs. Step 10 recomputes the map
exactly before accepting evidence.

- [ ] **Step 1: Start from a clean committed product head and inspect scope**

For the mandatory rerun after any controller review fix, first remove only the
known mutable current-run outputs below. Never remove or overwrite promotion
RED/GREEN/mutation transcripts, their phase maps/source records, the pre-commit
AST record, accepted Task 1-8 reports, or any other chronology evidence. A
tracked or staged mutable path is a hard stop rather than a deletion target.

```powershell
$ErrorActionPreference='Stop'
$mutableCurrentRunArtifacts=@(
    '.superpowers/sdd/focused-extension-results.json',
    '.superpowers/sdd/focused-extension-results.raw.tmp',
    '.superpowers/sdd/focused-extension-results.canonical.tmp',
    '.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/full-extension-results.raw.tmp',
    '.superpowers/sdd/full-extension-results.canonical.tmp',
    '.superpowers/sdd/host-test-results.json',
    '.superpowers/sdd/host-test-results.tmp',
    '.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/reviewed-head-verification.tmp',
    '.superpowers/sdd/final-artifacts.sha256.json',
    '.superpowers/sdd/final-artifacts.sha256.tmp',
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review-package.tmp',
    '.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review.diff.tmp',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review-package.tmp',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review.diff.tmp',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md',
    '.superpowers/sdd/plan-e-extension-hardening-report.md'
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
foreach ($path in $mutableCurrentRunArtifacts) {
    $tracked=@(& git ls-files -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect mutable artifact tracking: $path" }
    $staged=@(& git diff --cached --name-only --no-renames -- $path)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect mutable artifact staging: $path" }
    if ($tracked.Count -ne 0 -or $staged.Count -ne 0) {
        throw "Refusing to reset tracked or staged current-run artifact: $path"
    }
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
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
limited to the 60 Plan E range paths.

Run:

```powershell
$ErrorActionPreference='Stop'
$status=@(git status --short)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E status' }
git log --oneline -12
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E commits' }
$declaredBase='0dbb4852931b50153fb898b03129ae0092c46404'
$baseBytes=[IO.File]::ReadAllBytes(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-base.txt')
)
$expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes(
    $declaredBase + "`n"
)
if ([Convert]::ToHexString($baseBytes) -cne [Convert]::ToHexString($expectedBaseBytes)) {
    throw 'Plan E base evidence is not the declared SHA plus LF'
}
$integrationBase=$declaredBase
git cat-file -e "$integrationBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Plan E base is not a commit' }
git merge-base --is-ancestor $integrationBase HEAD
if ($LASTEXITCODE -ne 0) { throw 'Plan E base is not an ancestor of HEAD' }
$expectedRangePaths=@(
    'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md',
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
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
$actualRangePaths=@(& git diff --name-only --no-renames "$integrationBase..HEAD")
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Plan E integration range' }
$missingRange=@($expectedRangePaths | Where-Object { $actualRangePaths -cnotcontains $_ })
$extraRange=@($actualRangePaths | Where-Object { $expectedRangePaths -cnotcontains $_ })
if (
    $missingRange.Count -ne 0 -or
    $extraRange.Count -ne 0 -or
    $actualRangePaths.Count -ne $expectedRangePaths.Count
) {
    throw "Plan E range path mismatch. Missing: $($missingRange -join ', '); Extra: $($extraRange -join ', ')"
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
dirty; the name-only list contains exactly 60 paths: the unique Task 1-8 path
union, both approved correction specs, this repaired plan, and the two authorized
Windows promotion retry paths. No other Plan A-C path, Plan D sentinel, version,
dependency, registry, publish, or real-user-data file changed. Record both
correction-spec commits, both plan revisions, Tasks 1-8, controller fixes, and
the promotion retry commit separately.

Unrelated untracked plan files may be recorded and ignored; do not stage, edit,
or remove them. Tracked documentation outside the tested-source roots need not be
globally clean, but every tracked product/test dependency in the literal
tested-source roots above must be clean and exactly inventoried at the
resolved test head before every focused/full Extension or Host suite.

Each later shell command is independent: reread and exact-byte validate `plan-e-base.txt` against the declared SHA inside any block that needs `$integrationBase`; never rely on the variable from Step 1 surviving another tool call. Use only the declared SHA and separately resolved immutable review head for Plan E-only version/scope diffs. Do not substitute current `HEAD` after resolving a review head, the branch base, or a guessed downstream commit.

- [ ] **Step 2: Run focused Extension verification**

```powershell
$ErrorActionPreference='Stop'
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
$focusedRaw='.superpowers/sdd/focused-extension-results.raw.tmp'
$focusedTemp='.superpowers/sdd/focused-extension-results.canonical.tmp'
if ((Test-Path -LiteralPath $focusedResult) -or (Test-Path -LiteralPath $focusedRaw) -or (Test-Path -LiteralPath $focusedTemp)) { throw 'Focused Extension result or temporary already exists; run the documented mutable-result reset first' }
$focusedHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $focusedHead.Count -ne 1 -or $focusedHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind focused Extension result to HEAD' }
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
$focusedRawAbsolute=Join-Path (Get-Location) $focusedRaw
try {
    & npm run test:run --prefix extension -- @focusedExtension --reporter=verbose --reporter=json "--outputFile.json=$focusedRawAbsolute"
    if ($LASTEXITCODE -ne 0) { throw 'Focused Extension verification failed' }
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
    if value['numTotalTestSuites']!=len(rows) or value['numPassedTestSuites']!=len(rows): raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
raw,temp,target=map(pathlib.Path,sys.argv[1:4])
head=sys.argv[4]
value=json.loads(raw.read_text(encoding='utf-8'),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or 'reviewed_head' in value:
    raise SystemExit('focused Vitest root shape mismatch')
expected=[item.replace('\\','/') for item in sys.argv[5:]]
if len(expected)!=len(set(expected)): raise SystemExit('duplicate focused expected path')
rows=value.get('testResults')
if type(rows) is not list or not rows or any(type(row) is not dict for row in rows):
    raise SystemExit('focused Vitest rows mismatch')
validate_counts(value,rows,'focused Vitest')
row_keys=[json.dumps(row,sort_keys=True,separators=(',',':')) for row in rows]
if len(row_keys)!=len(set(row_keys)): raise SystemExit('duplicate focused testResults row')
def observed_path(row):
    name=row.get('name')
    if type(name) is not str: raise SystemExit('focused Vitest row name mismatch')
    name=name.replace('\\','/')
    if '/extension/' in name: return name.rsplit('/extension/',1)[1]
    if name.startswith('extension/'): return name[len('extension/'):]
    return name
observed=[observed_path(row) for row in rows]
if len(observed)!=len(set(observed)): raise SystemExit('duplicate focused observed file path')
if value.get('success') is not True or value.get('numFailedTests') != 0 or value.get('numFailedTestSuites') != 0 or value.get('numPendingTests') != 0 or value.get('numPendingTestSuites') != 0 or value.get('numTodoTests') != 0:
    raise SystemExit('focused Vitest status mismatch')
if value.get('numTotalTests') != value.get('numPassedTests') or value.get('numTotalTests',0) < 1:
    raise SystemExit('focused Vitest test count mismatch')
if set(observed) != set(expected) or len(observed)!=len(expected):
    raise SystemExit(f'focused Vitest file mismatch: {sorted(observed)}')
if any(row.get('status') != 'passed' for row in rows):
    raise SystemExit('focused Vitest file status mismatch')
for row in rows:
    assertions=row.get('assertionResults')
    if type(assertions) is not list or not assertions or any(type(item) is not dict or item.get('status')!='passed' for item in assertions):
        raise SystemExit('focused Vitest pending/todo/skipped test detected')
value['reviewed_head']=head
canonical=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n'
temp.write_text(canonical,encoding='utf-8',newline='')
check=temp.read_text(encoding='utf-8')
parsed=json.loads(check,object_pairs_hook=pairs,parse_constant=reject_constant)
if check!=canonical or parsed!=value or target.exists(): raise SystemExit('focused canonical promotion precondition failed')
os.replace(temp,target)
print(f"{value['numTotalTests']} {len(rows)}")
'@
    $focusedCounts=@($focusedValidator | & 'host\venv\Scripts\python.exe' - $focusedRaw $focusedTemp $focusedResult $focusedHead[0].Trim() @focusedExtension)
    if ($LASTEXITCODE -ne 0 -or $focusedCounts.Count -ne 1) { throw 'Focused Extension JSON validation failed' }
} finally {
    Remove-Item -LiteralPath $focusedRaw,$focusedTemp -Force -ErrorAction SilentlyContinue
}
& git check-ignore -q -- $focusedResult
if ($LASTEXITCODE -ne 0) { throw 'Focused Extension result is not ignored' }
```

Expected: `utils/ownData.ts`, `background/analyzeRequestHandler.ts`, `background/nativeMessageWire.ts`, and their focused tests exist; every asserted Plan E test passes, including `content/updateErrorBridge.test.ts`. Record exact totals.

- [ ] **Step 3: Run full Extension tests, type/build gates, and generated-output check**

```powershell
$ErrorActionPreference='Stop'
$fullResult='.superpowers/sdd/full-extension-results.json'
$fullRaw='.superpowers/sdd/full-extension-results.raw.tmp'
$fullTemp='.superpowers/sdd/full-extension-results.canonical.tmp'
if ((Test-Path -LiteralPath $fullResult) -or (Test-Path -LiteralPath $fullRaw) -or (Test-Path -LiteralPath $fullTemp)) { throw 'Full Extension result or temporary already exists; run the documented mutable-result reset first' }
$fullHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $fullHead.Count -ne 1 -or $fullHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind full Extension result to HEAD' }
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
    & npm run test:run --prefix extension -- --reporter=verbose --reporter=json "--outputFile.json=$fullRawAbsolute"
    if ($LASTEXITCODE -ne 0) { throw 'Full Extension tests failed' }
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
    if value['numTotalTestSuites']!=len(rows) or value['numPassedTestSuites']!=len(rows): raise SystemExit(name+' suite/file counter relationship')
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
    $fullCounts=@($fullValidator | & 'host\venv\Scripts\python.exe' - $fullRaw $fullTemp $fullResult $fullHead[0].Trim() @expectedFullTests)
    if ($LASTEXITCODE -ne 0 -or $fullCounts.Count -ne 1) { throw 'Full Extension JSON validation failed' }
} finally {
    Remove-Item -LiteralPath $fullRaw,$fullTemp -Force -ErrorAction SilentlyContinue
}
& git check-ignore -q -- $fullResult
if ($LASTEXITCODE -ne 0) { throw 'Full Extension result is not ignored' }
Push-Location -LiteralPath 'extension'
try {
    & npm exec tsc -- --noEmit -p tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw 'Extension TypeScript failed' }
} finally {
    Pop-Location
}
& npm run build --prefix extension
if ($LASTEXITCODE -ne 0) { throw 'Extension build failed' }
$status=@(git status --short)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect post-build status' }
$generated=@($status | Where-Object { $_ -match 'extension[\\/]dist' })
if ($generated.Count -gt 0) { throw 'Build generated tracked/unignored dist paths' }
```

Expected: full Vitest exits 0 with all tests/files passed; standalone TypeScript exits 0; production build exits 0; generated `extension/dist` remains ignored/untracked and no generated product file appears in `git status`.

- [ ] **Step 4: Run self-contained isolated Host verification**

Use one fresh parent with a separate six-environment directory set for each Python phase. The block is fully self-contained:

```powershell
$ErrorActionPreference='Stop'
$tempParent=[IO.Path]::GetTempPath()
if (-not (Test-Path -LiteralPath $tempParent -PathType Container)) {
    throw 'Host temp parent is unavailable'
}
if (-not (Test-Path -LiteralPath 'host\venv\Scripts\python.exe' -PathType Leaf)) {
    throw 'Host venv Python is unavailable'
}
$root=Join-Path $tempParent `
    ('dh-plan-e-host-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $root) { throw 'Plan E Host temp root already exists' }
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH','DH_PROMOTION_EVIDENCE','DH_PLAN_C_FROZEN_ONEDIR')
$savedEnv=@{}
foreach ($name in $envNames) {
    $savedEnv[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
}
function Set-PlanEHostEnvironment {
    param(
        [Parameter(Mandatory=$true)][string]$Phase,
        [Parameter(Mandatory=$true)][bool]$UseHostPath
    )
    $phaseRoot=Join-Path $root $Phase
    New-Item -ItemType Directory -Path $phaseRoot | Out-Null
    $paths=[ordered]@{
        LOCALAPPDATA=Join-Path $phaseRoot 'localappdata'
        APPDATA=Join-Path $phaseRoot 'appdata'
        USERPROFILE=Join-Path $phaseRoot 'userprofile'
        HOME=Join-Path $phaseRoot 'home'
        TEMP=Join-Path $phaseRoot 'temp'
        TMP=Join-Path $phaseRoot 'tmp'
    }
    New-Item -ItemType Directory -Path @($paths.Values) | Out-Null
    foreach ($entry in $paths.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable(
            $entry.Key,
            $entry.Value,
            'Process'
        )
    }
    if ($UseHostPath) {
        [Environment]::SetEnvironmentVariable(
            'PYTHONPATH',
            (Resolve-Path -LiteralPath 'host').Path,
            'Process'
        )
    } else {
        Remove-Item -LiteralPath 'Env:PYTHONPATH' -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath 'Env:DH_PROMOTION_EVIDENCE' -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath 'Env:DH_PLAN_C_FROZEN_ONEDIR' -ErrorAction SilentlyContinue
}
$hostResultPath='.superpowers/sdd/host-test-results.json'
$hostResultTemp='.superpowers/sdd/host-test-results.tmp'
if ((Test-Path -LiteralPath $hostResultPath) -or (Test-Path -LiteralPath $hostResultTemp)) { throw 'Host result or temporary already exists; run the documented mutable-result reset first' }
$hostHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $hostHead.Count -ne 1 -or $hostHead[0].Trim() -notmatch '^[0-9a-f]{40}$') { throw 'Could not bind Host result to HEAD' }
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
        [Parameter(Mandatory=$true)][AllowEmptyCollection()][object[]]$ExpectedSkips
    )
    Assert-PlanETestedSource
    $lines=@(& 'host\venv\Scripts\python.exe' @Arguments 2>&1)
    $exit=$LASTEXITCODE
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
    if ($skipped -ne $skips.Count -or $skips.Count -ne $ExpectedSkips.Count) {
        throw "$Name Host suite skip count/verbose identity mismatch"
    }
    for ($index=0; $index -lt $ExpectedSkips.Count; $index++) {
        if (
            $skips[$index].selector -cne $ExpectedSkips[$index].selector -or
            $skips[$index].reason -cne $ExpectedSkips[$index].reason
        ) { throw "$Name Host suite skip identity/reason mismatch" }
    }
    return [ordered]@{tests=[int]$ran[0].Groups[1].Value;skipped=$skipped;skips=$skips}
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
try {
    New-Item -ItemType Directory -Path $root | Out-Null
    Set-PlanEHostEnvironment -Phase 'focused' -UseHostPath $true
    $hostResults.focused=Invoke-PlanEHostSuite -Name 'focused' -ExpectedSkips @() -Arguments @('-m','unittest','host.test_session_workspace','host.test_prompt_session','host.test_prompt_sources','host.test_sdk_compat','host.test_debug_prompt_isolation','host.test_model_config','-v')

    Set-PlanEHostEnvironment -Phase 'full' -UseHostPath $true
    $hostResults.full=Invoke-PlanEHostSuite -Name 'full' -ExpectedSkips @($authorizedSkip) -Arguments $fullHostArguments

    Set-PlanEHostEnvironment -Phase 'compile' -UseHostPath $false
    Assert-PlanETestedSource
    & 'host\venv\Scripts\python.exe' -m compileall -q -x '[\\/]venv[\\/]' host
    if ($LASTEXITCODE -ne 0) { throw 'Host compileall failed' }
    $hostResults.compile='passed'

    Set-PlanEHostEnvironment -Phase 'update-engine' -UseHostPath $true
    $hostResults.update_engine=Invoke-PlanEHostSuite -Name 'update-engine' -ExpectedSkips @() -Arguments @('-m','unittest','host.test_update_engine_resume','host.test_update_engine_host','host.test_update_engine_extension','host.test_update_engine_rollback','-v')

    Set-PlanEHostEnvironment -Phase 'recovery' -UseHostPath $true
    $hostResults.recovery=Invoke-PlanEHostSuite -Name 'recovery' -ExpectedSkips @($authorizedSkip) -Arguments @('-m','unittest','host.test_update_recovery','-v')

    Set-PlanEHostEnvironment -Phase 'package' -UseHostPath $true
    $hostResults.package=Invoke-PlanEHostSuite -Name 'package' -ExpectedSkips @() -Arguments @('-m','unittest','host.test_release_helper','host.test_package_archive','-v')
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
    if (Test-Path -LiteralPath $root) {
        Remove-Item -LiteralPath $root -Recurse -Force
    }
}
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
    [IO.File]::WriteAllText((Join-Path (Get-Location) $hostResultTemp),$canonical[0] + "`n",[Text.UTF8Encoding]::new($false))
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $hostResultTemp),[Text.UTF8Encoding]::new($false))
    if ($tempText -cne $canonical[0] + "`n" -or (Test-Path -LiteralPath $hostResultPath)) { throw 'Host atomic promotion precondition failed' }
    [IO.File]::Move((Join-Path (Get-Location) $hostResultTemp),(Join-Path (Get-Location) $hostResultPath))
} finally {
    Remove-Item -LiteralPath $hostResultTemp -Force -ErrorAction SilentlyContinue
}
& git check-ignore -q -- $hostResultPath
if ($LASTEXITCODE -ne 0) { throw 'Host test result is not ignored' }
```

Expected: focused Host and the exact reviewed-head inventory of every tracked top-level `host/test_*.py` module report `OK`; source-only compileall exits 0 without diagnostics; the expanded update-engine gate (resume/host/extension/rollback), recovery/package gates, and release/archive staging tests report `OK` without building/publishing assets. Full and recovery each contain exactly the authorized skip selector `host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation` with exact reason `DH_PLAN_C_FROZEN_ONEDIR not set`; focused, update-engine, and package contain zero skips. The verbose selector identity and reason are stored, not inferred from the summary count. The focused promotion retry tests are included in both resume and the full Host inventory and must pass without real delays. Record exact test totals. Every Python phase receives distinct existing `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` directories before process start. `PYTHONPATH=host` is present for dotted-module phases and absent for compileall. Do not invoke authenticated Analyze or real Native Host registration. The same block's `finally` restores every prior process environment value and removes the one known parent after all child processes exit; no later shell depends on its variables.

- [ ] **Step 5: Run the no-coercion, ownership, and compatibility static scans**

Run from the root using `git grep` so only tracked source is inspected. The first two commands are expected-no-match gates, so handle exit code 1 explicitly; later commands are inventory scans and may print matches:

<!-- REVIEWED_HEAD_STATIC_AUDIT_START -->
```powershell
$ErrorActionPreference='Stop'
$staticHead=@(& git rev-parse HEAD)
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
    $senderAudit | & node
    if ($LASTEXITCODE -ne 0) { throw 'Service Worker Native sender AST audit failed' }
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
$integrationBase='0dbb4852931b50153fb898b03129ae0092c46404'
$baseBytes=[IO.File]::ReadAllBytes(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-base.txt')
)
$expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes(
    $integrationBase + "`n"
)
if ([Convert]::ToHexString($baseBytes) -cne [Convert]::ToHexString($expectedBaseBytes)) {
    throw 'Plan E base evidence is not the declared SHA plus LF'
}
$rangeHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $rangeHead.Count -ne 1) {
    throw 'Could not resolve Plan E range head'
}
$rangeHead=$rangeHead[0].Trim()
if ($rangeHead -notmatch '^[0-9a-f]{40}$') { throw 'Invalid Plan E range head' }
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
$resultPath='.superpowers/sdd/reviewed-head-verification.json'
$tempPath='.superpowers/sdd/reviewed-head-verification.tmp'
if ((Test-Path -LiteralPath $resultPath) -or (Test-Path -LiteralPath $tempPath)) {
    throw 'Reviewed-head verification result or temporary already exists'
}
$reviewedHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $reviewedHead.Count -ne 1 -or $reviewedHead[0].Trim() -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve reviewed verification head'
}
$reviewedHead=$reviewedHead[0].Trim()
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
import json,pathlib,sys
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
    if value['numTotalTestSuites']!=len(rows) or value['numPassedTestSuites']!=len(rows): raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
def load(path):
    text=pathlib.Path(path).read_text(encoding='utf-8')
    value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
    if text!=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(path+' noncanonical')
    return value
focused,full,host=map(load,sys.argv[1:4])
head=sys.argv[4]
args=sys.argv[5:]
split=args.index('--full')
expected={'focused':args[:split],'full':args[split+1:]}
for name,value in (('focused',focused),('full',full)):
    if type(value) is not dict or value.get('reviewed_head')!=head: raise SystemExit(name+' head')
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
expected_skips={'focused':[],'full':authorized,'update_engine':[],'recovery':authorized,'package':[]}
if type(host) is not dict or set(host)!={'schema_version','reviewed_head','focused','full','compile','update_engine','recovery','package'} or type(host.get('schema_version')) is not int or host.get('schema_version')!=1 or host.get('reviewed_head')!=head or host.get('compile')!='passed': raise SystemExit('host shape/head')
for name,skips in expected_skips.items():
    row=host.get(name)
    if type(row) is not dict or set(row)!={'tests','skipped','skips'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or row['skipped']!=len(skips) or row.get('skips')!=skips: raise SystemExit(name+' host skips/count')
print(json.dumps({'focused_extension':{'files':len(focused['testResults']),'tests':focused['numTotalTests']},'full_extension':{'files':len(full['testResults']),'tests':full['numTotalTests']},'host':{name:host[name] for name in ('focused','full','update_engine','recovery','package')}},sort_keys=True,separators=(',',':')))
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
$expectedFull=@(& git ls-tree -r --name-only $reviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $expectedFull.Count -lt 1) { throw 'Could not inventory reviewed full Extension tests' }
$testSummary=@($strictResults | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' $reviewedHead @expectedFocused '--full' @expectedFull)
if ($LASTEXITCODE -ne 0 -or $testSummary.Count -ne 1) { throw 'Strict reviewed-head machine-result validation failed' }
Push-Location -LiteralPath 'extension'
try {
    & npm exec tsc -- --noEmit -p tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head TypeScript gate failed' }
} finally { Pop-Location }
& npm run build --prefix extension
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head build gate failed' }
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
    test_summary=($testSummary[0] | ConvertFrom-Json -AsHashtable)
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
    [IO.File]::WriteAllText((Join-Path (Get-Location) $tempPath),$canonical[0] + "`n",[Text.UTF8Encoding]::new($false))
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $tempPath),[Text.UTF8Encoding]::new($false))
    $strict=@($tempText | & 'host\venv\Scripts\python.exe' -c $canonicalizer)
    if ($LASTEXITCODE -ne 0 -or $strict.Count -ne 1 -or $tempText -cne $strict[0] + "`n" -or (Test-Path -LiteralPath $resultPath)) { throw 'Reviewed-head verification atomic promotion precondition failed' }
    [IO.File]::Move((Join-Path (Get-Location) $tempPath),(Join-Path (Get-Location) $resultPath))
} finally { Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue }
& git check-ignore -q -- $resultPath
if ($LASTEXITCODE -ne 0) { throw 'Reviewed-head verification result is not ignored' }
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

Perform the writing-plans self-review now: reread spec sections 6-10, 11.3-11.4, and 13 Plan E plus both correction specs and point each sentence to a task/test row above; scan implementation/report text for unresolved authoring markers or vague error-handling directions; compare every exported signature/property name against the locked interfaces and confirm the `UpdateEngine` constructor remains frozen. Correct any gap in a focused TDD commit before proceeding.

- [ ] **Step 7: Generate the Plan-E-only review package**

Run this exact self-contained block from the repository root:

```powershell
$ErrorActionPreference='Stop'
$integrationBase='0dbb4852931b50153fb898b03129ae0092c46404'
$baseBytes=[IO.File]::ReadAllBytes(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-base.txt')
)
$expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes(
    $integrationBase + "`n"
)
if ([Convert]::ToHexString($baseBytes) -cne [Convert]::ToHexString($expectedBaseBytes)) {
    throw 'Plan E base evidence is not the declared SHA plus LF'
}
& git cat-file -e "$integrationBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Plan E review base is not a commit' }
$reviewHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve Plan E review head' }
if ($reviewHead.Count -ne 1) { throw 'Plan E review head is ambiguous' }
$reviewHead=$reviewHead[0].Trim()
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
$packageTemp='.superpowers/sdd/plan-e-only-review-package.tmp'
$diffPath='.superpowers/sdd/plan-e-only-review.diff'
$diffTemp='.superpowers/sdd/plan-e-only-review.diff.tmp'
foreach ($path in @($packagePath,$packageTemp,$diffPath,$diffTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Plan E review output already exists: $path" }
}
try {
    [IO.File]::WriteAllText((Join-Path (Get-Location) $packageTemp),$packageText,[Text.UTF8Encoding]::new($false))
    & git diff --full-index --binary $reviewRange --output=$diffTemp
    if ($LASTEXITCODE -ne 0) { throw 'Could not write Plan E review diff temporary' }
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $packageTemp),[Text.UTF8Encoding]::new($false)) -cne $packageText -or -not (Test-Path -LiteralPath $diffTemp -PathType Leaf)) { throw 'Plan E review temporary validation failed' }
    [IO.File]::Move((Join-Path (Get-Location) $packageTemp),(Join-Path (Get-Location) $packagePath))
    [IO.File]::Move((Join-Path (Get-Location) $diffTemp),(Join-Path (Get-Location) $diffPath))
} finally {
    Remove-Item -LiteralPath $packageTemp,$diffTemp -Force -ErrorAction SilentlyContinue
}
```

The quoted command executed for this package is exactly `git diff --full-index --binary "$integrationBase..$reviewHead"`; no command substitutes mutable `HEAD` after `$reviewHead` is resolved.

```text
.superpowers/sdd/plan-e-only-review-package.txt
.superpowers/sdd/plan-e-only-review.diff
.superpowers/sdd/plan-e-only-review-findings.md
```

Review `.superpowers/sdd/plan-e-only-review.diff` plus the package stat/log/path inventories for behavioral regressions, trust boundaries, ownership races, missing tests, Plan D sentinel absence, and forbidden operations. Write `.superpowers/sdd/plan-e-only-review-findings.md` with exact headings `Review Base`, `Review Head`, `Review Range`, `Critical`, `Important`, `Minor`, `Testing Gaps`, and `Disposition`; use literal SHAs/range from the package. Every finding has severity and file/line. `Disposition` is `BLOCKED` while any Critical/Important finding remains and `PASS` only after fixes and a fresh package/review.

Under `Review Base`, `Review Head`, and `Review Range`, put only the package's literal value on the immediately following line. Under `Disposition`, put only `PASS` or `BLOCKED` on the immediately following line. Use `None.` under an empty severity/testing section; do not omit a heading.

- [ ] **Step 8: Generate the original whole-branch interim review package**

Run this separate exact block; do not substitute the Plan E base:

```powershell
$ErrorActionPreference='Stop'
$originalBase='0040b1de1bc196b203014a8e4f94a53babb7e9aa'
& git cat-file -e "$originalBase^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'Original review base is not a commit' }
$reviewHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve whole-branch review head' }
if ($reviewHead.Count -ne 1) { throw 'Whole-branch review head is ambiguous' }
$reviewHead=$reviewHead[0].Trim()
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
$packageTemp='.superpowers/sdd/original-whole-branch-interim-review-package.tmp'
$diffPath='.superpowers/sdd/original-whole-branch-interim-review.diff'
$diffTemp='.superpowers/sdd/original-whole-branch-interim-review.diff.tmp'
foreach ($path in @($packagePath,$packageTemp,$diffPath,$diffTemp)) {
    if (Test-Path -LiteralPath $path) { throw "Whole-branch review output already exists: $path" }
}
try {
    [IO.File]::WriteAllText((Join-Path (Get-Location) $packageTemp),$packageText,[Text.UTF8Encoding]::new($false))
    & git diff --full-index --binary $reviewRange --output=$diffTemp
    if ($LASTEXITCODE -ne 0) { throw 'Could not write whole-branch review diff temporary' }
    if ([IO.File]::ReadAllText((Join-Path (Get-Location) $packageTemp),[Text.UTF8Encoding]::new($false)) -cne $packageText -or -not (Test-Path -LiteralPath $diffTemp -PathType Leaf)) { throw 'Whole-branch review temporary validation failed' }
    [IO.File]::Move((Join-Path (Get-Location) $packageTemp),(Join-Path (Get-Location) $packagePath))
    [IO.File]::Move((Join-Path (Get-Location) $diffTemp),(Join-Path (Get-Location) $diffPath))
} finally {
    Remove-Item -LiteralPath $packageTemp,$diffTemp -Force -ErrorAction SilentlyContinue
}
```

The quoted original review command executed is exactly `git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..$reviewHead"`; the package records that resolved immutable head/range and never substitutes mutable `HEAD`. Expected output paths:

```text
.superpowers/sdd/original-whole-branch-interim-review-package.txt
.superpowers/sdd/original-whole-branch-interim-review.diff
.superpowers/sdd/original-whole-branch-interim-review-findings.md
```

Independently review the original-base diff for all branch behavior, cross-plan contracts, security/trust boundaries, ownership/order, verification coverage, and documentation claims. Do not copy the Plan-E-only findings as a substitute. Write `.superpowers/sdd/original-whole-branch-interim-review-findings.md` with exact headings `Review Base`, `Review Head`, `Review Range`, `Critical`, `Important`, `Minor`, `Testing Gaps`, `Plan D Rerun Requirement`, and `Disposition`. `Plan D Rerun Requirement` must state: `Rerun git diff --full-index --binary "0040b1de1bc196b203014a8e4f94a53babb7e9aa..<final-D-head>" and the full original-base controller review after Plan D is committed and before any final whole-branch/release-readiness claim.` `Disposition` may be `INTERIM PASS THROUGH PLAN E` only when no Critical/Important finding remains; it must never say final whole-branch review complete.

Under `Review Base`, `Review Head`, and `Review Range`, put only the package's literal value on the immediately following line. Under `Plan D Rerun Requirement`, put the exact required sentence on the immediately following line. Under `Disposition`, put only `INTERIM PASS THROUGH PLAN E` or `BLOCKED` on the immediately following line. Use `None.` under an empty severity/testing section; do not omit a heading.

The two controller reviews are separate completion gates. Resolve every
Critical/Important finding from either findings file in a separate focused
RED/GREEN/mutation commit, then rerun Task 9 Steps 1-8 so exact range paths,
verification, and both packages independently recompute the same later committed
product head and both reviews are repeated. Exception: if a finding requires any
further change to `host/update_engine.py` or `host/test_update_engine_resume.py`,
stop before editing and obtain a human-approved revision of the Windows promotion
spec and this plan. Reset/rebuild all promotion phase maps, transcripts, ledger,
AST record, and Host blob evidence under that revision. Ordinary review-fix flow
may not rewrite Host blobs while retaining old promotion evidence. Do not create
the evidence commit while either review is blocked or the two recorded heads
differ. Minor/testing risks remain recorded separately.

- [ ] **Step 9: Write the final evidence report with exact observed output**

Before creating the report, run the final-artifact manifest generation block
published in Step 10 against the completed packages/findings and all promotion
artifacts. Record the resulting manifest SHA in the report. Then create
`.superpowers/sdd/plan-e-extension-hardening-report.md` with these completed
sections and only observed values:

```powershell
$ErrorActionPreference='Stop'
$manifestPath='.superpowers/sdd/final-artifacts.sha256.json'
$manifestTemp='.superpowers/sdd/final-artifacts.sha256.tmp'
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
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
$roots += @(1..8 | ForEach-Object { ".superpowers/sdd/task-$_-report.md" })
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
$artifactRoot=Join-Path (Get-Location) '.superpowers/sdd'
$managedLeafNames=@($roots | Where-Object { $_ -notlike '.superpowers/sdd/promotion-transcripts/*' } | ForEach-Object { [IO.Path]::GetFileName($_) })
$artifactEntries=@(Get-ChildItem -LiteralPath $artifactRoot -Force -Recurse)
$unsupportedManagedEntries=@($artifactEntries | Where-Object {
    $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/')
    $artifactPath='.superpowers/sdd/' + $relative
    $managedTranscript=$relative -eq 'promotion-transcripts' -or $relative -like 'promotion-transcripts/*'
    $managedName=$managedLeafNames -ccontains $_.Name
    ($managedTranscript -or $managedName) -and (
        ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
        ($managedName -and ($_ -isnot [IO.FileInfo] -or $roots -cnotcontains $artifactPath))
    )
})
$observedManagedFiles=@($artifactEntries | Where-Object {
    $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/')
    $_ -is [IO.FileInfo] -and ($relative -like 'promotion-transcripts/*' -or $managedLeafNames -ccontains $_.Name)
} | ForEach-Object { '.superpowers/sdd/' + [IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/') } | Sort-Object -Unique)
$missingManaged=@($roots | Where-Object { $observedManagedFiles -cnotcontains $_ }); $extraManaged=@($observedManagedFiles | Where-Object { $roots -cnotcontains $_ })
if ($unsupportedManagedEntries.Count -ne 0 -or $missingManaged.Count -ne 0 -or $extraManaged.Count -ne 0 -or $observedManagedFiles.Count -ne 58) { throw "Final-manifest artifact filesystem inventory mismatch. Missing: $($missingManaged -join ', '); Extra: $($extraManaged -join ', ')" }
$manifest=[ordered]@{}
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $manifest[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
}
$manifestCanonicalizer=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or any(type(k) is not str or type(v) is not str for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonical=@((ConvertTo-Json $manifest -Compress) | & 'host\venv\Scripts\python.exe' -c $manifestCanonicalizer)
if ($LASTEXITCODE -ne 0 -or $canonical.Count -ne 1) { throw 'Could not canonicalize final artifact manifest' }
try {
    [IO.File]::WriteAllText((Join-Path (Get-Location) $manifestTemp),$canonical[0] + "`n",[Text.UTF8Encoding]::new($false))
    $tempText=[IO.File]::ReadAllText((Join-Path (Get-Location) $manifestTemp),[Text.UTF8Encoding]::new($false))
    $strict=@($tempText | & 'host\venv\Scripts\python.exe' -c $manifestCanonicalizer)
    if ($LASTEXITCODE -ne 0 -or $strict.Count -ne 1 -or $tempText -cne $strict[0] + "`n" -or (Test-Path -LiteralPath $manifestPath)) { throw 'Final manifest atomic promotion precondition failed' }
    [IO.File]::Move((Join-Path (Get-Location) $manifestTemp),(Join-Path (Get-Location) $manifestPath))
} finally { Remove-Item -LiteralPath $manifestTemp -Force -ErrorAction SilentlyContinue }
& git check-ignore -q -- $manifestPath
if ($LASTEXITCODE -ne 0) { throw 'Final artifact manifest is not ignored' }
$manifestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
"Final artifact manifest SHA-256: $manifestHash"
```


```markdown
# Plan E Extension Data and Request Hardening Report

**Integration base from plan-e-base.txt:** `[observed preflight commit]`
**Final reviewed product head:** `[observed review head]`

## Scope and Constraints
## Commit Map
## Requirement-to-Test Matrix
## A-C Prerequisite and Plan D Handoff Evidence
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

Replace all bracketed labels with observed commit IDs. Record reviewed A-C prerequisite evidence, the human-authorized Windows promotion exception, Plan D sentinel absence, the immutable declared 60-path Plan E range, both correction-spec and plan-revision commits separately from Tasks 1-8, controller fixes, and the promotion retry commit. Record the complete corrected RED sequence (all six missing-module REDs plus every assertion RED added by both corrections), all eight exact staged-path checks plus the separate one-path promotion RED/production commit gates, shared own-data and non-Analyze/wire mutation evidence, promotion retry/checkpoint mutations, historical uncontrolled and controlled WinError observations, the later clean full Host run, Analyze request-handler/Options/content-bridge/FAB RED/GREEN, the stale-D execution blocker, and frozen Plan D provider/lease/wire imports/order/envelope. The report must include exact machine-derived lines for focused/full Extension and focused/full/update-engine/recovery/package Host totals, including each skip count. It must name the exact authorized full/recovery skipped selector and reason and state zero skips in focused/update-engine/package. Record `PASS` for TypeScript, build, static, diff, focused/full Extension, and all Host phases at the exact reviewed head from `.superpowers/sdd/reviewed-head-verification.json`, plus that artifact's SHA-256. Summarize `.superpowers/sdd/plan-e-only-review-findings.md` and `.superpowers/sdd/original-whole-branch-interim-review-findings.md` under separate headings with their distinct literal bases/ranges/heads; do not merge their findings. State that the original-base review is interim through Plan E and that final whole-branch review completion remains blocked on the exact post-D rerun. State explicitly that no real Chrome storage, registry, `%LOCALAPPDATA%\DynamicsHelper`, update, package, publish, install, MyCases, or authenticated model operation occurred. The first historical upgrade limitation belongs to later Plan D/release verification, not Plan E execution. Record whether optional authenticated smoke was skipped.

- [ ] **Step 10: Validate both review records, self-review evidence, and commit it alone**

Review the report against spec sections 6-10, 11.3-11.4, and 13 Plan E plus both correction specs. Search for bracketed labels, incomplete markers, unsupported claims, missing RED/mutation evidence (including every promotion checkpoint mutation), missing A-C authorization/Plan D-handoff evidence, missing 60-path inventory/promotion commit/history, merged/missing review findings, any claim that final whole-branch review is complete, and mismatched totals; correct every occurrence. Then run:

```powershell
$ErrorActionPreference='Stop'
$requiredReviewArtifacts=@(
    '.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/plan-e-only-review.diff',
    '.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
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
    'A-C Prerequisite and Plan D Handoff Evidence','RED Evidence',
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
foreach ($number in 1..8) {
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
$testEvidenceValidator=@'
# REVIEWED_TEST_EVIDENCE_VALIDATOR_START
import json,pathlib,sys
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
    if value['numTotalTestSuites']!=len(rows) or value['numPassedTestSuites']!=len(rows): raise SystemExit(name+' suite/file counter relationship')
    assertion_lists=[row.get('assertionResults') for row in rows]
    if any(type(items) is not list or not items for items in assertion_lists) or sum(len(items) for items in assertion_lists)!=value['numTotalTests']: raise SystemExit(name+' assertion counter relationship')
    if value['numTotalTests']<1 or value['numPassedTests']!=value['numTotalTests']: raise SystemExit(name+' passing counter relationship')
    if any(value[key]!=0 for key in ('numFailedTestSuites','numPendingTestSuites','numFailedTests','numPendingTests','numTodoTests')): raise SystemExit(name+' nonzero failure/pending counter')
    if 'numRuntimeErrorTestSuites' in value and value['numRuntimeErrorTestSuites']!=0: raise SystemExit(name+' runtime-error counter')
def strict(path):
    text=pathlib.Path(path).read_text(encoding='utf-8')
    value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
    if text!=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(path+' noncanonical')
    return value
focused,full,host,verification=map(strict,sys.argv[1:5])
head=sys.argv[5]
arguments=sys.argv[6:]
separator=arguments.index('--full')
expected_files={'focused':arguments[:separator],'full':arguments[separator+1:]}
for name,value in (('focused',focused),('full',full)):
    if type(value) is not dict or value.get('reviewed_head')!=head: raise SystemExit(name+' reviewed head')
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
expected_skips={'focused':[],'full':authorized,'update_engine':[],'recovery':authorized,'package':[]}
if type(host) is not dict or set(host)!={'schema_version','reviewed_head','focused','full','compile','update_engine','recovery','package'} or type(host.get('schema_version')) is not int or host.get('schema_version')!=1 or host.get('reviewed_head')!=head or host.get('compile')!='passed': raise SystemExit('Host result shape')
for name,skips in expected_skips.items():
    row=host.get(name)
    if type(row) is not dict or set(row)!={'tests','skipped','skips'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or row['skipped']!=len(skips) or row.get('skips')!=skips: raise SystemExit(name+' Host exact skips/count')
required={'focused_extension','full_extension','host','host_compile','typescript','build','static','diff'}
verification_keys={'schema_version','reviewed_head','tested_source_roots','tested_source_blobs','focused_extension','full_extension','host','host_compile','typescript','build','static','diff','machine_result_sha256','test_summary'}
roots=['extension','host','tests','docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md','.gitignore','release_helper.py','dev_switch.py','installer_core.ps1','dyhelper_installer.ps1','install.bat']
if type(verification) is not dict or set(verification)!=verification_keys or type(verification.get('schema_version')) is not int or verification.get('schema_version')!=1 or verification.get('reviewed_head')!=head or verification.get('tested_source_roots')!=roots or any(verification.get(key)!='passed' for key in required) or type(verification.get('tested_source_blobs')) is not dict or not verification['tested_source_blobs']: raise SystemExit('reviewed-head verification status/head/shape')
machine_hashes=verification.get('machine_result_sha256')
if type(machine_hashes) is not dict or set(machine_hashes)!={'focused_extension','full_extension','host'} or any(type(value) is not str or len(value)!=64 for value in machine_hashes.values()): raise SystemExit('reviewed-head machine-result hashes')
summary=verification.get('test_summary')
if type(summary) is not dict or set(summary)!={'focused_extension','full_extension','host'}: raise SystemExit('reviewed-head verification summary shape')
for name,expected in (('focused_extension',{'files':len(focused['testResults']),'tests':focused['numTotalTests']}),('full_extension',{'files':len(full['testResults']),'tests':full['numTotalTests']})):
    row=summary.get(name)
    if type(row) is not dict or set(row)!={'files','tests'} or any(type(row.get(key)) is not int or row[key]<1 for key in ('files','tests')) or row!=expected: raise SystemExit(name+' summary counters')
if summary.get('host')!={name:host[name] for name in ('focused','full','update_engine','recovery','package')}: raise SystemExit('reviewed-head verification Host summary')
print(focused['numTotalTests'],len(focused['testResults']),full['numTotalTests'],len(full['testResults']),*(host[name][key] for name in ('focused','full','update_engine','recovery','package') for key in ('tests','skipped')))
# REVIEWED_TEST_EVIDENCE_VALIDATOR_END
'@
$reviewPackageForTests=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-package.txt'),[Text.UTF8Encoding]::new($false))
$testReviewedHead=[regex]::Match($reviewPackageForTests,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
if ($testReviewedHead -notmatch '^[0-9a-f]{40}$') { throw 'Could not resolve reviewed head for test evidence' }
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
$expectedFullForEvidence=@(& git ls-tree -r --name-only $testReviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $expectedFullForEvidence.Count -lt 1) { throw 'Could not inventory final full Extension tests' }
$testEvidence=@($testEvidenceValidator | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' '.superpowers/sdd/reviewed-head-verification.json' $testReviewedHead @expectedFocusedForEvidence '--full' @expectedFullForEvidence)
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
if ($testCounts.Count -ne 14) { throw 'Final machine test evidence count vector is invalid' }
foreach ($line in @(
    ('**Focused Extension gate:** `PASS` - ' + $testCounts[0] + ' tests, ' + $testCounts[1] + ' files'),
    ('**Full Extension gate:** `PASS` - ' + $testCounts[2] + ' tests, ' + $testCounts[3] + ' files'),
    ('**Focused Host gate:** `PASS` - ' + $testCounts[4] + ' tests, ' + $testCounts[5] + ' skipped'),
    ('**Fresh isolated full Host gate:** `PASS` - ' + $testCounts[6] + ' tests, ' + $testCounts[7] + ' skipped'),
    ('**Update-engine Host gate:** `PASS` - ' + $testCounts[8] + ' tests, ' + $testCounts[9] + ' skipped'),
    ('**Recovery Host gate:** `PASS` - ' + $testCounts[10] + ' tests, ' + $testCounts[11] + ' skipped'),
    ('**Package Host gate:** `PASS` - ' + $testCounts[12] + ' tests, ' + $testCounts[13] + ' skipped')
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
    '**Focused/update-engine/package Host skips:** `0`',
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
    foreach ($number in 1..8) {
        if (-not $evidenceSections[$section].Contains("Task $number")) {
            throw "$section omits Task $number"
        }
    }
}
$ledgerPath='.superpowers/sdd/promotion-ledger.json'
if (-not (Test-Path -LiteralPath $ledgerPath -PathType Leaf)) { throw 'Promotion ledger is missing' }
$actualPlanCommit=@(& git log -1 --format=%H HEAD -- 'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md')
if ($LASTEXITCODE -ne 0 -or $actualPlanCommit.Count -ne 1) { throw 'Could not resolve promotion plan commit' }
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
import json,sys
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
    @($promotionEngineBlob,$promotionTestBlob,$headEngineBlob,$headTestBlob | Where-Object { $_.Count -ne 1 }).Count -ne 0 -or
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
    '60 paths',
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
    '(?m)^\*\*Expanded Plan E range:\*\* `PASS` - 60 paths\r?$',
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
}
foreach ($entry in $artifactHashes.GetEnumerator()) {
    $line=('**' + $entry.Key + ':** `' + $entry.Value + '`')
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($line) + '\r?$').Count -ne 1) {
        throw "Final evidence artifact hash mismatch: $($entry.Key)"
    }
}
if ($evidence -match '\[(observed|insert|TODO|TBD)[^\]]*\]') {
    throw 'Plan E evidence retains a placeholder'
}
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
$replayRoot=Join-Path ([IO.Path]::GetTempPath()) ('dh-promotion-red-replay-' + [guid]::NewGuid().ToString('N'))
try {
    & git worktree add --detach $replayRoot $testCommit
    if ($LASTEXITCODE -ne 0) { throw 'Could not create promotion RED replay worktree' }
    $python=Join-Path (Get-Location) 'host\venv\Scripts\python.exe'
    $savedLocation=Get-Location
    Push-Location -LiteralPath $replayRoot
    try {
        $envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH','DH_PROMOTION_EVIDENCE')
        $savedEnv=@{}
        foreach ($name in $envNames) { $savedEnv[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
        $isolation=Join-Path ([IO.Path]::GetTempPath()) ('dh-red-replay-env-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $isolation | Out-Null
        foreach ($name in @('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP')) {
            $value=Join-Path $isolation $name.ToLowerInvariant()
            New-Item -ItemType Directory -Path $value | Out-Null
            [Environment]::SetEnvironmentVariable($name,$value,'Process')
        }
        [Environment]::SetEnvironmentVariable('PYTHONPATH',(Join-Path $replayRoot 'host'),'Process')
        Remove-Item -LiteralPath 'Env:DH_PROMOTION_EVIDENCE' -ErrorAction SilentlyContinue
        foreach ($method in $expectedRed) {
            $selector="host.test_update_engine_resume.PreparingPromotionRetryTests.$method"
            $lines=@(& $python -m unittest $selector -v 2>&1)
            $text=$lines -join "`n"
            if (
                $LASTEXITCODE -ne 1 -or
                [regex]::Matches($text,('(?m)^' + [regex]::Escape($method) + ' .* \.\.\. FAIL\r?$')).Count -ne 1 -or
                [regex]::Matches($text,'(?m)^Ran 1 test in [0-9.]+s\r?$').Count -ne 1 -or
                [regex]::Matches($text,'(?m)^FAILED \(failures=1\)\r?$').Count -ne 1 -or
                $text -cmatch '(?m)(^ERROR:|\bskipped\b)'
            ) {
                throw "Promotion RED replay did not fail correctly: $method"
            }
        }
        $selector='host.test_update_engine_resume.PreparingPromotionRetryTests.test_update_engine_constructor_signature_remains_frozen'
        $lines=@(& $python -m unittest $selector -v 2>&1)
        if ($LASTEXITCODE -ne 0 -or ($lines -join "`n") -cnotmatch '(?m)\.\.\. ok\r?$') {
            throw 'Promotion constructor replay did not pass'
        }
    } finally {
        foreach ($name in $envNames) {
            if ($null -eq $savedEnv[$name]) { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($name,$savedEnv[$name],'Process') }
        }
        Pop-Location
        if (Test-Path -LiteralPath $isolation) { Remove-Item -LiteralPath $isolation -Recurse -Force }
    }
} finally {
    if (Test-Path -LiteralPath $replayRoot) {
        & git worktree remove --force $replayRoot
        if ($LASTEXITCODE -ne 0) { throw 'Could not remove promotion RED replay worktree' }
    }
}
& git merge-base --is-ancestor '0dbb4852931b50153fb898b03129ae0092c46404' $promotionCommit
if ($LASTEXITCODE -ne 0) { throw 'Promotion commit is not after the Plan E base' }
foreach ($path in $requiredReviewArtifacts) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required review artifact missing: $path"
    }
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
if ($planERange -ne "$planEBase..$planEHead") {
    throw 'Plan E package range does not match its endpoints'
}
if ($wholeRange -ne "$wholeBase..$wholeHead") {
    throw 'Whole-branch package range does not match its endpoints'
}
if ($planEHead -ne $wholeHead) {
    throw 'Review package heads differ'
}
$latestEngineCommit=@(& git log -1 --format=%H $planEHead -- 'host/update_engine.py')
$latestTestCommit=@(& git log -1 --format=%H $planEHead -- 'host/test_update_engine_resume.py')
if (
    $LASTEXITCODE -ne 0 -or $latestEngineCommit.Count -ne 1 -or $latestTestCommit.Count -ne 1 -or
    $latestEngineCommit[0].Trim() -cne $promotionCommit -or $latestTestCommit[0].Trim() -cne $testCommit
) { throw 'A later commit touched promotion evidence Host paths' }
$actualPlanEPaths=@(& git diff --name-only --no-renames $planERange)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect reviewed Plan E range paths' }
if ($actualPlanEPaths.Count -ne 60) { throw 'Reviewed Plan E range is not 60 paths' }
foreach ($path in @(
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
    'host/update_engine.py',
    'host/test_update_engine_resume.py'
)) {
    if ($actualPlanEPaths -cnotcontains $path) { throw "Reviewed Plan E range omits $path" }
}
$expectedRangePaths=@(
    'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md',
    'docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md',
    'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md',
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
$missingRange=@($expectedRangePaths | Where-Object { $actualPlanEPaths -cnotcontains $_ })
$extraRange=@($actualPlanEPaths | Where-Object { $expectedRangePaths -cnotcontains $_ })
if ($missingRange.Count -ne 0 -or $extraRange.Count -ne 0 -or $actualPlanEPaths.Count -ne 60) {
    throw "Reviewed Plan E exact path mismatch. Missing: $($missingRange -join ', '); Extra: $($extraRange -join ', ')"
}
& git merge-base --is-ancestor $promotionCommit $planEHead
if ($LASTEXITCODE -ne 0) { throw 'Promotion commit is not included in reviewed head' }
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
$recheckPlanE='.superpowers/sdd/recheck-plan-e.diff'
$recheckWhole='.superpowers/sdd/recheck-whole.diff'
try {
    & git diff --full-index --binary $planERange --output=$recheckPlanE
    if ($LASTEXITCODE -ne 0) { throw 'Could not regenerate Plan E review diff' }
    & git diff --full-index --binary $wholeRange --output=$recheckWhole
    if ($LASTEXITCODE -ne 0) { throw 'Could not regenerate whole-branch review diff' }
    $planEHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/plan-e-only-review.diff').Hash
    $planERecheckHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $recheckPlanE).Hash
    $wholeHash=(Get-FileHash -Algorithm SHA256 -LiteralPath '.superpowers/sdd/original-whole-branch-interim-review.diff').Hash
    $wholeRecheckHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $recheckWhole).Hash
    if ($planEHash -cne $planERecheckHash) { throw 'Plan E review diff bytes are stale' }
    if ($wholeHash -cne $wholeRecheckHash) { throw 'Whole-branch review diff bytes are stale' }
} finally {
    Remove-Item -LiteralPath $recheckPlanE -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $recheckWhole -Force -ErrorAction SilentlyContinue
}
$currentProductHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve current product head' }
if ($currentProductHead.Count -ne 1) { throw 'Current product head is ambiguous' }
$currentProductHead=$currentProductHead[0].Trim()
if ($planEHead -ne $currentProductHead) {
    throw 'Review packages are stale relative to current product HEAD'
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
    'Review Base','Review Head','Review Range','Critical','Important',
    'Minor','Testing Gaps','Disposition'
)
$wholeSections=Read-ReviewSections -Text $wholeFindings -ExpectedHeadings @(
    'Review Base','Review Head','Review Range','Critical','Important',
    'Minor','Testing Gaps','Plan D Rerun Requirement','Disposition'
)
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
    ('**Integration base from plan-e-base.txt:** `' + $planEBase + '`'),
    ('**Final reviewed product head:** `' + $planEHead + '`')
)) {
    if ([regex]::Matches($evidence,'(?m)^' + [regex]::Escape($metadata) + '\r?$').Count -ne 1) {
        throw "Final evidence metadata mismatch: $metadata"
    }
}
foreach ($line in @(
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
$status=@(git status --short)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect evidence status' }
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
    '.superpowers/sdd/promotion-ast.sha256','.superpowers/sdd/plan-e-only-review-package.txt',
    '.superpowers/sdd/focused-extension-results.json','.superpowers/sdd/full-extension-results.json',
    '.superpowers/sdd/host-test-results.json','.superpowers/sdd/reviewed-head-verification.json',
    '.superpowers/sdd/plan-e-only-review.diff','.superpowers/sdd/plan-e-only-review-findings.md',
    '.superpowers/sdd/original-whole-branch-interim-review-package.txt',
    '.superpowers/sdd/original-whole-branch-interim-review.diff',
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
$roots += @(1..8 | ForEach-Object { ".superpowers/sdd/task-$_-report.md" })
$artifactRoot=Join-Path (Get-Location) '.superpowers/sdd'
$transcriptRoot=Join-Path $artifactRoot 'promotion-transcripts'
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
$managedLeafNames=@($roots | Where-Object { $_ -notlike '.superpowers/sdd/promotion-transcripts/*' } | ForEach-Object { [IO.Path]::GetFileName($_) })
$artifactEntries=@(Get-ChildItem -LiteralPath $artifactRoot -Force -Recurse)
$unsupportedManagedEntries=@($artifactEntries | Where-Object {
    $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/'); $artifactPath='.superpowers/sdd/' + $relative
    $managedTranscript=$relative -eq 'promotion-transcripts' -or $relative -like 'promotion-transcripts/*'; $managedName=$managedLeafNames -ccontains $_.Name
    ($managedTranscript -or $managedName) -and (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or ($managedName -and ($_ -isnot [IO.FileInfo] -or $roots -cnotcontains $artifactPath)))
})
$observedManagedFiles=@($artifactEntries | Where-Object { $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/'); $_ -is [IO.FileInfo] -and ($relative -like 'promotion-transcripts/*' -or $managedLeafNames -ccontains $_.Name) } | ForEach-Object { '.superpowers/sdd/' + [IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/') } | Sort-Object -Unique)
$missingManaged=@($roots | Where-Object { $observedManagedFiles -cnotcontains $_ }); $extraManaged=@($observedManagedFiles | Where-Object { $roots -cnotcontains $_ })
if ($unsupportedManagedEntries.Count -ne 0 -or $missingManaged.Count -ne 0 -or $extraManaged.Count -ne 0 -or $observedManagedFiles.Count -ne 58) { throw "Final artifact filesystem inventory mismatch. Missing: $($missingManaged -join ', '); Extra: $($extraManaged -join ', ')" }
$expectedManifest=[ordered]@{}
foreach ($path in $roots) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final artifact missing: $path" }
    $expectedManifest[$path]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
}
$manifestParser=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate key')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if type(value) is not dict or any(type(k) is not str or type(v) is not str for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonicalManifest=@($manifestText | & 'host\venv\Scripts\python.exe' -c $manifestParser)
if ($LASTEXITCODE -ne 0 -or $canonicalManifest.Count -ne 1 -or $manifestText -cne $canonicalManifest[0] + "`n") { throw 'Final artifact manifest is invalid or noncanonical' }
$manifest=$canonicalManifest[0] | ConvertFrom-Json -AsHashtable
if ($manifest.Count -ne 58 -or $expectedManifest.Count -ne 58) { throw 'Final artifact manifest count mismatch' }
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
git add -f .superpowers/sdd/plan-e-extension-hardening-report.md
if ($LASTEXITCODE -ne 0) { throw 'Could not stage evidence report' }
& git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Evidence staged diff check failed' }
$staged=@(git diff --cached --name-only --no-renames)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged evidence' }
if ($staged.Count -ne 1 -or $staged[0] -ne '.superpowers/sdd/plan-e-extension-hardening-report.md') {
    throw 'Evidence commit contains unexpected paths'
}
git commit -m "docs(verification): record Plan E hardening evidence"
if ($LASTEXITCODE -ne 0) { throw 'Evidence commit failed' }
```

Expected: all six ignored review artifacts exist; both packages record the same final committed reviewed product head; Plan-E findings are `PASS`; original-base findings are `INTERIM PASS THROUGH PLAN E` and retain the exact final-D rerun requirement. Staged name list contains only `.superpowers/sdd/plan-e-extension-hardening-report.md`; review packages/findings remain ignored and unstaged. The committed report records both observed literal ranges separately, so the later evidence commit does not invalidate either reviewed product range or depend on a surviving shell variable.

- [ ] **Step 11: Final readiness check**

```powershell
$ErrorActionPreference='Stop'
$base='0dbb4852931b50153fb898b03129ae0092c46404'
$baseBytes=[IO.File]::ReadAllBytes(
    (Join-Path (Get-Location) '.superpowers/sdd/plan-e-base.txt')
)
$expectedBaseBytes=[Text.UTF8Encoding]::new($false).GetBytes($base + "`n")
if ([Convert]::ToHexString($baseBytes) -cne [Convert]::ToHexString($expectedBaseBytes)) {
    throw 'Plan E base evidence is not the declared SHA plus LF'
}
$status=@(git status --short)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final status' }
git log -1 --oneline
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final commit' }
$finalHead=@(& git rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $finalHead.Count -ne 1) {
    throw 'Could not resolve final Plan E head'
}
$finalHead=$finalHead[0].Trim()
$finalSubject=@(& git show -s --format=%s $finalHead)
$finalParent=@(& git rev-parse "$finalHead^")
if (
    $LASTEXITCODE -ne 0 -or
    $finalSubject.Count -ne 1 -or
    $finalSubject[0] -cne 'docs(verification): record Plan E hardening evidence' -or
    $finalParent.Count -ne 1
) { throw 'Final HEAD is not the Plan E evidence commit' }
$package=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-package.txt'),[Text.UTF8Encoding]::new($false))
$reviewedHead=[regex]::Match($package,'(?m)^Review head: ([0-9a-f]{40})$').Groups[1].Value
if ($reviewedHead -notmatch '^[0-9a-f]{40}$' -or $finalParent[0].Trim() -cne $reviewedHead) {
    throw 'Evidence commit parent is not the reviewed product head'
}
$finalPaths=@(& git diff-tree --no-commit-id --name-only --no-renames -r $finalHead)
if ($LASTEXITCODE -ne 0 -or $finalPaths.Count -ne 1 -or $finalPaths[0] -cne '.superpowers/sdd/plan-e-extension-hardening-report.md') {
    throw 'Final evidence commit contains non-evidence paths'
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
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
foreach ($path in $artifactPaths) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Final evidence artifact missing: $path" }
    & git check-ignore -q -- $path
    if ($LASTEXITCODE -ne 0) { throw "Final evidence artifact is not ignored: $path" }
}
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
    if text!=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit(str(path)+' noncanonical')
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
text=path.read_text(encoding='utf-8'); value=json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
if text!=json.dumps(value,sort_keys=True,separators=(',',':'))+'\n': raise SystemExit('verification noncanonical')
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
for key in ('focused_extension','full_extension'):
    row=summary.get(key)
    if type(row) is not dict or set(row)!={'files','tests'} or any(type(row.get(name)) is not int or row[name]<1 for name in ('files','tests')): raise SystemExit('verification summary counters '+key)
host=summary.get('host')
if type(host) is not dict or set(host)!={'focused','full','update_engine','recovery','package'}: raise SystemExit('verification Host summary shape')
for key,row in host.items():
    if type(row) is not dict or set(row)!={'tests','skipped','skips'} or type(row.get('tests')) is not int or row['tests']<1 or type(row.get('skipped')) is not int or row['skipped']<0 or row['skipped']>row['tests'] or type(row.get('skips')) is not list or len(row['skips'])!=row['skipped']: raise SystemExit('verification Host summary counters '+key)
'@
& 'host\venv\Scripts\python.exe' -c $finalVerificationParser $finalVerificationPath $reviewedHead
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
$finalExpectedFull=@(& git ls-tree -r --name-only $reviewedHead -- extension/src | Where-Object { $_ -match '\.test\.tsx?$' } | ForEach-Object { $_ -replace '^extension/','' })
if ($LASTEXITCODE -ne 0 -or $finalExpectedFull.Count -lt 1) { throw 'Could not inventory final reviewed Extension tests' }
$finalStrictTest=@($strictTestMatch.Groups[1].Value | & 'host\venv\Scripts\python.exe' - '.superpowers/sdd/focused-extension-results.json' '.superpowers/sdd/full-extension-results.json' '.superpowers/sdd/host-test-results.json' '.superpowers/sdd/reviewed-head-verification.json' $reviewedHead @finalExpectedFocused '--full' @finalExpectedFull)
if ($LASTEXITCODE -ne 0 -or $finalStrictTest.Count -ne 1) { throw 'Final strict Vitest/Host evidence validation failed' }
$manifestPath='.superpowers/sdd/final-artifacts.sha256.json'
$manifestText=[IO.File]::ReadAllText((Join-Path (Get-Location) $manifestPath),[Text.UTF8Encoding]::new($false))
$manifestParser=@'
import json,sys
def pairs(rows):
    out={}
    for key,value in rows:
        if key in out: raise ValueError('duplicate')
        out[key]=value
    return out
def reject_constant(value): raise ValueError('non-finite JSON constant: '+value)
value=json.loads(sys.stdin.read(),object_pairs_hook=pairs,parse_constant=reject_constant)
if not isinstance(value,dict) or any(type(k) is not str or type(v) is not str for k,v in value.items()): raise SystemExit('invalid manifest')
print(json.dumps(value,sort_keys=True,separators=(',',':')))
'@
$canonicalManifest=@($manifestText | & 'host\venv\Scripts\python.exe' -c $manifestParser)
if ($LASTEXITCODE -ne 0 -or $canonicalManifest.Count -ne 1 -or $manifestText -cne $canonicalManifest[0] + "`n") { throw 'Final artifact manifest invalid or noncanonical' }
$manifest=$canonicalManifest[0] | ConvertFrom-Json -AsHashtable
if ($manifest.Count -ne 58) { throw 'Final artifact manifest count mismatch' }
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
    '.superpowers/sdd/original-whole-branch-interim-review-findings.md'
)
$finalExpectedArtifacts += @(1..8 | ForEach-Object { ".superpowers/sdd/task-$_-report.md" })
$artifactRoot=Join-Path (Get-Location) '.superpowers/sdd'
$transcriptRoot=Join-Path $artifactRoot 'promotion-transcripts'
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
$managedLeafNames=@($finalExpectedArtifacts | Where-Object { $_ -notlike '.superpowers/sdd/promotion-transcripts/*' } | ForEach-Object { [IO.Path]::GetFileName($_) })
$artifactEntries=@(Get-ChildItem -LiteralPath $artifactRoot -Force -Recurse)
$unsupportedManagedEntries=@($artifactEntries | Where-Object {
    $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/'); $artifactPath='.superpowers/sdd/' + $relative
    $managedTranscript=$relative -eq 'promotion-transcripts' -or $relative -like 'promotion-transcripts/*'; $managedName=$managedLeafNames -ccontains $_.Name
    ($managedTranscript -or $managedName) -and (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or ($managedName -and ($_ -isnot [IO.FileInfo] -or $finalExpectedArtifacts -cnotcontains $artifactPath)))
})
$observedManagedFiles=@($artifactEntries | Where-Object { $relative=[IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/'); $_ -is [IO.FileInfo] -and ($relative -like 'promotion-transcripts/*' -or $managedLeafNames -ccontains $_.Name) } | ForEach-Object { '.superpowers/sdd/' + [IO.Path]::GetRelativePath($artifactRoot,$_.FullName).Replace('\','/') } | Sort-Object -Unique)
$missingManaged=@($finalExpectedArtifacts | Where-Object { $observedManagedFiles -cnotcontains $_ }); $extraManaged=@($observedManagedFiles | Where-Object { $finalExpectedArtifacts -cnotcontains $_ })
if ($unsupportedManagedEntries.Count -ne 0 -or $missingManaged.Count -ne 0 -or $extraManaged.Count -ne 0 -or $observedManagedFiles.Count -ne 58) { throw "Final-readiness artifact filesystem inventory mismatch. Missing: $($missingManaged -join ', '); Extra: $($extraManaged -join ', ')" }
$missingManifest=@($finalExpectedArtifacts | Where-Object { -not $manifest.ContainsKey($_) })
$extraManifest=@($manifest.Keys | Where-Object { $finalExpectedArtifacts -cnotcontains $_ })
if ($finalExpectedArtifacts.Count -ne 58 -or $missingManifest.Count -ne 0 -or $extraManifest.Count -ne 0) {
    throw "Final artifact manifest path set mismatch. Missing: $($missingManifest -join ', '); Extra: $($extraManifest -join ', ')"
}
foreach ($entry in $manifest.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key -PathType Leaf)) { throw "Manifest artifact missing: $($entry.Key)" }
    $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Key).Hash.ToLowerInvariant()
    if ($actual -cne $entry.Value) { throw "Manifest artifact drift: $($entry.Key)" }
}
$manifestHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
$manifestLine=('**Final artifact manifest SHA-256:** `' + $manifestHash + '`')
if ([regex]::Matches($committedEvidence,'(?m)^' + [regex]::Escape($manifestLine) + '$').Count -ne 1) {
    throw 'Committed evidence manifest hash mismatch'
}
$planEFindings=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-e-only-review-findings.md'),[Text.UTF8Encoding]::new($false))
$wholeFindings=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/original-whole-branch-interim-review-findings.md'),[Text.UTF8Encoding]::new($false))
if ($planEFindings -notmatch '(?m)^## Disposition\r?\nPASS\r?$' -or $wholeFindings -notmatch '(?m)^## Disposition\r?\nINTERIM PASS THROUGH PLAN E\r?$') {
    throw 'Final controller findings disposition changed'
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
$trackedPlanEPaths=@(& git diff --name-only --no-renames "$base..$finalHead")
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final Plan E paths' }
$dirtyPlanEPaths=@(& git status --porcelain=v1 --untracked-files=all -- $trackedPlanEPaths)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect final Plan E path status' }
if ($dirtyPlanEPaths.Count -ne 0) { throw 'A final Plan E path is dirty' }
git diff --check "$base..$finalHead"
if ($LASTEXITCODE -ne 0) { throw 'Final Plan E diff check failed' }
```

Expected: no tracked product/test dependency in the literal tested-source roots is dirty or differs from the reviewed product head; unrelated pre-existing plan files and ignored review artifacts may remain; latest commit is evidence; Plan E-only `$base..HEAD` passes. Plan E is review-ready, while final whole-branch review remains explicitly pending the required original-base-to-final-D-head rerun. Do not push, tag, publish, package, update, install, or modify real user state.

---

## Plan Self-Review Checklist

- [ ] Sections 6.1-6.3 map to Tasks 1-3, including strict schema/no ID, safe unknown own data, depth/cycle/no coercion, discriminated reads, authoritative empty, changed/304 team-cache parsing, external import validation, and one-set Reset with explicit supersession.
- [ ] `BookmarkLoadResult` is exactly `loaded|invalid|failed`; every caller narrows `loaded` before `items/source`; team-collapse removal failures retain Reset local cleanup and never replace bookmarks.
- [ ] Sections 7.1-7.2 map to Tasks 4-5, including mandatory top-level `requestId`/`_persist`, stripping `_persist` plus caller warnings, strict `{markdown:string,saved_to?:string}`, prewritten FAB RED cases, fixed malformed errors, no serialization, fixed warning order, three cleanup attempts, and non-masking Host outcomes.
- [ ] The approved Plan E correction maps to Task 1's sole generic `ownDataProperty`, Task 5's fresh frozen non-Analyze snapshot, parser-payload/final-wire inert `toJSON` shadows, safe request-ID augmentation, register-before-post, and one unregister on post failure.
- [ ] The authorized Windows promotion correction maps to Task 9 Step 0's frozen constructor, three private seams, three-attempt `5/32/33` retry, `0.05/0.2` sleeper arguments, complete initial/pre-sleep/post-sleep revalidation, hook order, one test-only RED commit followed directly by one production-only commit, expanded Host gates, and 60-path reviews.
- [ ] Task 4's first and ownership REDs use namespace/runtime-key access for new exports in existing `analysisStore.ts`; every intended title collects and fails an assertion, never module linking or missing-export collection.
- [ ] Task 5 freezes one-snapshot exact payload/action parse, one atomic transport acquisition, start, and leased-send behavior; invalid/denied requests perform no persistence/send, disconnect cannot reacquire/reconnect under prior authorization, and non-Analyze messages never return or send their source object.
- [ ] Sections 8.1-8.2 map to Task 4, including one pending+owner start write, latest-started singleton, request-only cleanup, strict persisted schemas, legacy records, duration zero, and Reset owner removal.
- [ ] Sections 9.1-9.2 map to Tasks 6-7, including descriptor-safe identity/plain scrape snapshots, case-first/title fallback, busy identity-only scans, post-run full scan, no old-case visible UI, pure context-menu boundary, immutable per-request Root, explicit empty, and old Host fallback.
- [ ] Busy A-to-B identity records origin request/identity and a change flag; post-run scan forcibly replaces user-edited A with B and clears edit/auto-analysis flags.
- [ ] Sections 10.1-10.2 map to Task 8's Plan E-owned helper, baseline runtime/tab/DOM delivery, raw-data non-observability, exact config matrix, and retryable revisions.
- [ ] Task 8 records helper and baseline Options/content-bridge/FAB RED/GREEN; downstream-plan sentinels remain absent and only the handoff contract is documented.
- [ ] Missing-module RED is used once only for `ownData.ts`, `bookmarkItems.ts`, `analyzeRequestHandler.ts`, `pageIdentity.ts`, `analyzeRequest.ts`, and `nativeUpdateError.ts`; `nativeMessageWire.ts`, ResultPopover/content bridge, and every subsequent RED import successfully and fail named assertions.
- [ ] Sections 11 and 13 Plan E map to every task's RED/GREEN/mutation/commit gates, Task 9's Plan-E-only review from immutable `0dbb4852931b50153fb898b03129ae0092c46404` to a resolved literal review head, and the separate interim original whole-branch review from `0040b1de1bc196b203014a8e4f94a53babb7e9aa` to that same literal head.
- [ ] Plan-E-only and original-base findings are recorded in separate ignored files and separate report sections; Plan E never claims the original whole-branch review is final, and Plan D must rerun it through `<final-D-head>`.
- [ ] Every temp/environment command is self-contained with same-block `try/finally` restoration; later commands reread known evidence files instead of reusing shell variables.
- [ ] Plan D handoff marks the current D document stale and tells the later coordinator extraction to route Analyze through `handleAnalyzeRequest(inner,{acquireAuthorizedTransport})`, never bypass parser/acquisition or reuse authorization across port identities, use only `guarded.forwarded` for non-Analyze acquisition, preserve `postNativeMessageWire` semantics on the leased port, and replace current direct-port/UI-owned update behavior while preserving Plan E contracts.
- [ ] Every created/modified/deleted file is listed, every cross-task symbol has one exact signature, every Task 1-8 commit and the Task 9 promotion commit compare the full staged set to their exact allowlists, and no implementation step leaves an unresolved authoring marker.
