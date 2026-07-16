# Prompt Scope Cleanup (Next Beta Draft)

## Deterministic instruction sources

DH now disables Copilot CLI automatic custom-instruction discovery for DH sessions. Every analysis receives DH Core plus exactly one selected instruction source.

## Repository ONLY now includes instructions

With a non-empty Root Path, Repository ONLY selects Root `.github/copilot-instructions.md` together with repository Skills and MCP. When disabled, DH-specific Instructions are used instead. Custom User Prompt remains active for every Analyze.

## Existing-setting migration behavior

Existing `use_workspace_only=true` values take on the expanded behavior immediately. A selected but missing/unreadable Root instruction file blocks Analyze with an actionable error; an existing empty file is valid.

## Actionable prompt-source errors

Core, DH-specific, and Repository instruction read failures retain machine-readable error codes through immediate and rehydrated browser results.

## Verification

- The complete Host unittest suite passed.
- The complete Extension Vitest suite passed.
- The Extension production build passed.
- Python compileall and `git diff --check` passed.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.
