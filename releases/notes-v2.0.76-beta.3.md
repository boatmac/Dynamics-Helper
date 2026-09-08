# Dynamics Helper v2.0.76-beta.3

This prerelease restores basic operation in the tested company Windows environment
and hardens Host startup, packaging, and the full installer. It is not a stable
release or a claim of universal antivirus compatibility.

## Changes

- Removed obsolete Host-startup migration that could overwrite the installed
  Extension from an unverified sibling directory and delete the source.
- Excluded development-only Pydantic mypy plugins from the frozen Host. Actual
  build graphs retain all 17 required hidden imports without setuptools or its
  vendored data/runtime hook.
- The full installer no longer adds Defender exclusions, unblocks files, overrides
  execution policy, force-stops the Host, or migrates/overwrites legacy Roaming
  data. Blocked operations fail without advising users to weaken protection.
- Installation and registration failures return a nonzero exit code through the
  batch wrapper. Product integrity checks and transaction recovery are retained.
- Includes transactional-update coordination and foreground-visible completion
  handling developed since the alignment-only beta. Completion acknowledgment
  requires eight continuous visible seconds on a qualifying surface.

## Verification

- Focused product/version/build/Host tests: 33/33; installer safety tests: 17/17.
- Final package validation and actual frozen probe passed. Controlled frozen SDK/
  Pydantic import smoke passed without starting a real model session locally.
- On the test Cloud PC: complete installer exit 0, configuration preserved, both
  components beta.3, model-list Refresh successful, and Analyze reported working.
- Pre-tag frontend build, TypeScript checks, 5/5 default-menu tests and source/dist
  menu byte-identity check passed.

## Known Limits

- Automatic upgrade, interruption/recovery and update-completion lifecycle have
  not completed target-environment acceptance for this version. Local upgrade
  testing is the next planned step. Beta-channel users may discover this release.
- Earlier builds were quarantined under two different Defender detections. The
  exact cause is not established; this release must not be described as a proven
  false-positive fix. Keep protection enabled; stop on a new detection instead of
  restoring/allowlisting the file or repeatedly retrying installation.
- The build still reports an optional `tzdata` hidden-import warning. Full suites
  were not rerun for every beta.3 change; the focused and artifact checks above
  are the verified scope.
- A running Host or legacy Roaming installation makes the full installer stop.
  Close browsers normally; do not use Reset or delete update evidence as a repair.

## Installation And Upgrade

Download the complete ZIP, verify its hash, and extract all files to a new local
folder. Close the browser normally before a full installation and use the existing
Windows account. Run `install.bat` without elevating or bypassing company policy.
Do not copy just the EXE. Existing configuration and editable prompts are retained.

For an automatic-upgrade test, enable the existing beta-channel preference and use
the normal update UI once after it identifies this version. Preserve any failure
or recovery evidence; do not repeatedly click Retry. A failed or quarantined old
Host may require the complete installer rather than an automatic upgrade.

## Package Identity

- Asset: `DynamicsHelper_v2.0.76-beta.3.zip`
- Size: **14,003,512 bytes**
- SHA-256: `e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec`
- Tested package inputs were subsequently bound to source commit `fc14826`.
  The ZIP was not rebuilt from the release tag. The pre-tag rebuild matched all
  runtime frontend files; one non-runtime Vite metadata field differed. The
  original tested ZIP and its integrity inventories are published unchanged.
