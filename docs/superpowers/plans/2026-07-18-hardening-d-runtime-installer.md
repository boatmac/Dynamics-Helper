# Plan D Reliable Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the false-success legacy updater with a validated, complete Host/Extension update that automatically rolls back ordinary failures and resumes after process restarts.

**Architecture:** Reuse Plan A package validation, Plan B journal/backup/rollback, and Plan C detached runner/status recovery. Add one Host orchestration module and one Extension update state module. Keep the current updater active until one final atomic cutover.

**Tech Stack:** Python 3.13, unittest, React 19, TypeScript 5.9, Chrome MV3, Vitest 3, PyInstaller 6.22.2

---

## Working Rules

- Work in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec` on `hardening/plan-d-runtime-installer`.
- Do not modify or publish from the completed alignment release worktree.
- One milestone is active at a time. Create and update ignored `.superpowers/sdd/plan-d-reliable-update-progress.md` after each milestone.
- No feature is activated partially. Milestones 1-3 remain dormant; Milestone 4 is the only production cutover.
- Focused tests run during development. Full suites run only where this plan explicitly says so.
- A command expected to exceed five minutes starts after a time estimate; it does not wait for confirmation. Report test progress as `N/total`.
- Review each milestone at most three rounds. Stop and report after the third unresolved blocking review.
- Do not install, register, update the real product, tag, or publish without separate authorization.

## Milestone 1: Carry Forward The Released Alignment Fixes

**Files:**
- Modify: `host/dh_native_host.py`
- Modify: `host/requirements.txt`
- Modify: `host/test_model_config.py`
- Modify: `host/test_prompt_sources.py`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `docs/sdk-upgrade-2026-07-1.0.5.md`

- [ ] Write/retain focused tests for inactive DH-specific health, supported effort filtering, old model-cache normalization, hydration ordering, missing-model preservation, and StrictMode single persistence.
- [ ] Run those tests RED against the current Plan D branch.
- [ ] Port only the matching behavior from release commit `488f6f5`; keep Plan D version unchanged.
- [ ] Run focused GREEN.
- [ ] Run full Host and Extension suites in batches with cumulative progress, then `npm run build`.
- [ ] Review and commit the complete unit as `fix(alignment): carry forward released prompt boundaries`.

Expected: released alignment behavior is present before update work; no release-version or release-only file is copied.

## Milestone 2: Add A Dormant Host Update Service

**Files:**
- Create: `host/update_service.py`
- Create: `host/test_update_service.py`
- Modify: `host/package_archive.py`
- Modify: `host/test_package_archive.py`
- Modify: `host/test_update_recovery.py` only when an existing Plan C seam needs a regression test

**Public interface:**

```python
@dataclass(frozen=True)
class PreparedUpdate:
    transaction_id: str
    target_version: str
    prior_version: str

@dataclass(frozen=True)
class ActivatedUpdate:
    transaction_id: str

class UpdateService:
    def prepare(self, url: str, transaction_id: str, target_version: str) -> PreparedUpdate:
        raise AssertionError("update service interface")

    def activate(self, transaction_id: str) -> ActivatedUpdate:
        raise AssertionError("update service interface")

    def finalize(self, transaction_id: str) -> FinalizationReceipt:
        raise AssertionError("update service interface")

    def acknowledge(self, transaction_id: str) -> bool:
        raise AssertionError("update service interface")

def launch_startup_recovery_if_needed(
    install_root: Path,
) -> Literal["continue", "recovery-launched", "manual-recovery"]:
    raise AssertionError("startup recovery interface")
