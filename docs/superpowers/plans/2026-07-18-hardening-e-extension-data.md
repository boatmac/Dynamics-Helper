# Plan E Extension Data and Request Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bookmark, Analyze, SPA identity, per-request Root, update-error, and config-acknowledgment boundaries strict and non-destructive without changing the approved Prompt Scope Cleanup product contract.

**Architecture:** Small shared parsers turn untrusted Chrome storage, packaged JSON, Native Messaging, DOM identity, and update events into explicit typed values before consumers act. One shared own-data primitive underlies the single-property trust boundaries; a frozen shallow non-Analyze snapshot and a pure final-wire sender close mutation, request-ID augmentation, and Native serialization gaps without recursively migrating legacy payloads. A pure Plan E-owned Analyze request handler constructs one exact three-property inner action, atomically acquires an authorized transport lease for that action, then delegates the lease-bound send plus frozen persistence context to the bridge that owns start/completion. The baseline Service Worker supplies an allow-all lease around its current sender; later Plan D must supply a port-specific gated lease without reconnecting under an old authorization. FAB separates live page identity from editable context and forces post-run replacement after a busy identity switch. Plan E exclusively creates and freezes `nativeUpdateError.ts`; later Plan D consumes these contracts while extracting ports and update coordination.

**Tech Stack:** React 19, TypeScript 5.9 strict mode, Chrome Manifest V3 APIs, Vitest 3 with Testing Library/jsdom, Python 3.13 `unittest`, Copilot SDK 1.0.5

## Global Constraints

- Work only in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`. Execution order is frozen: `A -> B -> C -> E -> D`.
- Plan E precondition: reviewed committed Plans A-C are HEAD ancestors; Plan D has not started and none of `extension/src/background/nativePortClient.ts`, `hostGate.ts`, `updateProtocol.ts`, `updateCoordinator.ts`, or `serviceWorker.update.test.ts` exists. Stop on any mismatch; no alternate order is supported.
- Tasks 1-8 remain governed by authoritative spec sections 6-10, 11, and 13 Plan E plus `docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md`, `docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`, and the historical requirements in `docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md` that apply to those completed tasks.
- Task 9 is governed by the latest accepted `docs/superpowers/specs/2026-08-24-plan-e-task-9-evidence-correction-design.md`. For Task 9 only, it supersedes evidence orchestration, artifact-count/inventory, review-count/format, and exact historical promotion-payload requirements from `docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md`, `docs/superpowers/specs/2026-08-21-plan-e-executor-boundary-correction-design.md`, `docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md`, and `docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md`. It preserves the Windows retry product behavior, genuine RED/GREEN/mutation obligations, and all historical-evidence honesty requirements.
- Task 6/7 reports remain unavailable with their accepted hashes; no current test, audit, or narrative may be represented as reconstructed historical evidence. Task 1-5/8 instructions and completed product contracts remain intact.
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
- Task 9 may change only its plan, forward-delete `plan_e_evidence.py` and `host/test_plan_e_evidence.py`, add the retry tests in `host/test_update_engine_resume.py`, add the retry implementation in `host/update_engine.py`, and create `.superpowers/sdd/plan-e-extension-hardening-report.md`. It changes no Task 6/7 product behavior.
- Tasks 1-8 retain their existing independently reviewable commits. Task 9 uses five normal forward commits after the accepted correction: the one-path plan commit `docs(update): simplify Plan E Task 9`, exact two-path deletion commit `chore(evidence): remove abandoned Plan E executor`, test-only RED commit `test(update): cover locked preparing promotion`, production-only GREEN commit `fix(update): retry locked preparing promotion`, then the one-report-path commit `docs(verification): record Plan E hardening evidence`.
- Every Task 9 command is an independent one-line PowerShell invocation. Task 9 has no persistent orchestration process or lock and no cross-command shell state, custom Git finalization, or generated evidence collection. Task 9 TypeScript checks use the absolute lock-installed local Node/TypeScript entry; tests and builds use lock-installed npm scripts only. Tasks 1-8 retain their historical command requirements.
- Every filtered Vitest command uses `--reporter=verbose`, titles declared verbatim in the preceding test-writing step, and explicit expected exit handling. “No tests found,” zero matched tests, or unrelated import/configuration failure is never evidence.
- Missing-module import failure is acceptable exactly once as the isolated first RED for each of these six new production modules: `extension/src/utils/ownData.ts`, `extension/src/utils/bookmarkItems.ts`, `extension/src/background/analyzeRequestHandler.ts`, `extension/src/utils/pageIdentity.ts`, `extension/src/utils/analyzeRequest.ts`, and `extension/src/utils/nativeUpdateError.ts`. No other missing module/export is valid RED. After each first import RED, create the task's specified compile-only shell or implementation before any behavioral/multi-file RED; every subsequent RED must import successfully, execute the named test, and fail its assertion. `extension/src/background/nativeMessageWire.ts`, `extension/src/components/ResultPopover.tsx`, and `extension/src/content/updateErrorBridge.ts` are deliberately created as compile-only shells before their first test runs, so their imports may never be used as RED evidence.
- A new export added to an existing module is never valid module-link RED evidence. Before its first run, either add a compile-only production export shell or import the existing module as a namespace, access the candidate through a runtime string key, and fail a named existence/behavior assertion after collection. Task 4 uses and retains namespace access through all parser/ownership RED phases.
- Treat every shell fence/tool call as a fresh process unless its own text explicitly owns setup and cleanup in one foreground invocation. Run Task 9 commands independently from the repository root; each command initializes every value it uses.
- Task 9 must not use package-exec or network fallback. Use only lock-installed npm scripts or absolute local Node, TypeScript, Vitest, and Python entries named in Task 9. This Task 9 override does not retroactively alter Tasks 1-8 command transcripts.

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
- `.superpowers/sdd/plan-e-extension-hardening-report.md`: the only new Task 9 evidence file; create after verification/review and force-add exactly this one path.
- Existing ignored Task 1-5/8 reports and other diagnostic files may remain as historical context. Task 9 does not modify, enumerate, regenerate, stage, commit, or depend on them for final readiness.
- The Task 6 and Task 7 report paths are accepted historical identities only. They remain absent because no complete bytes matching their locked SHA-256 values were recovered; do not create, approximate, summarize, or stage them.

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

### Deleted files

- `extension/src/components/FAB.rootPathOverride.test.ts`: it asserts the persistent override lifetime that Plan E removes.
- The root-level abandoned Plan E evidence-executor module and its Host test module are removed together by the visible Task 9 forward-deletion commit.

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

## Task 9: Windows Preparing-Promotion Retry and Final Evidence

> **Implementation worker:** Use `superpowers:test-driven-development` for the
> retry, `superpowers:verification-before-completion` before completion claims,
> and `superpowers:requesting-code-review` for the independent review. This
> section supersedes every earlier Task 9 instruction. Tasks 1-8 remain
> byte-identical historical instructions.

### 9.1 Authority, Safety, and Exact Scope

The controlling design is
`docs/superpowers/specs/2026-08-24-plan-e-task-9-evidence-correction-design.md`
at exact commit `b77deeec53e3ac8910e8f4542dad877248a5b12a`. The Windows
product contract remains
`docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md`
at exact commit `249b1a3750b50db1336fb39661db9306355a1a18`.

This documentation-only edit changes exactly this plan path. Commit it now with
exact subject `docs(update): simplify Plan E Task 9`; it must be the direct child
of the authority commit. Do not include any other path.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $path='docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md'; $dirty=@(& $git -C $root status --porcelain=v1 -uall); if($dirty.Count -ne 1 -or $dirty[0].Substring(3) -cne $path){ throw 'Plan commit worktree mismatch' }; & $git -C $root add -- $path; if($LASTEXITCODE -ne 0){ throw 'Could not stage Task 9 plan' }; $staged=@(& $git -C $root diff --cached --name-only --); if($staged.Count -ne 1 -or $staged[0] -cne $path){ throw 'Task 9 plan staged path mismatch' }; & $git -C $root diff --cached --check; if($LASTEXITCODE -ne 0){ throw 'Task 9 plan diff check failed' }; & $git -C $root commit -m 'docs(update): simplify Plan E Task 9'; if($LASTEXITCODE -ne 0){ throw 'Task 9 plan commit failed' }
```

Expected: one normal commit changes only this plan. Do not continue if the
commit fails or if any other path is staged.

The committed plan must be the one-path direct child of
`b77deeec53e3ac8910e8f4542dad877248a5b12a` with exact subject
`docs(update): simplify Plan E Task 9`. Before any later edit, verify both
authority commits, the plan lineage, its sole path, the absence of Task 6/7
report paths, and clean status:

