# Prompt Scope Cleanup (Next Beta Draft)

## Deterministic instruction sources

DH now disables Copilot CLI automatic custom-instruction discovery for DH sessions. Every analysis receives DH Core plus exactly one selected instruction source.

## Repository ONLY now includes instructions

With a non-empty Root Path, Repository ONLY selects Root `.github/copilot-instructions.md` together with repository Skills and MCP. When disabled, DH-specific Instructions are used instead. Custom User Prompt remains active for every Analyze.

## Existing-setting migration behavior

Existing `use_workspace_only=true` values take on the expanded behavior immediately. A selected but missing/unreadable Root instruction file blocks Analyze with an actionable error; an existing empty file is valid.

## Actionable prompt-source errors

Core, DH-specific, and Repository instruction read failures retain machine-readable error codes through immediate and rehydrated browser results.

## Review hardening

- Custom User Prompt is applied from its current value exactly once at every Analyze send; duplicate stale sections are removed from the first authoritative marker.
- Prompt health refreshes after acknowledged repairs without rehydrating or overwriting Options values.
- Delayed Chrome preference hydration cannot overwrite a newer storage event, including Reset/default/empty values.
- Full Team Catalog sync commits only while enabled, manifest URL, and selected team still exactly match; Options and Service Worker ignore stale results.
- Analysis consumption uses a separate identity-only acknowledgment, so it cannot rewrite a newer result; legacy seen records remain supported.
- Team Catalog diagnostics and bookmark telemetry no longer expose credential-bearing manifest or bookmark URLs.
- Host SDK response diagnostics contain metadata only and no-content reports never serialize raw response events or model content.

## Verification

- Reviewed implementation: `cb760a4` plus comment-only `3e18244`.
- Isolated Host: **111/111 focused** and **181/181 full** tests passed.
- Extension: **127/127 focused** and **166/166 full** tests passed.
- Production build passed with **2,217 modules transformed** and **14 artifacts** listed.
- Isolated Python compileall, `git diff --check`, and static review checks passed.
- Optional authenticated marker smoke was not run because safe model-backed user/session isolation was not available; it remains a non-gating check.
- The controller's broad whole-branch review remains pending after this fix wave.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.