```

- [ ] Write RED tests for HTTPS-only URL/redirect, timeout/256-MiB declared-and-actual limits, length disagreement cleanup, one-leading-`v` normalization, expected-version package validation, current-install integrity, target-newer recheck, exact transaction ID, same-ID retry, pending-finalization barrier before network, and fixed safe errors.
- [ ] Write RED archive tests for 20,000 entries, 128-MiB entry, 512-MiB expanded total, ratio 200, and each one-over rejection.
- [ ] Write RED integration tests proving prepare calls Plan A, Plan B `create_prepared`, and Plan C `prepare_recovery_runtime` in order without changing live files.
- [ ] Write RED tests proving activation captures the current process identity, launches the detached runner, waits for ready, and never applies files in the live Host.
- [ ] Implement the minimal service using injected downloader, engine, controller, process, registry, and temp-root dependencies.
- [ ] Run `host.test_update_service`, package, engine, and recovery focused suites.
- [ ] Review and commit as `feat(update): add dormant reliable update service`.

Expected: complete Host functionality exists but production `perform_update` still uses the old updater.

## Milestone 3: Add A Dormant Service Worker Coordinator

**Files:**
- Create: `extension/src/background/updateRuntime.ts`
- Create: `extension/src/background/updateRuntime.test.ts`
- Modify: `extension/src/test/chromeMock.ts`

- [ ] Write RED parser tests for exact update candidate, transaction ID, Host responses, status evidence, finalization receipt, and storage state.
- [ ] Write RED state tests for newer-only candidates, nonterminal candidate isolation, legacy `pending_update` removal/fresh check, persistence-before-effect, explicit pre-activation error/same-ID retries, status polling, terminal-integrity failure retention, installer-repair terminal continuation, receipt-before-ack, and one-shot completion.
- [ ] Write RED restart tests for `preparing`, status-first one-shot `activating` retry, `polling`, `unused/pending/confirmed` recovery kick, alarm wake without UI, `reload-pending`, and `ack-pending`.
- [ ] Implement one serialized coordinator and storage key `dh_update_state`.
- [ ] Reuse the existing main Native sender; add only one small independent status-port sender.
- [ ] Keep the coordinator dormant: legacy update events and UI behavior remain production active.
- [ ] Run the new test file plus preference/storage helper regressions.
- [ ] Review and commit as `feat(extension): add dormant update coordinator`.

Expected: coordinator behavior is fully tested, but `serviceWorker.ts` does not import it and no existing UI request is routed to it.

## Milestone 4: Atomic Production Cutover And Verification

**Files:**
- Modify: `host/dh_native_host.py`
- Modify: `host/product_info.py`
- Create: `host/test_update_actions.py`
- Modify: `host/test_product_info.py`
- Modify: `host/test_host_integrity_actions.py`
- Modify: `release_helper.py`
- Modify: `host/test_release_helper.py`
- Modify: `extension/src/background/serviceWorker.ts`
- Modify: `extension/manifest.json` (add `alarms` permission)
- Create: `extension/src/background/serviceWorker.update.test.ts`
- Create: `extension/src/components/FAB.update.test.tsx`
- Create: `extension/src/components/Options.update.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/utils/translations.ts`
- Modify: update tests from Milestones 2-3
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `USER_GUIDE.md`
- Modify: `README.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`

- [ ] Write cutover RED tests for transactional capability, Host action routing, source-runtime denial, startup recovery launch-and-exit before all initialization, coordinator activation, and removal of every production `Updater.apply_update` call.
- [ ] Write cutover RED tests proving zero/multiple/non-HTTPS ZIP releases produce no candidate and mixed/old Host capability or integrity disables update with installer guidance.
- [ ] Write cutover RED tests for both first-upgrade mixed directions: new Extension/old Host and old Extension/new Host URL-only request.
- [ ] Write UI RED tests requiring payload-free `DH_UPDATE_START`, cold-start `DH_UPDATE_GET_STATE`, projected state rendering, and no UI-owned update storage/reload/Host action.
- [ ] Route `perform_update`, `activate_update`, `finalize_update_status`, and `acknowledge_update_finalization` to `UpdateService` with strict payloads and fixed errors.
- [ ] Flush the activation response, stop the Native loop, and let the Host exit normally.
- [ ] Enable Service Worker resume and block generic `NATIVE_MSG` from forwarding coordinator-only update actions.
- [ ] Suppress every ordinary main-Host request after activation; allow only the one recovery kick until reload/disposition.
- [ ] Hydrate update state before forwarding ordinary Native messages; retain suppression through post-activation recovery and terminal verification/finalization.
- [ ] Wire one 30-second `chrome.alarms` safety wake for retryable states and clear it at idle/complete.
- [ ] Advertise `transactional-update-v1` and remove the legacy UI fallback in the same commit.
- [ ] On first startup after legacy upgrade, verify package/Host/Extension integrity; surface installer guidance if mixed.
- [ ] Run startup verification before `.old*` cleanup or nested-Extension repair, preserving repair bytes on failure.
- [ ] Update build tooling and tests from PyInstaller 6.18.0 to the separately approved 6.22.2.
- [ ] Update user/developer/release documentation, including the residual power-loss/manual-reinstall boundary.
- [ ] Run focused update tests.
- [ ] Run full Host tests in bounded batches and report `N/total`.
- [ ] Run full Extension tests in bounded batches and report `N/total`.
- [ ] Run TypeScript, production Extension build, and PyInstaller 6.22.2 frozen Host probe.
- [ ] Review the complete cutover, maximum three rounds.
- [ ] Commit all cutover files together as `feat(update): activate reliable automatic updates`.

Expected: the old updater is no longer production reachable; success, rollback, restart recovery, and manual-recovery outcomes are complete and user-visible.

## Final Delivery Gate

- Scope note: the original exhaustive disposable-VM matrix below is superseded
  by the approved single-user risk decision in
  `docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md`. The
  executable runbook is defined by
  `docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md`.
- [ ] From the exact committed cutover HEAD, rerun full Host and Extension suites with progress.
- [ ] Rebuild Extension and frozen Host.
- [ ] On the effectively empty cloud PC, test one successful A-to-B update, one
  exact original-runner interruption followed by same-transaction recovery, and
  one matching-installer `_internal` repair.
- [ ] Rerun automated Host/Extension fault, rollback, unsafe-package,
  state-machine, and mixed-install coverage. Record explicitly that these
  exhaustive boundaries were not repeated on the cloud PC.
- [ ] Keep the old `v2.0.75-beta.1` workstation unchanged as a fallback, publish
  only the exact qualified B ZIP after explicit approval, verify the public asset
  hash, and migrate workload only after the qualified cloud PC remains healthy.
- [ ] Record final results in `.superpowers/sdd/plan-d-reliable-update-progress.md`.
- [ ] Request separate authorization before versioning, tagging, publishing, or installing on the real machine.