Run this preflight only after committing the plan; before that commit, its clean
status and HEAD assertions are intentionally not yet true.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $authority='b77deeec53e3ac8910e8f4542dad877248a5b12a'; $retry='249b1a3750b50db1336fb39661db9306355a1a18'; $authoritySubject=(& $git -C $root show -s --format=%s $authority).Trim(); $authorityPaths=@(& $git -C $root diff-tree --no-commit-id --name-only -r $authority); $retrySubject=(& $git -C $root show -s --format=%s $retry).Trim(); $retryPaths=@(& $git -C $root diff-tree --no-commit-id --name-only -r $retry); if ($authoritySubject -cne 'docs(evidence): simplify Plan E verification' -or $authorityPaths.Count -ne 1 -or $authorityPaths[0] -cne 'docs/superpowers/specs/2026-08-24-plan-e-task-9-evidence-correction-design.md' -or $retrySubject -cne 'docs(update): define Windows promotion retry' -or $retryPaths.Count -ne 1 -or $retryPaths[0] -cne 'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md') { throw 'Task 9 authority identity mismatch' }; $head=(& $git -C $root rev-parse HEAD).Trim(); $parent=(& $git -C $root rev-parse HEAD^).Trim(); $subject=(& $git -C $root show -s --format=%s HEAD).Trim(); $paths=@(& $git -C $root diff-tree --no-commit-id --name-only -r HEAD); if ($parent -cne $authority -or $subject -cne 'docs(update): simplify Plan E Task 9' -or $paths.Count -ne 1 -or $paths[0] -cne 'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md') { throw 'Task 9 plan commit identity mismatch' }; & $git -C $root diff --quiet "$authority..$head" -- 'docs/superpowers/specs/2026-08-24-plan-e-task-9-evidence-correction-design.md'; if ($LASTEXITCODE -ne 0) { throw 'Authority spec changed after acceptance' }; & $git -C $root diff --quiet "$retry..$head" -- 'docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md'; if ($LASTEXITCODE -ne 0) { throw 'Windows retry design changed after acceptance' }; foreach($missing in @('.superpowers/sdd/task-6-report.md','.superpowers/sdd/task-7-report.md')){ if(Test-Path -LiteralPath (Join-Path $root $missing)){ throw "$missing must remain absent" } }; if (@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0) { throw 'Worktree must be clean' }
```

Expected: exit `0`, no output. Stop on any mismatch. Keep every later commit a
normal forward commit; never reset, amend, rebase, squash, or rewrite history.

The plan itself is committed first. After that commit, only these paths may
change in Task 9, in this order:

1. Delete `plan_e_evidence.py` and `host/test_plan_e_evidence.py` together.
2. Modify `host/test_update_engine_resume.py` for RED.
3. Modify `host/update_engine.py` for GREEN.
4. Add `.superpowers/sdd/plan-e-extension-hardening-report.md` last.

Do not modify product versions, dependencies, release/package inputs, installer,
registry code, Plan D files, accepted specs, or Tasks 1-8. Never read or mutate
real `%LOCALAPPDATA%`, registry, browser, installed product, update, release,
network, MyCases, or authenticated model state. Never delete recovery sources.

Historical Task 1-5/8 reports may remain as ignored diagnostic files. Do not
alter or newly commit them, and do not make final readiness depend on them. No
new evidence artifact list or hash catalog is produced; the
final report may cite one only as optional context. Do not create Task
6/7 substitutes. Preserve these exact facts:

```text
Task 6 expected SHA-256: 3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef
Task 7 expected SHA-256: 49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f
Availability: UNRECOVERABLE
HISTORICAL TDD TIMELINE NOT RECONSTRUCTED
```

Current tests prove current behavior only. They do not reconstruct historical
RED, GREEN, mutation, edit-order, review, or TDD chronology. Do not search for,
restore, move, or delete possible recovery copies while executing this task.

### 9.2 Remove the Abandoned Evidence Executor

- [ ] **Step 1: Delete exactly the abandoned executor and its test**

Use `apply_patch` to delete exactly:

```text
plan_e_evidence.py
host/test_plan_e_evidence.py
```

Commit `ed06da102e3c11cfe53ec17ef50e97252037f624` remains visible history. It is
an abandoned RED attempt for the superseded executor architecture, never reached
GREEN, and provides no Windows-retry or product-completion evidence. Do not
reset, amend, rebase, squash, or otherwise hide it.

- [ ] **Step 2: Verify and commit the two deletions**

The pre-commit check below inspects the complete dirty and staged sets, not a
deletion-filtered subset; each of the two status entries must be an exact delete.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $authority='b77deeec53e3ac8910e8f4542dad877248a5b12a'; $planHead=(& $git -C $root rev-parse HEAD).Trim(); $planParent=(& $git -C $root rev-parse HEAD^).Trim(); $planSubject=(& $git -C $root show -s --format=%s HEAD).Trim(); $planRows=@(& $git -C $root diff-tree --no-commit-id --name-status --no-renames -r HEAD); if($planParent -cne $authority -or $planSubject -cne 'docs(update): simplify Plan E Task 9' -or $planRows.Count -ne 1 -or $planRows[0] -cne "M`tdocs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"){ throw 'Executor deletion parent plan mismatch' }; $expected=@('host/test_plan_e_evidence.py','plan_e_evidence.py'); $dirty=@(& $git -C $root status --porcelain=v1 -uall); if($dirty.Count -ne 2 -or @($dirty | Where-Object { $_.Substring(0,2) -cne ' D' }).Count -ne 0 -or (Compare-Object $expected @($dirty | ForEach-Object { $_.Substring(3) }) -CaseSensitive)){ throw 'Executor deletion worktree mismatch' }; & $git -C $root add -- 'host/test_plan_e_evidence.py' 'plan_e_evidence.py'; if ($LASTEXITCODE -ne 0) { throw 'Could not stage executor deletions' }; $staged=@(& $git -C $root diff --cached --name-status --no-renames --); $expectedStaged=@("D`thost/test_plan_e_evidence.py","D`tplan_e_evidence.py"); if ($staged.Count -ne 2 -or (Compare-Object $expectedStaged $staged -CaseSensitive)) { throw 'Staged executor deletion set/status mismatch' }; & $git -C $root diff --cached --check; if ($LASTEXITCODE -ne 0) { throw 'Executor deletion diff check failed' }
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" commit -m "chore(evidence): remove abandoned Plan E executor"
```

Expected: the commit contains exactly two paths and both status codes are `D`.
The command verifies its subject, all commit paths/statuses, clean state, and
that both paths are absent at `HEAD`.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $authority='b77deeec53e3ac8910e8f4542dad877248a5b12a'; $subject=(& $git -C $root show -s --format=%s HEAD).Trim(); $parent=(& $git -C $root rev-parse HEAD^).Trim(); $parentParent=(& $git -C $root rev-parse HEAD^^).Trim(); $parentSubject=(& $git -C $root show -s --format=%s $parent).Trim(); $parentRows=@(& $git -C $root diff-tree --no-commit-id --name-status --no-renames -r $parent); $rows=@(& $git -C $root diff-tree --no-commit-id --name-status --no-renames -r HEAD); $expected=@("D`thost/test_plan_e_evidence.py","D`tplan_e_evidence.py"); if ($subject -cne 'chore(evidence): remove abandoned Plan E executor' -or $parentParent -cne $authority -or $parentSubject -cne 'docs(update): simplify Plan E Task 9' -or $parentRows.Count -ne 1 -or $parentRows[0] -cne "M`tdocs/superpowers/plans/2026-07-18-hardening-e-extension-data.md" -or $rows.Count -ne 2 -or (Compare-Object $expected $rows -CaseSensitive)) { throw "Executor deletion commit/parent mismatch: $($rows -join ', ')" }; foreach($path in @('host/test_plan_e_evidence.py','plan_e_evidence.py')){ & $git -C $root cat-file -e "HEAD:$path" 2>$null; if($LASTEXITCODE -eq 0){ throw "$path still exists in HEAD" } }; if(@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw 'Worktree is not clean after executor deletion' }
```

- [ ] **Step 3: Prove the retirement survives a new process and clean clone**

Run the first check through a new PowerShell process. It proves no executor process,
tracked/runtime path, temporary root, or extra worktree remains. Historical documentation
references are permitted; runtime, test-discovery, build, and release code references are not:

```powershell
& "C:\Program Files\PowerShell\7\pwsh.exe" -NoProfile -NonInteractive -Command '$ErrorActionPreference="Stop"; $root="C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec"; $tempParent="C:\Users\zhaobo\AppData\Local\Temp\opencode"; $staleRetirement=@(Get-ChildItem -LiteralPath $tempParent -Force | Where-Object { $_.Name -like "plan-e-retirement-clone-*" -or $_.Name -like "plan-e-retirement-pycache-*" -or $_.Name -like "plan-e-retirement-stage-*" }); if($staleRetirement.Count -ne 0){ throw "stale retirement temp roots require manual inspection/authorization: $($staleRetirement.FullName -join " | ")" }; $git="C:\Program Files\Git\cmd\git.exe"; $paths=@("plan_e_evidence.py","host/test_plan_e_evidence.py"); foreach($path in $paths){ if(Test-Path -LiteralPath (Join-Path $root $path)){ throw "retired path remains: $path" }; & $git -C $root cat-file -e "HEAD:$path" 2>$null; if($LASTEXITCODE -eq 0){ throw "retired path remains in HEAD: $path" } }; $runtimeRefs=@(& $git -C $root grep -n -e plan_e_evidence HEAD -- host extension release_helper.py 2>$null); if($LASTEXITCODE -notin @(0,1) -or $runtimeRefs.Count -ne 0){ throw "runtime/build/release reference remains: $($runtimeRefs -join " | ")" }; $processes=@(Get-CimInstance Win32_Process | Where-Object { $_.Name -match "^(python|pythonw)\.exe$" -and $_.CommandLine -match "(?:plan_e_evidence\.py|host\.test_plan_e_evidence)" }); if($processes.Count -ne 0){ throw "executor process remains: $($processes.ProcessId -join ",")" }; $common=[IO.Path]::GetFullPath((Join-Path $root ((& $git -C $root rev-parse --git-common-dir).Trim()))); $commonResidue=@(Get-ChildItem -LiteralPath $common -Force | Where-Object { $_.Name -like "plan-e-evidence*" -or $_.Name -like ".plan-e-evidence*" }); $repoResidue=@(Get-ChildItem -LiteralPath (Split-Path -Parent $root) -Force | Where-Object { $_.Name -like ".Dynamics-Helper-prompt-scope-spec-plan-e-*" }); $sdd=Join-Path $root ".superpowers\sdd"; $sddResidue=if(Test-Path -LiteralPath $sdd){ @(Get-ChildItem -LiteralPath $sdd -Force | Where-Object { $_.Name -like ".task-*-audit-evidence.*.tmp" -or $_.Name -like ".plan-e-*.tmp" }) }else{@()}; $pycResidue=@(); foreach($cache in @((Join-Path $root "__pycache__"),(Join-Path $root "host\__pycache__"))){ if(Test-Path -LiteralPath $cache){ $pycResidue+=@(Get-ChildItem -LiteralPath $cache -Force -File | Where-Object { $_.Name -like "plan_e_evidence*.pyc" -or $_.Name -like "test_plan_e_evidence*.pyc" }) } }; $residue=@($commonResidue+$repoResidue+$sddResidue+$pycResidue); if($residue.Count -ne 0){ throw "executor residue remains: $($residue.FullName -join " | ")" }; $worktrees=@(& $git -C $root worktree list --porcelain | Where-Object { $_ -like "worktree *" }); if($worktrees.Count -ne 1 -or [IO.Path]::GetFullPath($worktrees[0].Substring(9)) -cne [IO.Path]::GetFullPath($root)){ throw "unexpected worktree registration: $($worktrees -join " | ")" }; if(@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw "retired checkout is dirty" }; "Executor retirement fresh-process check: PASS"'
```

Expected: exactly `Executor retirement fresh-process check: PASS`.

Then verify a clean local clone using the existing Host venv only as a Python interpreter.
The clone receives no ignored files or venv; bytecode goes to the owned temporary root.
The check compiles Host source and runs the release-helper tests that lock release staging:

```powershell
$ErrorActionPreference='Stop'; $source='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $tempParent='C:\Users\zhaobo\AppData\Local\Temp\opencode'; $staleRetirement=@(Get-ChildItem -LiteralPath $tempParent -Force | Where-Object { $_.Name -like 'plan-e-retirement-clone-*' -or $_.Name -like 'plan-e-retirement-pycache-*' -or $_.Name -like 'plan-e-retirement-stage-*' }); if($staleRetirement.Count -ne 0){ throw "stale retirement temp roots require manual inspection/authorization: $($staleRetirement.FullName -join ' | ')" }; $clone=Join-Path $tempParent ('plan-e-retirement-clone-'+[guid]::NewGuid().ToString('N')); $cache=Join-Path $tempParent ('plan-e-retirement-pycache-'+[guid]::NewGuid().ToString('N')); $stage=Join-Path $tempParent ('plan-e-retirement-stage-'+[guid]::NewGuid().ToString('N')); $git='C:\Program Files\Git\cmd\git.exe'; $python=Join-Path $source 'host\venv\Scripts\python.exe'; $processEnv=[Environment]::GetEnvironmentVariables('Process'); $cachePresent=$processEnv.Contains('PYTHONPYCACHEPREFIX'); $cacheSaved=if($cachePresent){[string]$processEnv['PYTHONPYCACHEPREFIX']}else{$null}; try { & $git clone --quiet --no-hardlinks --no-local $source $clone; if($LASTEXITCODE -ne 0){ throw 'retirement verification clone failed' }; if(@(& $git -C $clone status --porcelain=v1 -uall).Count -ne 0){ throw 'verification clone is dirty' }; foreach($path in @('plan_e_evidence.py','host/test_plan_e_evidence.py')){ if(Test-Path -LiteralPath (Join-Path $clone $path)){ throw "retired path exists in clone: $path" } }; $refs=@(& $git -C $clone grep -n -e plan_e_evidence HEAD -- host extension release_helper.py 2>$null); if($LASTEXITCODE -notin @(0,1) -or $refs.Count -ne 0){ throw "clone runtime/build/release reference remains: $($refs -join ' | ')" }; New-Item -ItemType Directory -Path $cache | Out-Null; $env:PYTHONPYCACHEPREFIX=$cache; & $python -m compileall -q (Join-Path $clone 'host'); if($LASTEXITCODE -ne 0){ throw 'clone Host compile failed' }; & $python -c "exec(__import__('base64').b64decode('ZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCmltcG9ydCBzeXMKCmNsb25lID0gUGF0aChzeXMuYXJndlsxXSkucmVzb2x2ZShzdHJpY3Q9VHJ1ZSkKd29yayA9IFBhdGgoc3lzLmFyZ3ZbMl0pCnN5cy5wYXRoWzowXSA9IFtzdHIoY2xvbmUpLCBzdHIoY2xvbmUgLyAiaG9zdCIpXQppbXBvcnQgcmVsZWFzZV9oZWxwZXIKCmlmIFBhdGgocmVsZWFzZV9oZWxwZXIuX19maWxlX18pLnJlc29sdmUoKSAhPSAoY2xvbmUgLyAicmVsZWFzZV9oZWxwZXIucHkiKS5yZXNvbHZlKCk6CiAgICByYWlzZSBBc3NlcnRpb25FcnJvcigicmVsZWFzZV9oZWxwZXIgd2FzIG5vdCBpbXBvcnRlZCBmcm9tIHRoZSBjbGVhbiBjbG9uZSIpCgp3b3JrLm1rZGlyKCkKc291cmNlID0gd29yayAvICJzb3VyY2UiCnN0YWdlID0gd29yayAvICJzdGFnZWQiCmZpbGVzID0gewogICAgImV4dGVuc2lvbi9kaXN0L21hbmlmZXN0Lmpzb24iOiBiJ3sidmVyc2lvbiI6IjIuMC43NCIsInZlcnNpb25fbmFtZSI6IjIuMC43NC1iZXRhLjQifVxuJywKICAgICJleHRlbnNpb24vZGlzdC9hc3NldHMvYXBwLmpzIjogYiJhcHAiLAogICAgImRpc3QvZGhfbmF0aXZlX2hvc3QvZGhfbmF0aXZlX2hvc3QuZXhlIjogYiJob3N0LWV4ZSIsCiAgICAiZGlzdC9kaF9uYXRpdmVfaG9zdC9faW50ZXJuYWwvcHl0aG9uMzEzLmRsbCI6IGIicnVudGltZSIsCiAgICAiaG9zdC9jb25maWcuanNvbiI6IGIie31cbiIsCiAgICAiaG9zdC9zeXN0ZW1fcHJvbXB0Lm1kIjogYiJjb3JlIiwKICAgICJob3N0L3JlZ2lzdGVyLnB5IjogYiJyZWdpc3RlciIsCiAgICAiaW5zdGFsbGVyX2NvcmUucHMxIjogYiJpbnN0YWxsZXIiLAogICAgImluc3RhbGwuYmF0IjogYiJ3cmFwcGVyIiwKfQpmb3IgcmVsYXRpdmUsIHBheWxvYWQgaW4gZmlsZXMuaXRlbXMoKToKICAgIHBhdGggPSBzb3VyY2Uuam9pbnBhdGgoKnJlbGF0aXZlLnNwbGl0KCIvIikpCiAgICBwYXRoLnBhcmVudC5ta2RpcihwYXJlbnRzPVRydWUsIGV4aXN0X29rPVRydWUpCiAgICBwYXRoLndyaXRlX2J5dGVzKHBheWxvYWQpCgpyZXN1bHQgPSByZWxlYXNlX2hlbHBlci5zdGFnZV9yZWxlYXNlKHNvdXJjZSwgc3RhZ2UsICIyLjAuNzQtYmV0YS40IikKaWYgcmVzdWx0ICE9IHN0YWdlOgogICAgcmFpc2UgQXNzZXJ0aW9uRXJyb3IoInN0YWdlX3JlbGVhc2UgcmV0dXJuZWQgdGhlIHdyb25nIHBhdGgiKQphY3R1YWwgPSB0dXBsZSgKICAgIHNvcnRlZChwYXRoLnJlbGF0aXZlX3RvKHN0YWdlKS5hc19wb3NpeCgpIGZvciBwYXRoIGluIHN0YWdlLnJnbG9iKCIqIikgaWYgcGF0aC5pc19maWxlKCkpCikKZXhwZWN0ZWQgPSAoCiAgICAiZXh0ZW5zaW9uL2Fzc2V0cy9hcHAuanMiLAogICAgImV4dGVuc2lvbi9tYW5pZmVzdC5qc29uIiwKICAgICJob3N0L19pbnRlcm5hbC9weXRob24zMTMuZGxsIiwKICAgICJob3N0L2NvbmZpZy5qc29uIiwKICAgICJob3N0L2RoX25hdGl2ZV9ob3N0LmV4ZSIsCiAgICAiaG9zdC9pbnN0YWxsZWQtcHJvZHVjdC5qc29uIiwKICAgICJob3N0L3JlZ2lzdGVyLnB5IiwKICAgICJob3N0L3JlbGVhc2UtaW50ZWdyaXR5Lmpzb24iLAogICAgImhvc3Qvc3lzdGVtX3Byb21wdC5tZCIsCiAgICAiaW5zdGFsbC5iYXQiLAogICAgImluc3RhbGxlcl9jb3JlLnBzMSIsCiAgICAidXBkYXRlLW1hbmlmZXN0Lmpzb24iLAopCmlmIGFjdHVhbCAhPSBleHBlY3RlZDoKICAgIHJhaXNlIEFzc2VydGlvbkVycm9yKGYidW5leHBlY3RlZCBzdGFnZWQgcGF0aHM6IHthY3R1YWx9IikKcmV0aXJlZCA9IGIicGxhbl9lX2V2aWRlbmNlIgpmb3IgcmVsYXRpdmUgaW4gYWN0dWFsOgogICAgaWYgcmV0aXJlZC5kZWNvZGUoImFzY2lpIikgaW4gcmVsYXRpdmUgb3IgcmV0aXJlZCBpbiBzdGFnZS5qb2lucGF0aCgqcmVsYXRpdmUuc3BsaXQoIi8iKSkucmVhZF9ieXRlcygpOgogICAgICAgIHJhaXNlIEFzc2VydGlvbkVycm9yKGYicmV0aXJlZCBleGVjdXRvciByZWZlcmVuY2Ugc3RhZ2VkOiB7cmVsYXRpdmV9IikKcHJpbnQoIlN5bnRoZXRpYyBzdGFnZV9yZWxlYXNlIHJldGlyZW1lbnQgcHJvYmU6IFBBU1MiKQo='))" $clone $stage; if($LASTEXITCODE -ne 0){ throw 'synthetic stage_release retirement probe failed' }; "Executor retirement clean-clone check: PASS" } finally { if($cachePresent){ [Environment]::SetEnvironmentVariable('PYTHONPYCACHEPREFIX',$cacheSaved,'Process') } else { Remove-Item -LiteralPath 'Env:PYTHONPYCACHEPREFIX' -ErrorAction SilentlyContinue }; if(Test-Path -LiteralPath $stage){ Remove-Item -LiteralPath $stage -Recurse -Force }; if(Test-Path -LiteralPath $cache){ Remove-Item -LiteralPath $cache -Recurse -Force }; if(Test-Path -LiteralPath $clone){ Remove-Item -LiteralPath $clone -Recurse -Force } }
```

Expected: clone Host compilation passes and the probe prints `Synthetic stage_release
retirement probe: PASS`; it imports clone `release_helper` using source-venv Python,
stages the exact expected files,
finds no `plan_e_evidence` path/reference, and never calls PyInstaller. Both fresh processes
block before creating names when any pre-existing `plan-e-retirement-clone-*`,
`plan-e-retirement-pycache-*`, or `plan-e-retirement-stage-*` entry exists and report exact
paths without deletion/adoption. Normal `finally` removes only its exact clone/cache/stage.
A reboot-left root blocks the next process pending manual inspection and authorization.

### 9.3 Write the Windows Retry RED

- [ ] **Step 1: Add one compact behavior-complete test class**

Modify only `host/test_update_engine_resume.py` with `apply_patch`. Replace the
leading imports with this exact block, preserving the rest of the module:

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

Insert `PreparingPromotionRetryTests(unittest.TestCase)` immediately before
`OwnershipBoundaryTests`, and add `"PreparingPromotionRetryTests"` to
`test_unittest_class_map_is_exact`. The class must expose exactly these eight
test methods:

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

Use the existing `MatrixHarness`, `live_snapshot`, and operation recorder. Keep
the fixture compact: patch module seams with `mock.patch.object`, record replace,
sleep, validation, and hook calls, use disposable `TemporaryDirectory` roots,
and restore patches through context managers. Use helpers such as
`_exercise_promotion`, `_apply_revalidation_mutation`, `_assert_retry_success`,
`_assert_exhausted`, and `_assert_not_retried` so the matrix stays readable.
Do not add evidence-output code.

| Test | Exact required behavior |
|---|---|
| Access denied | A synthetic `OSError` with exact integer `winerror=5` fails once, then the second exact preparing-to-final replace succeeds. Assert attempts `2`, delays `[0.05]`, validation calls `3`, final tree equals the candidate, `.preparing` is absent, exact active state exists, and live product bytes are unchanged. Also assert first-attempt success has one validation and no delay. |
| Sharing errors | Independently prove exact integer `32` and `33`, plus `PermissionError` carrying integer `5`, retry and succeed. |
| Exhaustion | Persistent `winerror=32` makes exactly three replace attempts and delays `[0.05, 0.2]`; fixed `PreparedTransactionConflict` retains the third `OSError` as `__cause__`; active/final remain absent, candidate remains exact, and live bytes do not change. |
| Rejections | `_is_windows=False`, unlisted integer `87`, missing `winerror`, non-`OSError`, boolean `True`, and an `int` subclass each make one attempt, no delay, and preserve the original cause under the fixed conflict. |
| Checkpoint order | Assert first-success sequence `validate, replace`; one-retry sequence `validate, replace, validate, sleep(0.05), validate, replace`; exhaustion has five validations, three replaces, and the two exact sleeps. Corrupt initial topology to prove zero replace attempts. |
| Revalidation matrix | At both `pre-sleep` and `post-sleep`, reject source disappearance, destination creation, every prepared journal field including `seed_receipt`, ownership/probe bytes, Host/Extension digest or inventory, extra topology, root/parent/descendant symlink or reparse state, unsupported descendants, canonical escapes, and state-read failures. Pre-sleep faults sleep zero times; post-sleep faults sleep once; neither retries or writes active/live bytes. |
| Hooks | Promotion has one before/after operation pair across successful retries. Exhaustion has one before and no after. Before-hook failure makes no replace; after-hook failure is not retried and leaves promoted state without active state. |
| Constructor | `inspect.signature(UpdateEngine)` remains positional `install_root`, keyword-only `mutex_factory=create_windows_mutation_mutex`, keyword-only `hooks=None`, and no return annotation or retry dependency parameter. |

The tests must first assert that `_replace_path`, `_sleep`, `_is_windows`,
`PROMOTION_TRANSIENT_WINERRORS`, `PROMOTION_RETRY_DELAYS`,
`_require_preparing_promotion_candidate`, and
`_promote_preparing_with_retry` exist and have their locked defaults. That
assertion creates genuine behavior RED without import or collection failure.

- [ ] **Step 2: Run the constructor control and seven independent RED selectors**

The constructor is a separate passing control:

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_update_engine_constructor_signature_remains_frozen'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; if($exit -ne 0 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $output -notmatch '(?m)^OK$' -or $output -match '(?m)^FAIL: |^ERROR: |skipped'){ throw 'Constructor control did not pass exactly once' }
```

