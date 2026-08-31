# Dynamics Helper v2.0.75-beta.1

This beta delivers the completed prompt-source alignment as a paired Extension
and Native Host build.

## Highlights

- Disables Copilot CLI automatic custom-instruction discovery in Dynamics Helper
  sessions.
- Uses DH Core plus exactly one editable instruction source: DH-specific
  Instructions, or Root `.github/copilot-instructions.md` when Repository ONLY
  is effective.
- Refreshes a case session when the selected instruction source changes while
  preserving the deterministic case session ID.
- Reads Custom User Prompt from the canonical Host file for every Analyze and
  applies it exactly once.
- Preserves actionable prompt-source errors through immediate and restored UI
  results.
- Includes the reviewed public default bookmark menu required by clean Extension
  builds.

## Upgrade Behavior

An existing `use_workspace_only=true` preference immediately adopts the expanded
Repository ONLY behavior. With a non-empty Root, Analyze now requires
`<Root>/.github/copilot-instructions.md`; if that file is missing or unreadable,
add or repair it, or turn off Repository ONLY. An existing empty file is valid.
No instruction file is moved or rewritten during upgrade.

## Install

Download `DynamicsHelper_v2.0.75-beta.1.zip`, extract it, and run `install.bat`.
The archive contains matching Extension and Native Host versions; do not combine
its Extension with a Host from another release.

After installation, reload Dynamics Helper in `chrome://extensions`, then
refresh existing Dynamics 365 tabs so they use the new content script.

## Scope

This beta does not include the later transactional-update, direct-bootstrap, or
partial-install quarantine work. Those changes remain under development.

The Options UI supports reasoning efforts through `xhigh`. A newer SDK/CLI may
advertise `max`; this beta does not enable that value.
