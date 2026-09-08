# Dynamics Helper v2.0.76

## Highlights

- Deterministic instruction selection: DH Core plus either DH-specific or
  repository instructions, with Custom User Prompt applied separately.
- Restored manual Check for Updates in the header and About & Help, plus a
  one-shot automatic check when Options finishes safe configuration hydration.
- D365 open-shadow header extraction for Case Number, Severity and Status Reason.
- Customer Name and Created On in Case Context. Current-record Created On can be
  read from the loaded form without opening Details when the complete visible
  16/19-digit record identity matches. Task suffixes are preserved; no parent-case
  lookup is performed. Valid model dates carry an explicit `(UTC)` designation.
- Safer startup and packaging: no unverified sibling Extension migration, and no
  collection of development-only Pydantic mypy plugins/setuptools dependencies.
- Installer preserves security settings, refuses active Hosts/ambiguous Roaming
  data, replaces complete product trees, verifies integrity and reports failures
  through nonzero exit codes. No forced termination or antivirus exclusions.
- Transactional update coordination and foreground-visible completion handling.
  Users reported normal beta upgrades on local and Cloud PC with completion
  notices disappearing after approximately eight visible seconds.

## Upgrade Guidance

**Older overlay-updater versions, including v2.0.75-beta.1, should use this complete
installer instead of their in-app updater.** Legacy overlay updates can leave old
runtime/assets even when both version labels look correct and ping succeeds.
This was observed locally and repaired by complete installation; the user reported
that the local incident was not blocked by Defender.

Extract the entire ZIP to a new local folder, close the browser normally, and run
`install.bat` with the existing Windows account. Do not copy only the executable,
elevate to bypass policy, delete transaction evidence, or clear browser storage to
hide a recovery error. Verified newer beta installations can use their normal
update UI; stop and preserve evidence on failure rather than repeatedly retrying.

## Validation And Limits

- **673/673 Host**, **1,228/1,228 frontend**, and **5/5 default-menu** tests passed
  in aggregate. Host verification used sequential continuation after temporary
  harness errors/timeouts; the final outstanding cases and frozen selector passed.
  This is not represented as an uninterrupted first-pass suite.
- Frontend build/TypeScript, source/dist menu identity, fresh Host build, complete
  archive validation and actual final-package probe passed. A controlled frozen
  import smoke passed without starting a real model session locally.
- Created On model lookup uses a constrained `Xrm.Page` compatibility surface.
  Unknown/mismatched records fail closed. DOM fallback retains displayed text
  without a guessed timezone; no Details/Audit activation or business API request.
- Customer names are not generally removed by the existing PII-pattern scrubber.
  Review Case Context before Analyze. No TPID inference or cross-tab metadata
  cache is introduced; same-case user edits remain protected.
- Normal upgrade and basic Analyze success do not establish exhaustive
  interruption/recovery coverage or universal antivirus compatibility. Earlier
  Cloud PC detections are not claimed as proven false positives. Keep protection
  enabled and stop on new detections instead of restoring/allowlisting files.
- Optional `tzdata`, outdated Browserslist data, and React act warnings remain.
- GitHub Copilot Python SDK remains **1.0.5**. Evaluation of **1.0.13** is separate
  follow-up work and is not included in this release.

## Package Identity

- Asset: `DynamicsHelper_v2.0.76.zip`
- Size: **14,009,878 bytes**
- SHA-256: `5a9b7fde784dc5cf4d1d6ad3105dbbd4f78f9979f6026d044cb36bc82263d4ae`
- The tested package was built before the release commit. Recorded product inputs
  are bound to committed source; it was not rebuilt from the tag.