Expected: exit `0`, `Ran 1 test`, `OK`, no error or skip.

Run each behavioral selector as its own command:

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_windows_access_denied_retries_atomic_preparing_promotion'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_windows_sharing_errors_32_and_33_are_retryable'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_persistent_windows_promotion_lock_stops_after_three_attempts'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_non_windows_or_unlisted_promotion_errors_are_not_retried'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_preparing_promotion_revalidates_before_and_after_sleep'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_preparing_promotion_revalidation_rejects_every_authority_mismatch'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

```powershell
$ErrorActionPreference='Stop'; $python='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe'; $selector='test_preparing_promotion_hooks_wrap_the_logical_operation_once'; $output=(& $python -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests.$selector" -v 2>&1 | Out-String); $exit=$LASTEXITCODE; $output; $fails=@($output -split "`r?`n" | Where-Object { $_ -like "FAIL: $selector *" }); if($exit -ne 1 -or ([regex]::Matches($output,'Ran 1 test')).Count -ne 1 -or $fails.Count -ne 1 -or ([regex]::Matches($output,'FAILED \(failures=1\)')).Count -ne 1 -or $output -match '(?m)^ERROR: |errors=|skipped'){ throw "Invalid RED for $selector" }
```

Each behavioral command must exit `1`, report `Ran 1 test`, exactly one assertion
failure, and `FAILED (failures=1)`, with no error, import/collection/setup
failure, skip, timeout, signal, or zero match. Record the actual failing
assertion for the final report.

- [ ] **Step 3: Commit the one-path RED**

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $actual=@(& $git -C $root status --short); if ($actual.Count -ne 1 -or $actual[0] -notmatch '^ M host/test_update_engine_resume\.py$') { throw 'RED worktree must contain only the test path' }; & $git -C $root add -- 'host/test_update_engine_resume.py'; if ($LASTEXITCODE -ne 0) { throw 'Could not stage retry RED' }; $staged=@(& $git -C $root diff --cached --name-only --); if ($staged.Count -ne 1 -or $staged[0] -cne 'host/test_update_engine_resume.py') { throw 'Retry RED staged path mismatch' }; & $git -C $root diff --cached --check; if ($LASTEXITCODE -ne 0) { throw 'Retry RED diff check failed' }; & $git -C $root commit -m 'test(update): cover locked preparing promotion'; if ($LASTEXITCODE -ne 0) { throw 'Retry RED commit failed' }
```

Expected: exactly `host/test_update_engine_resume.py` is committed; production
is unchanged and status is clean.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $subject=(& $git -C $root show -s --format=%s HEAD).Trim(); $paths=@(& $git -C $root diff-tree --no-commit-id --name-only -r HEAD); if($subject -cne 'test(update): cover locked preparing promotion' -or $paths.Count -ne 1 -or $paths[0] -cne 'host/test_update_engine_resume.py'){ throw 'Retry RED commit mismatch' }; & $git -C $root diff --quiet HEAD^ HEAD -- 'host/update_engine.py'; if($LASTEXITCODE -ne 0){ throw 'Production changed in retry RED' }; if(@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw 'Worktree is not clean after retry RED' }
```

### 9.4 Implement the Windows Retry GREEN

- [ ] **Step 1: Modify only `host/update_engine.py`**

Use `apply_patch`. Add exact standard import `import time`. Define the three
private seams immediately after imports, and define the two constants there as
well; no constructor dependency is added:

```python
_replace_path = os.replace
_sleep = time.sleep
_is_windows = os.name == "nt"
PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))
PROMOTION_RETRY_DELAYS = (0.05, 0.2)
```

Do not change `UpdateEngine.__init__`. Add these exact signatures:

```python
def _require_preparing_promotion_candidate(
    self,
    package: ValidatedPackage,
    candidate: OwnershipPlan,
    candidate_bytes: bytes,
    paths: TransactionPaths,
    staging: UpdateJournal,
) -> None:

def _promote_preparing_with_retry(
    self,
    package: ValidatedPackage,
    candidate: OwnershipPlan,
    candidate_bytes: bytes,
    paths: TransactionPaths,
    staging: UpdateJournal,
) -> None:
```

`_require_preparing_promotion_candidate` must fail with
`PreparedTransactionConflict` unless all checks pass:

- `transaction_root` is absent both lexically and canonically.
- `install_root`, `updates_root`, `transactions_root`, `preparing_root`, and
  every lexical parent between them resolve beneath the fixed install root and
  are real directories, not symlinks or Windows reparse points.
- `preparing_journal` parses and equals the complete
  `transition(staging, JournalPhase.PREPARED)` value, including transaction ID,
  schema version, initiator, target/prior versions, fresh flag, ownership digest,
  reason code, original failure code, rollback source, initiating process,
  ownership path, and `seed_receipt`.
- `preparing_ownership` bytes equal `candidate_bytes`; `read_ownership_plan`
  returns `candidate`, and `ownership_plan_sha256(candidate)` equals the prepared
  journal's ownership digest.
- Probe-manifest bytes equal canonical `package.manifest` bytes.
- Staged Host and Extension trees have exact inventories and hashes.
- The full preparing workspace contains only the expected directory topology
  and `journal.json`, `ownership.json`, `probe/update-manifest.json`,
  `staged/host/**`, and `staged/extension/**`; no extra, unsupported, symlink,
  or reparse descendant is accepted.
- Missing, changed, raced, or unreadable state fails closed as the same fixed
  conflict. Never expose a raw filesystem message.

`_promote_preparing_with_retry` must use this exact control flow:

```python
# promotion-checkpoint: initial
self._require_preparing_promotion_candidate(
    package, candidate, candidate_bytes, paths, staging
)
for attempt in range(len(PROMOTION_RETRY_DELAYS) + 1):
    try:
        _replace_path(paths.preparing_root, paths.transaction_root)
        return
    except OSError as error:
        winerror = getattr(error, "winerror", None)
        if (
            not _is_windows
            or type(winerror) is not int
            or winerror not in PROMOTION_TRANSIENT_WINERRORS
            or attempt >= len(PROMOTION_RETRY_DELAYS)
        ):
            raise
        # promotion-checkpoint: pre-sleep
        self._require_preparing_promotion_candidate(
            package, candidate, candidate_bytes, paths, staging
        )
        _sleep(PROMOTION_RETRY_DELAYS[attempt])
        # promotion-checkpoint: post-sleep
        self._require_preparing_promotion_candidate(
            package, candidate, candidate_bytes, paths, staging
        )
```

Catch only `OSError` from `_replace_path`. There are at most three attempts and
exact delays `0.05`, then `0.2`. Do not validate or sleep after the final failed
attempt. Re-raise the final OS error so the existing
`_run_preparation_operation` wraps it once as the fixed conflict and preserves
it as `__cause__`.

Replace only the current promotion operation with:

```python
self._run_preparation_operation(
    "workspace:promote-preparing",
    lambda: self._promote_preparing_with_retry(
        package, candidate, candidate_bytes, paths, staging
    ),
)
```

Keep `_replace_path(paths.preparing_root, paths.transaction_root)` as the sole
publication. Do not copy, delete, rebuild, or introduce a non-atomic fallback.
Do not retry hooks, journal/ownership/probe/copy/candidate validation, active
writes, general conflicts, non-Windows errors, or unlisted errors. Operation
hooks stay outside the retry helper and wrap the logical promotion once. Active
state is written only after successful publication.

- [ ] **Step 2: Run GREEN and update-engine regressions**

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests" -v
```

Expected: `Ran 8 tests`, all pass, no skip.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest discover -s "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host" -p "test_update_engine_resume.py" -v
```

Expected: every resume-module test passes with no skip; record the actual total.
This is the required whole resume-module run.

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest discover -s "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host" -p "test_update_engine*.py" -v
```

Expected: all update-engine tests pass with no skip; record the actual total.

```powershell
$ErrorActionPreference='Stop'; $path='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\update_engine.py'; $source=[IO.File]::ReadAllText($path); $required=@('import time','_replace_path = os.replace','_sleep = time.sleep','_is_windows = os.name == "nt"','PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))','PROMOTION_RETRY_DELAYS = (0.05, 0.2)','def _require_preparing_promotion_candidate(','def _promote_preparing_with_retry(','# promotion-checkpoint: initial','# promotion-checkpoint: pre-sleep','# promotion-checkpoint: post-sleep','_replace_path(paths.preparing_root, paths.transaction_root)'); foreach($value in $required){ if(([regex]::Matches($source,[regex]::Escape($value))).Count -ne 1){ throw "Required retry source form missing or duplicated: $value" } }; if($source -notmatch '(?s)"workspace:promote-preparing",\s*lambda: self\._promote_preparing_with_retry\('){ throw 'Logical promotion wrapper does not call retry helper' }; if(([regex]::Matches($source,'os\.replace\(paths\.preparing_root, paths\.transaction_root\)')).Count -ne 0){ throw 'Direct preparing promotion bypasses private replace seam' }
```

Expected: exit `0`, no output. This static check supplements behavior tests by
locking the exact private seams, constants, checkpoints, and atomic call site.

- [ ] **Step 3: Prove five mutations in one foreground Python harness**

Run one foreground Python harness, not five manual edits or multiple tools. It
must retain the original `host/update_engine.py` bytes, require each source
anchor exactly once, apply one mutation, run its selector, require exit `1`,
`Ran 1 test`, one assertion `FAIL`, `FAILED (failures=1)`, and no error or skip.
Run it in the primary worktree with a clean index and no other tracked change;
restore bytes in `finally`, prove byte equality, and rerun that selector GREEN.
An outer `finally` must restore the original bytes after any failure. If the
source uses CRLF, derive mutation anchors with CRLF; otherwise use LF. Perform
byte substitutions only, so the mutation cannot normalize unrelated lines.

| Mutation name | Exact temporary change | Selector that must fail |
|---|---|---|
| `classification` | Replace the exact Windows/integer/allowlist/retry-budget condition with `if True:`. | `test_windows_access_denied_retries_atomic_preparing_promotion` |
| `attempt bound` | Change `PROMOTION_RETRY_DELAYS = (0.05, 0.2)` to `(0.05, 0.2, 0.4)`. | `test_persistent_windows_promotion_lock_stops_after_three_attempts` |
| `initial validation` | Replace the initial checkpoint and validator call with `pass  # mutation: omit initial revalidation`. | `test_preparing_promotion_revalidates_before_and_after_sleep` |
| `pre-sleep validation` | Replace the pre-sleep checkpoint and validator call with `pass  # mutation: omit pre-sleep revalidation`. | `test_preparing_promotion_revalidation_rejects_every_authority_mismatch` |
| `post-sleep validation` | Replace the post-sleep checkpoint and validator call with `pass  # mutation: omit post-sleep revalidation`. | `test_preparing_promotion_revalidation_rejects_every_authority_mismatch` |

