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

- Custom User Prompt is applied from its current value exactly once at every Analyze send, including edited/preformatted context.
- Prompt health refreshes after acknowledged repairs without rehydrating or overwriting Options values.
- Delayed Chrome hydration, in-flight Team Catalog fetches, and analysis dismissal are generation/identity checked so stale work cannot restore reset data or consume a newer result.
- Team Catalog diagnostics no longer expose credential-bearing manifest or bookmark URLs.

## Verification

- Reviewed product head: `907acd0`.
- Isolated Host: **109/109 focused** and **179/179 full** tests passed.
- Extension: **105/105 focused** and **144/144 full** tests passed.
- Production build passed with **2,217 modules transformed** and **14 artifacts** listed.
- Isolated Python compileall, `git diff --check`, and static review checks passed.
- Optional authenticated marker smoke was not run because safe model-backed user/session isolation was not available; it remains a non-gating check.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.