The executable one-line harness encodes the script below directly in its
`python -c` argument; it creates no repository file or persistent evidence
output. The Python fence is review-only. Run only the one-line command, after
confirming its payload decodes byte-for-byte to the fenced script.

The encoded payload is exactly this script:

```python
from pathlib import Path
import os
import re
import subprocess
import sys
import tempfile

root = Path(r"C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec")
source = root / "host/update_engine.py"
original = source.read_bytes()
python = Path(sys.executable)
newline = b"\r\n" if b"\r\n" in original else b"\n"


def lines(*values):
    return newline.join(value.encode("ascii") for value in values)


def validator_call(name, indent):
    pad = " " * indent
    return lines(
        f"{pad}# promotion-checkpoint: {name}",
        f"{pad}self._require_preparing_promotion_candidate(",
        f"{pad}    package, candidate, candidate_bytes, paths, staging",
        f"{pad})",
    )


mutations = (
    (
        "classification",
        lines(
            "            if (",
            "                not _is_windows",
            "                or type(winerror) is not int",
            "                or winerror not in PROMOTION_TRANSIENT_WINERRORS",
            "                or attempt >= len(PROMOTION_RETRY_DELAYS)",
            "            ):",
        ),
        b"            if True:",
        "test_windows_access_denied_retries_atomic_preparing_promotion",
    ),
    (
        "attempt bound",
        b"PROMOTION_RETRY_DELAYS = (0.05, 0.2)",
        b"PROMOTION_RETRY_DELAYS = (0.05, 0.2, 0.4)",
        "test_persistent_windows_promotion_lock_stops_after_three_attempts",
    ),
    (
        "initial validation",
        validator_call("initial", 8),
        b"        pass  # mutation: omit initial revalidation",
        "test_preparing_promotion_revalidates_before_and_after_sleep",
    ),
    (
        "pre-sleep validation",
        validator_call("pre-sleep", 16),
        b"                pass  # mutation: omit pre-sleep revalidation",
        "test_preparing_promotion_revalidation_rejects_every_authority_mismatch",
    ),
    (
        "post-sleep validation",
        validator_call("post-sleep", 16),
        b"                pass  # mutation: omit post-sleep revalidation",
        "test_preparing_promotion_revalidation_rejects_every_authority_mismatch",
    ),
)


def run(selector, environment):
    return subprocess.run(
        [
            str(python),
            "-c",
            (
                "import pathlib,sys,unittest; "
                "sys.path.insert(0,str(pathlib.Path("
                "r'C:\\MyWorkbench\\Repository\\Dynamics-Helper-prompt-scope-spec\\host'"
                "))); unittest.main(module=None)"
            ),
            f"host.test_update_engine_resume.PreparingPromotionRetryTests.{selector}",
            "-v",
        ],
        cwd=root,
        env=environment,
        text=True,
        capture_output=True,
        timeout=180,
    )


try:
    with tempfile.TemporaryDirectory(
        dir=r"C:\Users\zhaobo\AppData\Local\Temp\opencode"
    ) as temporary:
        sandbox = Path(temporary)
        environment = os.environ.copy()
        environment["PYTHONPATH"] = str(root / "host")
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        for name in ("LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME", "TEMP", "TMP"):
            value = sandbox / name.lower()
            value.mkdir()
            environment[name] = str(value)
        for name, old, new, selector in mutations:
            if original.count(old) != 1:
                raise AssertionError(f"{name}: source anchor count mismatch")
            try:
                source.write_bytes(original.replace(old, new))
                red = run(selector, environment)
                output = red.stdout + red.stderr
                fail_lines = [
                    line for line in output.splitlines() if line.startswith("FAIL: ")
                ]
                summary = re.search(r"FAILED \(failures=(\d+)\)", output)
                if (
                    red.returncode != 1
                    or output.count("Ran 1 test") != 1
                    or len(fail_lines) != 1
                    or summary is None
                    or int(summary.group(1)) != 1
                    or selector not in fail_lines[0]
                    or "\nERROR: " in output
                    or "errors=" in output
                    or "skipped" in output.lower()
                ):
                    raise AssertionError(f"{name}: invalid mutation result\n{output}")
            finally:
                source.write_bytes(original)
            if source.read_bytes() != original:
                raise AssertionError(f"{name}: byte restoration failed")
            green = run(selector, environment)
            output = green.stdout + green.stderr
            if (
                green.returncode != 0
                or output.count("Ran 1 test") != 1
                or not output.rstrip().endswith("OK")
            ):
                raise AssertionError(f"{name}: restored GREEN failed\n{output}")
            print(f"{name}: mutation FAIL, restored GREEN PASS")
finally:
    source.write_bytes(original)

if source.read_bytes() != original:
    raise AssertionError("final byte restoration failed")
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "exec(__import__('base64').b64decode('ZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCmltcG9ydCBvcwppbXBvcnQgcmUKaW1wb3J0IHN1YnByb2Nlc3MKaW1wb3J0IHN5cwppbXBvcnQgdGVtcGZpbGUKCnJvb3QgPSBQYXRoKHIiQzpcTXlXb3JrYmVuY2hcUmVwb3NpdG9yeVxEeW5hbWljcy1IZWxwZXItcHJvbXB0LXNjb3BlLXNwZWMiKQpzb3VyY2UgPSByb290IC8gImhvc3QvdXBkYXRlX2VuZ2luZS5weSIKb3JpZ2luYWwgPSBzb3VyY2UucmVhZF9ieXRlcygpCnB5dGhvbiA9IFBhdGgoc3lzLmV4ZWN1dGFibGUpCm5ld2xpbmUgPSBiIlxyXG4iIGlmIGIiXHJcbiIgaW4gb3JpZ2luYWwgZWxzZSBiIlxuIgoKCmRlZiBsaW5lcygqdmFsdWVzKToKICAgIHJldHVybiBuZXdsaW5lLmpvaW4odmFsdWUuZW5jb2RlKCJhc2NpaSIpIGZvciB2YWx1ZSBpbiB2YWx1ZXMpCgoKZGVmIHZhbGlkYXRvcl9jYWxsKG5hbWUsIGluZGVudCk6CiAgICBwYWQgPSAiICIgKiBpbmRlbnQKICAgIHJldHVybiBsaW5lcygKICAgICAgICBmIntwYWR9IyBwcm9tb3Rpb24tY2hlY2twb2ludDoge25hbWV9IiwKICAgICAgICBmIntwYWR9c2VsZi5fcmVxdWlyZV9wcmVwYXJpbmdfcHJvbW90aW9uX2NhbmRpZGF0ZSgiLAogICAgICAgIGYie3BhZH0gICAgcGFja2FnZSwgY2FuZGlkYXRlLCBjYW5kaWRhdGVfYnl0ZXMsIHBhdGhzLCBzdGFnaW5nIiwKICAgICAgICBmIntwYWR9KSIsCiAgICApCgoKbXV0YXRpb25zID0gKAogICAgKAogICAgICAgICJjbGFzc2lmaWNhdGlvbiIsCiAgICAgICAgbGluZXMoCiAgICAgICAgICAgICIgICAgICAgICAgICBpZiAoIiwKICAgICAgICAgICAgIiAgICAgICAgICAgICAgICBub3QgX2lzX3dpbmRvd3MiLAogICAgICAgICAgICAiICAgICAgICAgICAgICAgIG9yIHR5cGUod2luZXJyb3IpIGlzIG5vdCBpbnQiLAogICAgICAgICAgICAiICAgICAgICAgICAgICAgIG9yIHdpbmVycm9yIG5vdCBpbiBQUk9NT1RJT05fVFJBTlNJRU5UX1dJTkVSUk9SUyIsCiAgICAgICAgICAgICIgICAgICAgICAgICAgICAgb3IgYXR0ZW1wdCA+PSBsZW4oUFJPTU9USU9OX1JFVFJZX0RFTEFZUykiLAogICAgICAgICAgICAiICAgICAgICAgICAgKToiLAogICAgICAgICksCiAgICAgICAgYiIgICAgICAgICAgICBpZiBUcnVlOiIsCiAgICAgICAgInRlc3Rfd2luZG93c19hY2Nlc3NfZGVuaWVkX3JldHJpZXNfYXRvbWljX3ByZXBhcmluZ19wcm9tb3Rpb24iLAogICAgKSwKICAgICgKICAgICAgICAiYXR0ZW1wdCBib3VuZCIsCiAgICAgICAgYiJQUk9NT1RJT05fUkVUUllfREVMQVlTID0gKDAuMDUsIDAuMikiLAogICAgICAgIGIiUFJPTU9USU9OX1JFVFJZX0RFTEFZUyA9ICgwLjA1LCAwLjIsIDAuNCkiLAogICAgICAgICJ0ZXN0X3BlcnNpc3RlbnRfd2luZG93c19wcm9tb3Rpb25fbG9ja19zdG9wc19hZnRlcl90aHJlZV9hdHRlbXB0cyIsCiAgICApLAogICAgKAogICAgICAgICJpbml0aWFsIHZhbGlkYXRpb24iLAogICAgICAgIHZhbGlkYXRvcl9jYWxsKCJpbml0aWFsIiwgOCksCiAgICAgICAgYiIgICAgICAgIHBhc3MgICMgbXV0YXRpb246IG9taXQgaW5pdGlhbCByZXZhbGlkYXRpb24iLAogICAgICAgICJ0ZXN0X3ByZXBhcmluZ19wcm9tb3Rpb25fcmV2YWxpZGF0ZXNfYmVmb3JlX2FuZF9hZnRlcl9zbGVlcCIsCiAgICApLAogICAgKAogICAgICAgICJwcmUtc2xlZXAgdmFsaWRhdGlvbiIsCiAgICAgICAgdmFsaWRhdG9yX2NhbGwoInByZS1zbGVlcCIsIDE2KSwKICAgICAgICBiIiAgICAgICAgICAgICAgICBwYXNzICAjIG11dGF0aW9uOiBvbWl0IHByZS1zbGVlcCByZXZhbGlkYXRpb24iLAogICAgICAgICJ0ZXN0X3ByZXBhcmluZ19wcm9tb3Rpb25fcmV2YWxpZGF0aW9uX3JlamVjdHNfZXZlcnlfYXV0aG9yaXR5X21pc21hdGNoIiwKICAgICksCiAgICAoCiAgICAgICAgInBvc3Qtc2xlZXAgdmFsaWRhdGlvbiIsCiAgICAgICAgdmFsaWRhdG9yX2NhbGwoInBvc3Qtc2xlZXAiLCAxNiksCiAgICAgICAgYiIgICAgICAgICAgICAgICAgcGFzcyAgIyBtdXRhdGlvbjogb21pdCBwb3N0LXNsZWVwIHJldmFsaWRhdGlvbiIsCiAgICAgICAgInRlc3RfcHJlcGFyaW5nX3Byb21vdGlvbl9yZXZhbGlkYXRpb25fcmVqZWN0c19ldmVyeV9hdXRob3JpdHlfbWlzbWF0Y2giLAogICAgKSwKKQoKCmRlZiBydW4oc2VsZWN0b3IsIGVudmlyb25tZW50KToKICAgIHJldHVybiBzdWJwcm9jZXNzLnJ1bigKICAgICAgICBbCiAgICAgICAgICAgIHN0cihweXRob24pLAogICAgICAgICAgICAiLWMiLAogICAgICAgICAgICAoCiAgICAgICAgICAgICAgICAiaW1wb3J0IHBhdGhsaWIsc3lzLHVuaXR0ZXN0OyAiCiAgICAgICAgICAgICAgICAic3lzLnBhdGguaW5zZXJ0KDAsc3RyKHBhdGhsaWIuUGF0aCgiCiAgICAgICAgICAgICAgICAicidDOlxcTXlXb3JrYmVuY2hcXFJlcG9zaXRvcnlcXER5bmFtaWNzLUhlbHBlci1wcm9tcHQtc2NvcGUtc3BlY1xcaG9zdCciCiAgICAgICAgICAgICAgICAiKSkpOyB1bml0dGVzdC5tYWluKG1vZHVsZT1Ob25lKSIKICAgICAgICAgICAgKSwKICAgICAgICAgICAgZiJob3N0LnRlc3RfdXBkYXRlX2VuZ2luZV9yZXN1bWUuUHJlcGFyaW5nUHJvbW90aW9uUmV0cnlUZXN0cy57c2VsZWN0b3J9IiwKICAgICAgICAgICAgIi12IiwKICAgICAgICBdLAogICAgICAgIGN3ZD1yb290LAogICAgICAgIGVudj1lbnZpcm9ubWVudCwKICAgICAgICB0ZXh0PVRydWUsCiAgICAgICAgY2FwdHVyZV9vdXRwdXQ9VHJ1ZSwKICAgICAgICB0aW1lb3V0PTE4MCwKICAgICkKCgp0cnk6CiAgICB3aXRoIHRlbXBmaWxlLlRlbXBvcmFyeURpcmVjdG9yeSgKICAgICAgICBkaXI9ciJDOlxVc2Vyc1x6aGFvYm9cQXBwRGF0YVxMb2NhbFxUZW1wXG9wZW5jb2RlIgogICAgKSBhcyB0ZW1wb3Jhcnk6CiAgICAgICAgc2FuZGJveCA9IFBhdGgodGVtcG9yYXJ5KQogICAgICAgIGVudmlyb25tZW50ID0gb3MuZW52aXJvbi5jb3B5KCkKICAgICAgICBlbnZpcm9ubWVudFsiUFlUSE9OUEFUSCJdID0gc3RyKHJvb3QgLyAiaG9zdCIpCiAgICAgICAgZW52aXJvbm1lbnRbIlBZVEhPTkRPTlRXUklURUJZVEVDT0RFIl0gPSAiMSIKICAgICAgICBmb3IgbmFtZSBpbiAoIkxPQ0FMQVBQREFUQSIsICJBUFBEQVRBIiwgIlVTRVJQUk9GSUxFIiwgIkhPTUUiLCAiVEVNUCIsICJUTVAiKToKICAgICAgICAgICAgdmFsdWUgPSBzYW5kYm94IC8gbmFtZS5sb3dlcigpCiAgICAgICAgICAgIHZhbHVlLm1rZGlyKCkKICAgICAgICAgICAgZW52aXJvbm1lbnRbbmFtZV0gPSBzdHIodmFsdWUpCiAgICAgICAgZm9yIG5hbWUsIG9sZCwgbmV3LCBzZWxlY3RvciBpbiBtdXRhdGlvbnM6CiAgICAgICAgICAgIGlmIG9yaWdpbmFsLmNvdW50KG9sZCkgIT0gMToKICAgICAgICAgICAgICAgIHJhaXNlIEFzc2VydGlvbkVycm9yKGYie25hbWV9OiBzb3VyY2UgYW5jaG9yIGNvdW50IG1pc21hdGNoIikKICAgICAgICAgICAgdHJ5OgogICAgICAgICAgICAgICAgc291cmNlLndyaXRlX2J5dGVzKG9yaWdpbmFsLnJlcGxhY2Uob2xkLCBuZXcpKQogICAgICAgICAgICAgICAgcmVkID0gcnVuKHNlbGVjdG9yLCBlbnZpcm9ubWVudCkKICAgICAgICAgICAgICAgIG91dHB1dCA9IHJlZC5zdGRvdXQgKyByZWQuc3RkZXJyCiAgICAgICAgICAgICAgICBmYWlsX2xpbmVzID0gWwogICAgICAgICAgICAgICAgICAgIGxpbmUgZm9yIGxpbmUgaW4gb3V0cHV0LnNwbGl0bGluZXMoKSBpZiBsaW5lLnN0YXJ0c3dpdGgoIkZBSUw6ICIpCiAgICAgICAgICAgICAgICBdCiAgICAgICAgICAgICAgICBzdW1tYXJ5ID0gcmUuc2VhcmNoKHIiRkFJTEVEIFwoZmFpbHVyZXM9KFxkKylcKSIsIG91dHB1dCkKICAgICAgICAgICAgICAgIGlmICgKICAgICAgICAgICAgICAgICAgICByZWQucmV0dXJuY29kZSAhPSAxCiAgICAgICAgICAgICAgICAgICAgb3Igb3V0cHV0LmNvdW50KCJSYW4gMSB0ZXN0IikgIT0gMQogICAgICAgICAgICAgICAgICAgIG9yIGxlbihmYWlsX2xpbmVzKSAhPSAxCiAgICAgICAgICAgICAgICAgICAgb3Igc3VtbWFyeSBpcyBOb25lCiAgICAgICAgICAgICAgICAgICAgb3IgaW50KHN1bW1hcnkuZ3JvdXAoMSkpICE9IDEKICAgICAgICAgICAgICAgICAgICBvciBzZWxlY3RvciBub3QgaW4gZmFpbF9saW5lc1swXQogICAgICAgICAgICAgICAgICAgIG9yICJcbkVSUk9SOiAiIGluIG91dHB1dAogICAgICAgICAgICAgICAgICAgIG9yICJlcnJvcnM9IiBpbiBvdXRwdXQKICAgICAgICAgICAgICAgICAgICBvciAic2tpcHBlZCIgaW4gb3V0cHV0Lmxvd2VyKCkKICAgICAgICAgICAgICAgICk6CiAgICAgICAgICAgICAgICAgICAgcmFpc2UgQXNzZXJ0aW9uRXJyb3IoZiJ7bmFtZX06IGludmFsaWQgbXV0YXRpb24gcmVzdWx0XG57b3V0cHV0fSIpCiAgICAgICAgICAgIGZpbmFsbHk6CiAgICAgICAgICAgICAgICBzb3VyY2Uud3JpdGVfYnl0ZXMob3JpZ2luYWwpCiAgICAgICAgICAgIGlmIHNvdXJjZS5yZWFkX2J5dGVzKCkgIT0gb3JpZ2luYWw6CiAgICAgICAgICAgICAgICByYWlzZSBBc3NlcnRpb25FcnJvcihmIntuYW1lfTogYnl0ZSByZXN0b3JhdGlvbiBmYWlsZWQiKQogICAgICAgICAgICBncmVlbiA9IHJ1bihzZWxlY3RvciwgZW52aXJvbm1lbnQpCiAgICAgICAgICAgIG91dHB1dCA9IGdyZWVuLnN0ZG91dCArIGdyZWVuLnN0ZGVycgogICAgICAgICAgICBpZiAoCiAgICAgICAgICAgICAgICBncmVlbi5yZXR1cm5jb2RlICE9IDAKICAgICAgICAgICAgICAgIG9yIG91dHB1dC5jb3VudCgiUmFuIDEgdGVzdCIpICE9IDEKICAgICAgICAgICAgICAgIG9yIG5vdCBvdXRwdXQucnN0cmlwKCkuZW5kc3dpdGgoIk9LIikKICAgICAgICAgICAgKToKICAgICAgICAgICAgICAgIHJhaXNlIEFzc2VydGlvbkVycm9yKGYie25hbWV9OiByZXN0b3JlZCBHUkVFTiBmYWlsZWRcbntvdXRwdXR9IikKICAgICAgICAgICAgcHJpbnQoZiJ7bmFtZX06IG11dGF0aW9uIEZBSUwsIHJlc3RvcmVkIEdSRUVOIFBBU1MiKQpmaW5hbGx5OgogICAgc291cmNlLndyaXRlX2J5dGVzKG9yaWdpbmFsKQoKaWYgc291cmNlLnJlYWRfYnl0ZXMoKSAhPSBvcmlnaW5hbDoKICAgIHJhaXNlIEFzc2VydGlvbkVycm9yKCJmaW5hbCBieXRlIHJlc3RvcmF0aW9uIGZhaWxlZCIpCg=='))"
```

Expected: five named `mutation FAIL, restored GREEN PASS` lines and exit `0`.
Then rerun the eight-test class and all update-engine tests. Confirm the source
bytes are identical to the pre-mutation bytes and only `host/update_engine.py`
is dirty relative to RED HEAD. The harness must produce no durable file; its
base64 payload is only an inline encoding of the readable contract above.

- [ ] **Step 4: Commit the one-path GREEN**

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $actual=@(& $git -C $root status --short); if ($actual.Count -ne 1 -or $actual[0] -notmatch '^ M host/update_engine\.py$') { throw 'GREEN worktree must contain only the source path' }; & $git -C $root add -- 'host/update_engine.py'; if ($LASTEXITCODE -ne 0) { throw 'Could not stage retry GREEN' }; $staged=@(& $git -C $root diff --cached --name-only --); if ($staged.Count -ne 1 -or $staged[0] -cne 'host/update_engine.py') { throw 'Retry GREEN staged path mismatch' }; & $git -C $root diff --cached --check; if ($LASTEXITCODE -ne 0) { throw 'Retry GREEN diff check failed' }; & $git -C $root commit -m 'fix(update): retry locked preparing promotion'; if ($LASTEXITCODE -ne 0) { throw 'Retry GREEN commit failed' }
```

Expected: exactly `host/update_engine.py` is committed; the RED test blob is
unchanged and status is clean.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $subject=(& $git -C $root show -s --format=%s HEAD).Trim(); $paths=@(& $git -C $root diff-tree --no-commit-id --name-only -r HEAD); if($subject -cne 'fix(update): retry locked preparing promotion' -or $paths.Count -ne 1 -or $paths[0] -cne 'host/update_engine.py'){ throw 'Retry GREEN commit mismatch' }; & $git -C $root diff --quiet HEAD^ HEAD -- 'host/test_update_engine_resume.py'; if($LASTEXITCODE -ne 0){ throw 'RED test changed in retry GREEN' }; if(@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw 'Worktree is not clean after retry GREEN' }
```

### 9.5 Verify the Reviewed Product Head

Run every command independently from the repository root. Record actual command,
exit code, test count, pass/fail/skip count, build result, and hashes in the
report. Do not use package-runner or package-exec fallbacks, install
dependencies, or access a network. Use only lock-installed npm scripts or
absolute local Node entries. If a build
updates only ignored `extension/dist`, that output is permitted; do not stage it.

- [ ] **Step 1: Public asset contract, build, and source/dist identity**

```powershell
& "C:\Program Files\nodejs\node.exe" --test "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\test\defaultItems.test.mjs"
```

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build --prefix "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension"
```

```powershell
$ErrorActionPreference='Stop'; $source='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\items.json'; $built='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\dist\items.json'; if (-not (Test-Path -LiteralPath $built -PathType Leaf)) { throw 'Built public asset is absent' }; $sourceHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.ToLowerInvariant(); $builtHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $built).Hash.ToLowerInvariant(); if ($sourceHash -cne '839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25' -or $builtHash -cne $sourceHash) { throw "Public asset hash mismatch: source=$sourceHash dist=$builtHash" }
```

Expected: five Node tests pass, production build succeeds, and source/dist hashes
both equal `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`.

- [ ] **Step 2: Task 6 current-state tests and TypeScript**

```powershell
& "C:\Program Files\nodejs\npm.cmd" run test:run --prefix "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension" -- src/utils/pageIdentity.test.ts src/components/FAB.pageIdentity.test.tsx src/components/FAB.spinner.test.tsx src/hooks/useAnalysisHydration.test.ts --reporter=verbose
```

```powershell
& "C:\Program Files\nodejs\node.exe" "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\node_modules\typescript\bin\tsc" --noEmit -p "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension\tsconfig.json"
```

Expected: all selected tests pass and TypeScript exits `0`. This is current-state
coverage only; record no historical reconstruction claim. Confirm the Task 6
titles `switches identity from A to B while Analyze is busy`, `contains throwing
identity accessors`, `replaces a user-edited A textarea with B after busy Analyze
completes`, and `clears A hydration while deferred B hydration is pending` pass.

- [ ] **Step 3: Task 7 current-state Extension and isolated Host tests**

```powershell
& "C:\Program Files\nodejs\npm.cmd" run test:run --prefix "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension" -- src/utils/analyzeRequest.test.ts src/background/contextMenu.test.ts src/components/FAB.analyzeRequest.test.tsx src/components/FAB.spinner.test.tsx src/components/FAB.promptSourceErrors.test.tsx src/components/FAB.userPrompt.test.tsx src/components/FAB.bookmarkTelemetry.test.tsx --reporter=verbose
```

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $sandbox=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-e-task7-'+[guid]::NewGuid().ToString('N')); $names=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP'); $managed=@($names+'PYTHONPATH'); $saved=@{}; $present=@{}; $processEnv=[Environment]::GetEnvironmentVariables('Process'); $exit=99; try { New-Item -ItemType Directory -Path $sandbox | Out-Null; foreach($name in $managed){ $present[$name]=$processEnv.Contains($name); $saved[$name]=if($present[$name]){[string]$processEnv[$name]}else{$null} }; foreach($name in $names){ $path=Join-Path $sandbox $name.ToLowerInvariant(); New-Item -ItemType Directory -Path $path | Out-Null; [Environment]::SetEnvironmentVariable($name,$path,'Process') }; $env:PYTHONPATH=Join-Path $root 'host'; & "$root\host\venv\Scripts\python.exe" -m unittest host.test_session_workspace host.test_prompt_session -v; $exit=$LASTEXITCODE } finally { foreach($name in $managed){ if($present[$name]){ [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') } else { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue } }; if(Test-Path -LiteralPath $sandbox){ Remove-Item -LiteralPath $sandbox -Recurse -Force } }; if($exit -ne 0){ throw "Task 7 Host tests failed: $exit" }
```

Expected: all selected Extension and Host tests pass, no skip, and the Host runs
with six distinct fresh disposable state/temp directories. Record the Extension
title `applies an explicit empty Root to exactly one request` and these four
Task 7 Host selectors as passing within the module output:
`test_explicit_empty_analyze_root_overrides_config_for_one_request`,
`test_request_after_explicit_empty_without_marker_uses_configured_root`,
`test_malformed_explicit_marker_uses_legacy_fallback`, and
`test_explicit_marker_with_non_string_root_uses_legacy_fallback`.

- [ ] **Step 4: Retry and all update-engine tests**

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "import pathlib,sys,unittest; sys.path.insert(0,str(pathlib.Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host'))); unittest.main(module=None)" "host.test_update_engine_resume.PreparingPromotionRetryTests" -v
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m unittest discover -s "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host" -p "test_update_engine*.py" -v
```

Expected: focused `8/8` and all update-engine tests pass with no skip.

- [ ] **Step 5: All Extension tests and production build**

```powershell
& "C:\Program Files\nodejs\npm.cmd" run test:run --prefix "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension" -- --reporter=verbose
```

Expected: all Extension tests pass with no failed/pending tests.

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build --prefix "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\extension"
```

Expected: the production build exits `0` after the complete Extension suite.

- [ ] **Step 6: Full isolated Host discovery and compile**

Run discovery through one parsing harness so the allowed skip is enforced, not
merely inspected by eye. The harness creates six fresh sibling directories,
passes them to the Host child, captures complete output, and removes only that
owned sandbox in `finally`:

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $sandbox=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-e-host-'+[guid]::NewGuid().ToString('N')); $names=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP'); $managed=@($names+'PYTHONPATH'+'PYTHONDONTWRITEBYTECODE'+'DH_PLAN_C_FROZEN_ONEDIR'); $saved=@{}; $present=@{}; $processEnv=[Environment]::GetEnvironmentVariables('Process'); $output=''; $exit=99; try { New-Item -ItemType Directory -Path $sandbox | Out-Null; foreach($name in $managed){ $present[$name]=$processEnv.Contains($name); $saved[$name]=if($present[$name]){[string]$processEnv[$name]}else{$null} }; foreach($name in $names){ $value=Join-Path $sandbox $name.ToLowerInvariant(); New-Item -ItemType Directory -Path $value | Out-Null; [Environment]::SetEnvironmentVariable($name,$value,'Process') }; $env:PYTHONPATH=Join-Path $root 'host'; $env:PYTHONDONTWRITEBYTECODE='1'; Remove-Item -LiteralPath 'Env:DH_PLAN_C_FROZEN_ONEDIR' -ErrorAction SilentlyContinue; $output=(& "$root\host\venv\Scripts\python.exe" -m unittest discover -s "$root\host" -p 'test_*.py' -v 2>&1 | Out-String); $exit=$LASTEXITCODE } finally { foreach($name in $managed){ if($present[$name]){ [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') } else { Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue } }; if(Test-Path -LiteralPath $sandbox){ Remove-Item -LiteralPath $sandbox -Recurse -Force } }; $output; $skips=@($output -split "`r?`n" | Where-Object { $_ -match ' \.\.\. skipped ' }); $selector='test_complete_built_runtime_starts_and_matches_target_without_live_mutation'; if($exit -ne 0 -or $skips.Count -ne 1 -or $skips[0] -notlike "*$selector*" -or $skips[0] -notlike "*DH_PLAN_C_FROZEN_ONEDIR not set*"){ throw "Full Host discovery or exact skip validation failed: exit=$exit skips=$($skips -join ' | ')" }
```

Expected: all tests pass. Exactly one skip is required and authorized:
`host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation`
with reason `DH_PLAN_C_FROZEN_ONEDIR not set`; zero skips, more than one skip, or
any other selector/reason blocks completion. Capture the complete output when
checking this condition.

```powershell
$ErrorActionPreference='Stop'; $cache=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-e-pycache-'+[guid]::NewGuid().ToString('N')); $processEnv=[Environment]::GetEnvironmentVariables('Process'); $present=$processEnv.Contains('PYTHONPYCACHEPREFIX'); $saved=if($present){[string]$processEnv['PYTHONPYCACHEPREFIX']}else{$null}; $exit=99; try { New-Item -ItemType Directory -Path $cache | Out-Null; $env:PYTHONPYCACHEPREFIX=$cache; & "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -m compileall -q "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host"; $exit=$LASTEXITCODE } finally { if($present){ [Environment]::SetEnvironmentVariable('PYTHONPYCACHEPREFIX',$saved,'Process') } else { Remove-Item -LiteralPath 'Env:PYTHONPYCACHEPREFIX' -ErrorAction SilentlyContinue }; if(Test-Path -LiteralPath $cache){ Remove-Item -LiteralPath $cache -Recurse -Force } }; if($exit -ne 0){ throw "Host compileall failed: $exit" }
```

Expected: exit `0`, no diagnostics.

- [ ] **Step 7: Native-message structural safety scans**

The one-line Python command below uses explicit `SystemExit` checks, scans
`ownData.ts`, `safeErrorText.ts`, `analyzeRequestHandler.ts`,
`nativeMessageWire.ts`, and the `NATIVE_MSG` Worker branch, and self-mutates each
required detector in memory to prove a disabled descriptor, coercion,
reserved-key, Analyze route, non-Analyze route, wire-helper route, or sender
allowlist check is rejected. Decode the inline payload before execution if
inspection is needed; it writes no file:

The decoded script has these reviewable checks:

```python
def fail(message):
    raise SystemExit(message)


required = (
    ("own", "Object.getOwnPropertyDescriptor"),
    ("own", "Object.hasOwn(descriptor, 'value')"),
    ("guard", "Object.getOwnPropertyDescriptors(inner)"),
    ("guard", "key === '_persist' || key === 'extension_warnings' || key === 'toJSON'"),
    ("guard", "Object.freeze(output)"),
    ("wire", "Object.getOwnPropertyDescriptors(forwarded)"),
    ("wire", "Object.defineProperty(wire, 'requestId'"),
    ("wire", "Object.freeze(wire)"),
    ("worker", "postNativeMessageWire(forwarded"),
)
no_coercion_inputs = ("ownData.ts", "safeErrorText.ts", "analyzeRequestHandler.ts", "nativeMessageWire.ts")
required_route_calls = (
    "isAnalyzePayload(inner)",
    "handleAnalyzeRequest(inner",
    "guardNonAnalyzeNativeMessage(inner)",
    "sendNativeMessage(guarded.forwarded)",
)
allowed_direct_sends = (
    ("background/nativeMessageWire.ts", "deps.postMessage(wire)"),
    ("background/serviceWorker.ts", "port.postMessage(message)"),
)
self_check_mutations = (
    "disable own-property descriptor check",
    "inject String coercion",
    "disable reserved metadata rejection",
    "disable final-wire freeze",
    "disable Analyze route",
    "disable non-Analyze guard route",
    "disable Worker final-wire helper call",
    "add a rogue direct port send",
)
```

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "exec(__import__('base64').b64decode('ZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCmltcG9ydCByZQoKCmRlZiBmYWlsKG1lc3NhZ2UpOgogICAgcmFpc2UgU3lzdGVtRXhpdChtZXNzYWdlKQoKCnJvb3QgPSBQYXRoKHIiQzpcTXlXb3JrYmVuY2hcUmVwb3NpdG9yeVxEeW5hbWljcy1IZWxwZXItcHJvbXB0LXNjb3BlLXNwZWNcZXh0ZW5zaW9uXHNyYyIpCnJlYWQgPSBsYW1iZGEgdmFsdWU6IChyb290IC8gdmFsdWUpLnJlYWRfdGV4dChlbmNvZGluZz0idXRmLTgiKQpvd24gPSByZWFkKCJ1dGlscy9vd25EYXRhLnRzIikKc2FmZSA9IHJlYWQoInV0aWxzL3NhZmVFcnJvclRleHQudHMiKQpndWFyZCA9IHJlYWQoImJhY2tncm91bmQvYW5hbHl6ZVJlcXVlc3RIYW5kbGVyLnRzIikKd2lyZSA9IHJlYWQoImJhY2tncm91bmQvbmF0aXZlTWVzc2FnZVdpcmUudHMiKQp3b3JrZXIgPSByZWFkKCJiYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiKQoKCmRlZiBhY2NlcHRzKHNvdXJjZXMsIGV4cGVjdGVkX3Bvc3RzKToKICAgIHZhbHVlcyA9IGRpY3QoemlwKCgib3duIiwgInNhZmUiLCAiZ3VhcmQiLCAid2lyZSIsICJ3b3JrZXIiKSwgc291cmNlcykpCiAgICByZXF1aXJlZCA9ICgKICAgICAgICAoIm93biIsICJPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiksCiAgICAgICAgKCJvd24iLCAiT2JqZWN0Lmhhc093bihkZXNjcmlwdG9yLCAndmFsdWUnKSIpLAogICAgICAgICgiZ3VhcmQiLCAiT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoaW5uZXIpIiksCiAgICAgICAgKCJndWFyZCIsICJrZXkgPT09ICdfcGVyc2lzdCcgfHwga2V5ID09PSAnZXh0ZW5zaW9uX3dhcm5pbmdzJyB8fCBrZXkgPT09ICd0b0pTT04nIiksCiAgICAgICAgKCJndWFyZCIsICJPYmplY3QuZnJlZXplKG91dHB1dCkiKSwKICAgICAgICAoIndpcmUiLCAiT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZm9yd2FyZGVkKSIpLAogICAgICAgICgid2lyZSIsICJPYmplY3QuZGVmaW5lUHJvcGVydHkod2lyZSwgJ3JlcXVlc3RJZCciKSwKICAgICAgICAoIndpcmUiLCAiT2JqZWN0LmZyZWV6ZSh3aXJlKSIpLAogICAgICAgICgid29ya2VyIiwgInBvc3ROYXRpdmVNZXNzYWdlV2lyZShmb3J3YXJkZWQiKSwKICAgICkKICAgIGlmIG5vdCBhbGwobmVlZGxlIGluIHZhbHVlc1tuYW1lXSBmb3IgbmFtZSwgbmVlZGxlIGluIHJlcXVpcmVkKToKICAgICAgICByZXR1cm4gRmFsc2UKICAgIGlmIHJlLnNlYXJjaCgKICAgICAgICByIlxiKD86U3RyaW5nfEpTT05cLnN0cmluZ2lmeSlccypcKHxcLnRvU3RyaW5nXHMqXCgiLAogICAgICAgIHZhbHVlc1sib3duIl0gKyB2YWx1ZXNbInNhZmUiXSArIHZhbHVlc1siZ3VhcmQiXSArIHZhbHVlc1sid2lyZSJdLAogICAgKToKICAgICAgICByZXR1cm4gRmFsc2UKICAgIHJvdXRlID0gcmUuc2VhcmNoKAogICAgICAgIHInaWYgXChtZXNzYWdlXC50eXBlID09PSAiTkFUSVZFX01TRyJcKSBceyg/UDxib2R5Pi4qPylcbiAgICBcfScsCiAgICAgICAgdmFsdWVzWyJ3b3JrZXIiXSwKICAgICAgICByZS5TLAogICAgKQogICAgaWYgcm91dGUgaXMgTm9uZSBvciBub3QgYWxsKAogICAgICAgIG5lZWRsZSBpbiByb3V0ZS5ncm91cCgiYm9keSIpCiAgICAgICAgZm9yIG5lZWRsZSBpbiAoCiAgICAgICAgICAgICJpc0FuYWx5emVQYXlsb2FkKGlubmVyKSIsCiAgICAgICAgICAgICJoYW5kbGVBbmFseXplUmVxdWVzdChpbm5lciIsCiAgICAgICAgICAgICJndWFyZE5vbkFuYWx5emVOYXRpdmVNZXNzYWdlKGlubmVyKSIsCiAgICAgICAgICAgICJzZW5kTmF0aXZlTWVzc2FnZShndWFyZGVkLmZvcndhcmRlZCkiLAogICAgICAgICkKICAgICk6CiAgICAgICAgcmV0dXJuIEZhbHNlCiAgICByZXR1cm4gZXhwZWN0ZWRfcG9zdHMgPT0gWwogICAgICAgICgiYmFja2dyb3VuZC9uYXRpdmVNZXNzYWdlV2lyZS50cyIsICJkZXBzLnBvc3RNZXNzYWdlKHdpcmUpIiksCiAgICAgICAgKCJiYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiLCAicG9ydC5wb3N0TWVzc2FnZShtZXNzYWdlKSIpLAogICAgXQoKCmZpbGVzID0gKAogICAgcGF0aAogICAgZm9yIHBhdGggaW4gcm9vdC5yZ2xvYigiKiIpCiAgICBpZiBwYXRoLnN1ZmZpeCBpbiAoIi50cyIsICIudHN4IikgYW5kICIudGVzdC4iIG5vdCBpbiBwYXRoLm5hbWUKKQpwb3N0cyA9IFsKICAgIChwYXRoLnJlbGF0aXZlX3RvKHJvb3QpLmFzX3Bvc2l4KCksIGxpbmUuc3RyaXAoKSkKICAgIGZvciBwYXRoIGluIGZpbGVzCiAgICBmb3IgbGluZSBpbiBwYXRoLnJlYWRfdGV4dChlbmNvZGluZz0idXRmLTgiKS5zcGxpdGxpbmVzKCkKICAgIGlmIHJlLnNlYXJjaChyIlwucG9zdE1lc3NhZ2VccypcKCIsIGxpbmUpCl0KYmFzZWxpbmUgPSAob3duLCBzYWZlLCBndWFyZCwgd2lyZSwgd29ya2VyKQppZiBub3QgYWNjZXB0cyhiYXNlbGluZSwgcG9zdHMpOgogICAgZmFpbCgiYmFzZWxpbmUgTmF0aXZlLW1lc3NhZ2Ugc3RydWN0dXJhbCBwcmVkaWNhdGUgZmFpbGVkIikKbXV0YXRpb25zID0gKAogICAgKDAsICJPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwgIk9iamVjdC5nZXRQcm90b3R5cGVPZiIpLAogICAgKDEsICJyZXR1cm4gY2FuZGlkYXRlIiwgInJldHVybiBTdHJpbmcoY2FuZGlkYXRlKSIpLAogICAgKDIsICJrZXkgPT09ICdfcGVyc2lzdCciLCAia2V5ID09PSAnX3VudXNlZCciKSwKICAgICgzLCAiT2JqZWN0LmZyZWV6ZSh3aXJlKSIsICJ2b2lkIHdpcmUiKSwKICAgICg0LCAiaGFuZGxlQW5hbHl6ZVJlcXVlc3QoaW5uZXIiLCAiaGFuZGxlQW5hbHl6ZVJlcXVlc3REaXNhYmxlZChpbm5lciIpLAogICAgKDQsICJndWFyZE5vbkFuYWx5emVOYXRpdmVNZXNzYWdlKGlubmVyKSIsICJndWFyZERpc2FibGVkKGlubmVyKSIpLAogICAgKDQsICJwb3N0TmF0aXZlTWVzc2FnZVdpcmUoZm9yd2FyZGVkIiwgInBvc3ROYXRpdmVNZXNzYWdlV2lyZURpc2FibGVkKGZvcndhcmRlZCIpLAopCmZvciBpbmRleCwgb2xkLCBuZXcgaW4gbXV0YXRpb25zOgogICAgaWYgYmFzZWxpbmVbaW5kZXhdLmNvdW50KG9sZCkgIT0gMToKICAgICAgICBmYWlsKGYic2VsZi1jaGVjayBhbmNob3IgbWlzbWF0Y2g6IHtvbGR9IikKICAgIGNoYW5nZWQgPSBsaXN0KGJhc2VsaW5lKQogICAgY2hhbmdlZFtpbmRleF0gPSBjaGFuZ2VkW2luZGV4XS5yZXBsYWNlKG9sZCwgbmV3KQogICAgaWYgYWNjZXB0cyh0dXBsZShjaGFuZ2VkKSwgcG9zdHMpOgogICAgICAgIGZhaWwoZiJzZWxmLWNoZWNrIG11dGF0aW9uIGVzY2FwZWQ6IHtvbGR9IikKZXh0cmFfcG9zdHMgPSBwb3N0cyArIFsoImJhY2tncm91bmQvcm9ndWUudHMiLCAicG9ydC5wb3N0TWVzc2FnZShtZXNzYWdlKSIpXQppZiBhY2NlcHRzKGJhc2VsaW5lLCBleHRyYV9wb3N0cyk6CiAgICBmYWlsKCJkaXJlY3Qtc2VuZCBhbGxvd2xpc3Qgc2VsZi1jaGVjayBlc2NhcGVkIikKcHJpbnQoIk5hdGl2ZS1tZXNzYWdlIHN0cnVjdHVyYWwgc2FmZXR5OiBQQVNTIikK'))"
```

Expected: exactly `Native-message structural safety: PASS`. The Python payload
contains no `assert`; every failed invariant exits explicitly through
`SystemExit`. This checks the
descriptor-safe own-property primitive, no-coercion fallback/guard boundary,
reserved metadata rejection, frozen final-wire construction, Worker routing
through `postNativeMessageWire`, and the sole reviewed direct
`port.postMessage(message)` adapter call. Any additional direct production
`.postMessage(` call blocks completion.

- [ ] **Step 8: Diff and status**

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" diff --check "0dbb4852931b50153fb898b03129ae0092c46404..HEAD"
```

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec" status --short
```

Expected: diff check exits `0`; status is empty before review/report authoring.

### 9.6 Obtain One Fresh Independent Review

- [ ] Dispatch one fresh reviewer after all product/test commits and verification

Resolve the full current product HEAD immediately before dispatch. Review the
exact range from Plan E base `0dbb4852931b50153fb898b03129ae0092c46404` to that
literal full SHA, not only the latest commit. Supply the authoritative
correction, Windows retry design, this plan, complete range diff, and relevant
tests. Require the review output to repeat that exact SHA and use this exact
heading order; save its exact UTF-8 text outside the repository at
`C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-task9-review.md`:

```text
## Review Base
## Reviewed Product HEAD
## Critical
## Important
## Minor
## Testing Gaps
## Disposition
```

The review prioritizes correctness bugs, security/trust boundaries, data loss,
race/crash safety, Windows behavior, regressions, and missing tests. Record the
review session identifier if the review system supplies one. `Review Base` must
be the literal Plan E base; `Reviewed Product HEAD` must be one lowercase
40-hex SHA; `Critical` and `Important` must each be exactly `None.` for
acceptance; `Minor` and `Testing Gaps` contain `None.` or concrete findings; and
`Disposition` must be exactly `PASS`. One fresh reviewer is required; do not
claim cryptographic proof of identity or independence.

Any Critical or Important finding blocks. Fix it with focused TDD only after its
scope is authorized, commit the fix normally, rerun all affected focused tests
plus section 9.5, then obtain a fresh review of the new complete range. Minor
findings and testing gaps remain explicit residual risks unless fixed and
rereviewed. This review proves current Plan E state only. Final whole-branch and
release-readiness review remains pending until Plan D is complete.

- [ ] **Verify the review is bound to unchanged HEAD before report creation**

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $review='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-task9-review.md'; if(-not (Test-Path -LiteralPath $review -PathType Leaf)){ throw 'Review output is absent' }; $reviewBytes=[IO.File]::ReadAllBytes($review); $text=[Text.UTF8Encoding]::new($false,$true).GetString($reviewBytes); $reviewHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($reviewBytes)).ToLowerInvariant(); $expected=@('## Review Base','## Reviewed Product HEAD','## Critical','## Important','## Minor','## Testing Gaps','## Disposition'); $headings=@([regex]::Matches($text,'(?m)^## .+$')|ForEach-Object Value); if(($headings -join "`n") -cne ($expected -join "`n")){ throw 'Review headings/order mismatch' }; $base=[regex]::Match($text,'(?m)^## Review Base\r?\n(0dbb4852931b50153fb898b03129ae0092c46404)$'); $head=[regex]::Match($text,'(?m)^## Reviewed Product HEAD\r?\n([0-9a-f]{40})$'); $critical=[regex]::Match($text,'(?ms)^## Critical\r?\n(.*?)(?=\r?\n## Important\r?$)').Groups[1].Value.Trim(); $important=[regex]::Match($text,'(?ms)^## Important\r?\n(.*?)(?=\r?\n## Minor\r?$)').Groups[1].Value.Trim(); $disposition=[regex]::Match($text,'(?ms)^## Disposition\r?\n(.*?)\s*\z').Groups[1].Value.Trim(); $current=(& $git -C $root rev-parse HEAD).Trim(); if(-not $base.Success -or -not $head.Success -or $head.Groups[1].Value -cne $current -or $critical -cne 'None.' -or $important -cne 'None.' -or $disposition -cne 'PASS' -or @(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw 'Review byte snapshot is not a passing review of the unchanged product HEAD' }; "Reviewed product HEAD: $current"; "Review SHA-256: $reviewHash"
```

Expected: prints the reviewed HEAD and same-snapshot SHA-256. It reads review bytes once,
strict-decodes and hashes those bytes; do not create the report if HEAD differs.

### 9.7 Write and Commit the Concise Final Report

- [ ] **Step 1: Create exactly one report**

Use `apply_patch` to create only
`.superpowers/sdd/plan-e-extension-hardening-report.md`. Keep it concise and
fact-based. Verify that this report path does not already exist; never overwrite
or delete a pre-existing report or any recovery source. Use these exact
title and level-two sections:

```text
# Plan E Extension Data and Request Hardening Report

## Scope and Authority
## Commit Map
## Historical Evidence Boundary
## Abandoned Executor
## Windows Retry RED
## Windows Retry GREEN
## Mutation Results
## Verification Results
## Independent Review
## Residual Risks
## Forbidden Operations
## Verdicts
```

Record actual observations, never prospective results:

- Full SHAs and exact subjects for the accepted correction, this plan, executor
  deletion, retry RED, retry GREEN, and any authorized review fix. The report itself records exact
  subject `docs(verification): record Plan E hardening evidence`, not its own
  SHA because that value cannot be embedded in its contents.
- `ed06da102e3c11cfe53ec17ef50e97252037f624` as abandoned RED, never GREEN or
  product evidence, plus the forward deletion commit.
- The seven independent assertion RED results and constructor control; eight
  GREEN tests; full resume/update-engine results; each named mutation failure
  and restored GREEN result.
- Exact verification commands, exit codes, observed test/build totals, source/
  dist asset hashes, exact authorized Host skip, compile/static/diff results,
  and reviewed product head.
- Task 6 expected hash
  `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef`, Task 7
  expected hash
  `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f`,
  `UNRECOVERABLE`, and `HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`.
- Review base/head, Critical/Important/Minor/testing-gap findings, disposition,
  fixes/reruns if any, and final whole-branch review still pending Plan D.
- Exact lines `Reviewed product HEAD: <reviewed SHA>`,
  `Review SHA-256: <64-lowercase-hex>`, `Critical: None.`,
  `Important: None.`, and `Review disposition: PASS` copied from the validated
  review facts.
- Residual risks: unavailable Task 6/7 reports, bounded Windows filesystem or
  antivirus timing, the environment-dependent frozen-runtime skip, accepted
  Minor/testing-gap findings, and Plan D/final review still outstanding.
- Confirmation that no push, release, publish, tag, install, registry, AppData,
  browser, network, real update, MyCases, authenticated model, history rewrite,
  recovery-source deletion, or other forbidden operation occurred.

End `## Verdicts` with exactly:

```text
PLAN E CURRENT-STATE VERIFICATION: PASS
TASK 6/7 HISTORICAL EVIDENCE: UNRECOVERABLE; NOT RECONSTRUCTED
RELEASE READINESS: NOT CLAIMED
```

Do not include a report self-SHA, final commit SHA, future-result claim, custom
evidence inventory, or reconstructed historical evidence.

- [ ] **Step 2: Validate the report and immutable reviewed head**

The report has one reviewed-HEAD line. This single foreground validator reads the review
once as bytes, strict-decodes/validates and hashes those bytes, then checks current HEAD,
exact ordered report headings/facts/verdicts, no placeholders, and no tracked dirt:

```powershell
& "C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\host\venv\Scripts\python.exe" -c "exec(__import__('base64').b64decode('ZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCmltcG9ydCBoYXNobGliCmltcG9ydCByZQppbXBvcnQgc3VicHJvY2VzcwoKCmRlZiBmYWlsKG1lc3NhZ2UpOgogICAgcmFpc2UgU3lzdGVtRXhpdChtZXNzYWdlKQoKCmdpdCA9IHIiQzpcUHJvZ3JhbSBGaWxlc1xHaXRcY21kXGdpdC5leGUiCnJvb3QgPSBQYXRoKHIiQzpcTXlXb3JrYmVuY2hcUmVwb3NpdG9yeVxEeW5hbWljcy1IZWxwZXItcHJvbXB0LXNjb3BlLXNwZWMiKQpyZXBvcnRfcGF0aCA9IHJvb3QgLyAiLnN1cGVycG93ZXJzL3NkZC9wbGFuLWUtZXh0ZW5zaW9uLWhhcmRlbmluZy1yZXBvcnQubWQiCnJldmlld19wYXRoID0gUGF0aChyIkM6XFVzZXJzXHpoYW9ib1xBcHBEYXRhXExvY2FsXFRlbXBcb3BlbmNvZGVccGxhbi1lLXRhc2s5LXJldmlldy5tZCIpCmlmIG5vdCByZXBvcnRfcGF0aC5pc19maWxlKCkgb3Igbm90IHJldmlld19wYXRoLmlzX2ZpbGUoKToKICAgIGZhaWwoInJlcG9ydCBvciByZXZpZXcgb3V0cHV0IGlzIGFic2VudCIpCnJlcG9ydCA9IHJlcG9ydF9wYXRoLnJlYWRfdGV4dChlbmNvZGluZz0idXRmLTgiKQpyZXZpZXdfYnl0ZXMgPSByZXZpZXdfcGF0aC5yZWFkX2J5dGVzKCkKcmV2aWV3ID0gcmV2aWV3X2J5dGVzLmRlY29kZSgidXRmLTgiLCBlcnJvcnM9InN0cmljdCIpCnJldmlld19oYXNoID0gaGFzaGxpYi5zaGEyNTYocmV2aWV3X2J5dGVzKS5oZXhkaWdlc3QoKQp0aXRsZSA9ICIjIFBsYW4gRSBFeHRlbnNpb24gRGF0YSBhbmQgUmVxdWVzdCBIYXJkZW5pbmcgUmVwb3J0IgpoZWFkaW5ncyA9IFsKICAgICIjIyBTY29wZSBhbmQgQXV0aG9yaXR5IiwKICAgICIjIyBDb21taXQgTWFwIiwKICAgICIjIyBIaXN0b3JpY2FsIEV2aWRlbmNlIEJvdW5kYXJ5IiwKICAgICIjIyBBYmFuZG9uZWQgRXhlY3V0b3IiLAogICAgIiMjIFdpbmRvd3MgUmV0cnkgUkVEIiwKICAgICIjIyBXaW5kb3dzIFJldHJ5IEdSRUVOIiwKICAgICIjIyBNdXRhdGlvbiBSZXN1bHRzIiwKICAgICIjIyBWZXJpZmljYXRpb24gUmVzdWx0cyIsCiAgICAiIyMgSW5kZXBlbmRlbnQgUmV2aWV3IiwKICAgICIjIyBSZXNpZHVhbCBSaXNrcyIsCiAgICAiIyMgRm9yYmlkZGVuIE9wZXJhdGlvbnMiLAogICAgIiMjIFZlcmRpY3RzIiwKXQpyZXZpZXdfaGVhZGluZ3MgPSBbCiAgICAiIyMgUmV2aWV3IEJhc2UiLAogICAgIiMjIFJldmlld2VkIFByb2R1Y3QgSEVBRCIsCiAgICAiIyMgQ3JpdGljYWwiLAogICAgIiMjIEltcG9ydGFudCIsCiAgICAiIyMgTWlub3IiLAogICAgIiMjIFRlc3RpbmcgR2FwcyIsCiAgICAiIyMgRGlzcG9zaXRpb24iLApdCmlmIG5vdCByZXBvcnQuc3RhcnRzd2l0aCh0aXRsZSArICJcbiIpOgogICAgZmFpbCgicmVwb3J0IHRpdGxlIGlzIGludmFsaWQiKQppZiByZS5maW5kYWxsKHIiKD9tKV4jIyAuKyQiLCByZXBvcnQpICE9IGhlYWRpbmdzOgogICAgZmFpbCgicmVwb3J0IGhlYWRpbmdzL29yZGVyIGFyZSBpbnZhbGlkIikKaWYgcmUuZmluZGFsbChyIig/bSleIyMgLiskIiwgcmV2aWV3KSAhPSByZXZpZXdfaGVhZGluZ3M6CiAgICBmYWlsKCJyZXZpZXcgaGVhZGluZ3Mvb3JkZXIgYXJlIGludmFsaWQiKQpiYXNlID0gcmUuZmluZGFsbChyIig/bSleIyMgUmV2aWV3IEJhc2Vccj9cbigwZGJiNDg1MjkzMWI1MDE1M2ZiODk4YjAzMTI5YWUwMDkyYzQ2NDA0KSQiLCByZXZpZXcpCnJlcG9ydF9oZWFkcyA9IHJlLmZpbmRhbGwociIoP20pXlJldmlld2VkIHByb2R1Y3QgSEVBRDogKFswLTlhLWZdezQwfSkkIiwgcmVwb3J0KQpyZXZpZXdfaGVhZHMgPSByZS5maW5kYWxsKHIiKD9tKV4jIyBSZXZpZXdlZCBQcm9kdWN0IEhFQURccj9cbihbMC05YS1mXXs0MH0pJCIsIHJldmlldykKcmVwb3J0X2hhc2hlcyA9IHJlLmZpbmRhbGwociIoP20pXlJldmlldyBTSEEtMjU2OiAoWzAtOWEtZl17NjR9KSQiLCByZXBvcnQpCmNyaXRpY2FsID0gcmUuZmluZGFsbChyIig/bXMpXiMjIENyaXRpY2FsXHI/XG4oLio/KSg/PVxyP1xuIyMgSW1wb3J0YW50XHI/JCkiLCByZXZpZXcpCmltcG9ydGFudCA9IHJlLmZpbmRhbGwociIoP21zKV4jIyBJbXBvcnRhbnRccj9cbiguKj8pKD89XHI/XG4jIyBNaW5vclxyPyQpIiwgcmV2aWV3KQpkaXNwb3NpdGlvbiA9IHJlLmZpbmRhbGwociIoP21zKV4jIyBEaXNwb3NpdGlvblxyP1xuKC4qPylccypcWiIsIHJldmlldykKaWYgKAogICAgbGVuKGJhc2UpICE9IDEKICAgIG9yIGxlbihyZXBvcnRfaGVhZHMpICE9IDEKICAgIG9yIGxlbihyZXZpZXdfaGVhZHMpICE9IDEKICAgIG9yIHJlcG9ydF9oZWFkcyAhPSByZXZpZXdfaGVhZHMKICAgIG9yIHJlcG9ydF9oYXNoZXMgIT0gW3Jldmlld19oYXNoXQogICAgb3IgW3ZhbHVlLnN0cmlwKCkgZm9yIHZhbHVlIGluIGNyaXRpY2FsXSAhPSBbIk5vbmUuIl0KICAgIG9yIFt2YWx1ZS5zdHJpcCgpIGZvciB2YWx1ZSBpbiBpbXBvcnRhbnRdICE9IFsiTm9uZS4iXQogICAgb3IgW3ZhbHVlLnN0cmlwKCkgZm9yIHZhbHVlIGluIGRpc3Bvc2l0aW9uXSAhPSBbIlBBU1MiXQopOgogICAgZmFpbCgicmVwb3J0L3JldmlldyBieXRlLXNuYXBzaG90IGJpbmRpbmcgaXMgaW52YWxpZCIpCmN1cnJlbnQgPSBzdWJwcm9jZXNzLmNoZWNrX291dHB1dChbZ2l0LCAiLUMiLCBzdHIocm9vdCksICJyZXYtcGFyc2UiLCAiSEVBRCJdLCB0ZXh0PVRydWUpLnN0cmlwKCkKaWYgY3VycmVudCAhPSByZXBvcnRfaGVhZHNbMF06CiAgICBmYWlsKCJIRUFEIGNoYW5nZWQgYWZ0ZXIgcmV2aWV3IikKcmVxdWlyZWQgPSAoCiAgICAiMzE1OGE1Nzk1Yjc2ODQzNGUwNjllOGVmNTllNDg4ZTBhOWZmODc3OTM5NzI4ZjY5ZDkyOTNhYjBjOGI5YzhlZiIsCiAgICAiNDllZTRmYjBhNDcxN2Y4NTc2N2VkMTljYWY1MzM4ZWFjMTg3MWIyMWRlZWQyMjMzZDgyZDk3MzM3ZDMyZGYyZiIsCiAgICAiUExBTiBFIENVUlJFTlQtU1RBVEUgVkVSSUZJQ0FUSU9OOiBQQVNTIiwKICAgICJUQVNLIDYvNyBISVNUT1JJQ0FMIEVWSURFTkNFOiBVTlJFQ09WRVJBQkxFOyBOT1QgUkVDT05TVFJVQ1RFRCIsCiAgICAiUkVMRUFTRSBSRUFESU5FU1M6IE5PVCBDTEFJTUVEIiwKICAgICJSZXZpZXcgZGlzcG9zaXRpb246IFBBU1MiLAogICAgIkNyaXRpY2FsOiBOb25lLiIsCiAgICAiSW1wb3J0YW50OiBOb25lLiIsCikKZm9yIHZhbHVlIGluIHJlcXVpcmVkOgogICAgaWYgcmVwb3J0LmNvdW50KHZhbHVlKSAhPSAxOgogICAgICAgIGZhaWwoZiJtaXNzaW5nIG9yIGR1cGxpY2F0ZWQgcmVwb3J0IGZhY3Q6IHt2YWx1ZX0iKQppZiByZS5zZWFyY2goCiAgICByIig/aW0pXGIoPzpUQkR8VE9ET3xSRVBMQUNFX1dJVEh8Q0FORElEQVRFIFJFQURZfHdpbGwgcGFzc3xleHBlY3RlZCB0byBwYXNzfHRvIGJlIHJ1bilcYnw8W14+XHJcbl0rPiIsCiAgICByZXBvcnQsCik6CiAgICBmYWlsKCJyZXBvcnQgY29udGFpbnMgcGxhY2Vob2xkZXIgb3IgcHJvc3BlY3RpdmUgY2xhaW0iKQpyZXBvcnRfc3RhdHVzID0gc3VicHJvY2Vzcy5jaGVja19vdXRwdXQoCiAgICBbZ2l0LCAiLUMiLCBzdHIocm9vdCksICJzdGF0dXMiLCAiLS1wb3JjZWxhaW49djEiLCAiLXVhbGwiLCAiLS0iLCBzdHIocmVwb3J0X3BhdGgucmVsYXRpdmVfdG8ocm9vdCkpXSwKICAgIHRleHQ9VHJ1ZSwKKS5zcGxpdGxpbmVzKCkKaWYgcmVwb3J0X3N0YXR1czoKICAgIGZhaWwoZiJyZXBvcnQgcGF0aCBtdXN0IHJlbWFpbiBpZ25vcmVkL3VudHJhY2tlZCBiZWZvcmUgc3RhZ2luZzoge3JlcG9ydF9zdGF0dXN9IikKdHJhY2tlZF9zdGF0dXMgPSBzdWJwcm9jZXNzLmNoZWNrX291dHB1dCgKICAgIFtnaXQsICItQyIsIHN0cihyb290KSwgInN0YXR1cyIsICItLXBvcmNlbGFpbj12MSIsICItdW5vIl0sCiAgICB0ZXh0PVRydWUsCikuc3BsaXRsaW5lcygpCmlmIHRyYWNrZWRfc3RhdHVzOgogICAgZmFpbChmInRyYWNrZWQgd29ya3RyZWUvaW5kZXggY2hhbmdlZCBhZnRlciByZXZpZXc6IHt0cmFja2VkX3N0YXR1c30iKQpwcmludChmIlJlcG9ydCB2YWxpZGF0aW9uOiBQQVNTOyByZXZpZXdlZCBwcm9kdWN0IEhFQUQ6IHtjdXJyZW50fTsgcmV2aWV3IFNIQS0yNTY6IHtyZXZpZXdfaGFzaH0iKQo='))"
```

- [ ] **Step 3: Recheck HEAD, force-add exactly one report path, and commit**

Immediately before staging, this gate takes one new review byte snapshot, revalidates all
review fields, hashes those bytes, and compares report HEAD/hash plus current HEAD. It
cannot bind concurrently replaced bytes that it did not validate.

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $report='.superpowers/sdd/plan-e-extension-hardening-report.md'; $review='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-task9-review.md'; $reportText=[IO.File]::ReadAllText((Join-Path $root $report)); $reportHeads=@([regex]::Matches($reportText,'(?m)^Reviewed product HEAD: ([0-9a-f]{40})$')|ForEach-Object { $_.Groups[1].Value }); $reportReviewHashes=@([regex]::Matches($reportText,'(?m)^Review SHA-256: ([0-9a-f]{64})$')|ForEach-Object { $_.Groups[1].Value }); $reviewBytes=[IO.File]::ReadAllBytes($review); $reviewText=[Text.UTF8Encoding]::new($false,$true).GetString($reviewBytes); $reviewHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($reviewBytes)).ToLowerInvariant(); $expected=@('## Review Base','## Reviewed Product HEAD','## Critical','## Important','## Minor','## Testing Gaps','## Disposition'); $headings=@([regex]::Matches($reviewText,'(?m)^## .+$')|ForEach-Object Value); $base=[regex]::Match($reviewText,'(?m)^## Review Base\r?\n(0dbb4852931b50153fb898b03129ae0092c46404)$'); $reviewHeads=@([regex]::Matches($reviewText,'(?m)^## Reviewed Product HEAD\r?\n([0-9a-f]{40})$')|ForEach-Object { $_.Groups[1].Value }); $critical=[regex]::Match($reviewText,'(?ms)^## Critical\r?\n(.*?)(?=\r?\n## Important\r?$)').Groups[1].Value.Trim(); $important=[regex]::Match($reviewText,'(?ms)^## Important\r?\n(.*?)(?=\r?\n## Minor\r?$)').Groups[1].Value.Trim(); $disposition=[regex]::Match($reviewText,'(?ms)^## Disposition\r?\n(.*?)\s*\z').Groups[1].Value.Trim(); $current=(& $git -C $root rev-parse HEAD).Trim(); $dirty=@(& $git -C $root status --porcelain=v1 -uall); if(($headings -join "`n") -cne ($expected -join "`n") -or -not $base.Success -or $critical -cne 'None.' -or $important -cne 'None.' -or $disposition -cne 'PASS' -or $reportHeads.Count -ne 1 -or $reportReviewHashes.Count -ne 1 -or $reviewHeads.Count -ne 1 -or $reviewHeads[0] -cne $reportHeads[0] -or $reportReviewHashes[0] -cne $reviewHash -or $current -cne $reportHeads[0] -or $dirty.Count -ne 0){ throw 'Fresh review byte snapshot, report binding, HEAD, or worktree validation failed before staging' }; & $git -C $root add -f -- '.superpowers/sdd/plan-e-extension-hardening-report.md'; if ($LASTEXITCODE -ne 0) { throw 'Could not stage final report' }; $paths=@(& $git -C $root diff --cached --name-only --); if ($paths.Count -ne 1 -or $paths[0] -cne $report) { throw 'Final report staged path mismatch' }; & $git -C $root diff --cached --check; if ($LASTEXITCODE -ne 0) { throw 'Final report diff check failed' }; & $git -C $root commit -m 'docs(verification): record Plan E hardening evidence'; if ($LASTEXITCODE -ne 0) { throw 'Final report commit failed' }
```

- [ ] **Step 4: Verify parent, path, subject, blob, and clean state**

```powershell
$ErrorActionPreference='Stop'; $root='C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec'; $git='C:\Program Files\Git\cmd\git.exe'; $report='.superpowers/sdd/plan-e-extension-hardening-report.md'; $review='C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-e-task9-review.md'; $text=[IO.File]::ReadAllText((Join-Path $root $report)); $reviewedHeads=@([regex]::Matches($text,'(?m)^Reviewed product HEAD: ([0-9a-f]{40})$')|ForEach-Object { $_.Groups[1].Value }); $reportReviewHashes=@([regex]::Matches($text,'(?m)^Review SHA-256: ([0-9a-f]{64})$')|ForEach-Object { $_.Groups[1].Value }); $reviewBytes=[IO.File]::ReadAllBytes($review); $reviewText=[Text.UTF8Encoding]::new($false,$true).GetString($reviewBytes); $reviewHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($reviewBytes)).ToLowerInvariant(); $expected=@('## Review Base','## Reviewed Product HEAD','## Critical','## Important','## Minor','## Testing Gaps','## Disposition'); $headings=@([regex]::Matches($reviewText,'(?m)^## .+$')|ForEach-Object Value); $base=[regex]::Match($reviewText,'(?m)^## Review Base\r?\n(0dbb4852931b50153fb898b03129ae0092c46404)$'); $reviewHeads=@([regex]::Matches($reviewText,'(?m)^## Reviewed Product HEAD\r?\n([0-9a-f]{40})$')|ForEach-Object { $_.Groups[1].Value }); $critical=[regex]::Match($reviewText,'(?ms)^## Critical\r?\n(.*?)(?=\r?\n## Important\r?$)').Groups[1].Value.Trim(); $important=[regex]::Match($reviewText,'(?ms)^## Important\r?\n(.*?)(?=\r?\n## Minor\r?$)').Groups[1].Value.Trim(); $disposition=[regex]::Match($reviewText,'(?ms)^## Disposition\r?\n(.*?)\s*\z').Groups[1].Value.Trim(); $subject=(& $git -C $root show -s --format=%s HEAD).Trim(); $parent=(& $git -C $root rev-parse HEAD^).Trim(); $paths=@(& $git -C $root diff-tree --no-commit-id --name-only -r HEAD); $workHash=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $root $report)).Hash.ToLowerInvariant(); $blobHash=(& $git -C $root hash-object -- $report).Trim(); $headBlob=(& $git -C $root rev-parse "HEAD:$report").Trim(); if (($headings -join "`n") -cne ($expected -join "`n") -or -not $base.Success -or $reviewedHeads.Count -ne 1 -or $reportReviewHashes.Count -ne 1 -or $reviewHeads.Count -ne 1 -or $reviewHeads[0] -cne $reviewedHeads[0] -or $reportReviewHashes[0] -cne $reviewHash -or $critical -cne 'None.' -or $important -cne 'None.' -or $disposition -cne 'PASS' -or $parent -cne $reviewedHeads[0] -or $subject -cne 'docs(verification): record Plan E hardening evidence' -or $paths.Count -ne 1 -or $paths[0] -cne $report -or $blobHash -cne $headBlob) { throw 'Committed report parent/review snapshot/path/subject/blob verification failed' }; & $git -C $root diff --check HEAD^..HEAD; if ($LASTEXITCODE -ne 0) { throw 'Committed report diff check failed' }; if(@(& $git -C $root status --porcelain=v1 -uall).Count -ne 0){ throw 'Final worktree is not clean' }; "Committed report SHA-256: $workHash"
```

Expected: direct one-path child of reviewed HEAD; committed/working report blobs and fresh
same-snapshot review hashes match; diff/status are clean. Do not add the printed report hash.

### 9.8 Out of Scope and Definition of Done

Out of scope: any replacement evidence runner; coordination state; custom
evidence inventories; linked worktrees; custom Git finalization; Task 6/7 report
reconstruction; modification of Tasks 1-8 or accepted specs; Plan D;
release/readiness publication; dependency, version, package, installer,
registry, browser, or user-state changes.

Task 9 is `DONE` only when:

- the plan is the exact one-path direct child of the authority commit;
- the abandoned executor is visibly removed by the exact two-path forward commit;
- fresh-process and clean-clone retirement checks both report `PASS` with no
  executor/runtime residue or dirty clone; both block on pre-existing
  `plan-e-retirement-clone-*`/`plan-e-retirement-pycache-*`/
  `plan-e-retirement-stage-*`, never adopt/delete stale roots, and remove only
  invocation-owned clone/cache/stage paths;
- genuine seven-selector RED plus constructor control precedes production edit;
- retry GREEN and all five temporary mutations pass with exact byte restoration;
- all focused/full Extension, Host, build, compile, asset, structural, diff, and
  clean-status gates pass at the reviewed product head;
- one fresh independent review has no open Critical or Important findings;
- every review gate validates/hashes one strict-decoded byte snapshot and the report records
  that same-snapshot `Review SHA-256`;
- the concise report is the sole final evidence path, committed with the exact
  subject and verified against its committed blob;
- Task 6/7 remain honestly `UNRECOVERABLE` and not reconstructed; and
- no forbidden operation or recovery-source deletion occurred.

Any failed gate, unexpected skip, open Critical/Important finding, dirty or
unauthorized path, stale retirement root, failed byte restoration, historical overclaim,
or forbidden operation is `BLOCKED`. Stale roots require inspection and explicit manual
cleanup authorization; never auto-remove them. `DONE` means Plan E current-state verification only; it
does not authorize push/publish/release/install and does not claim final
whole-branch readiness before Plan D and its final review.
