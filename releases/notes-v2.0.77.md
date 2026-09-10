# Dynamics Helper v2.0.77

## Highlights

- Fix Created On extraction being rejected by an overly restrictive browser
  document-ID format check. Browser-issued IDs are passed unchanged and matched
  exactly; origin, extension, frame and record-identity checks remain enforced.
  Valid model dates include explicit UTC. DOM fallback never invents a timezone.
- Upgrade the GitHub Copilot Python SDK from 1.0.5 to 1.0.13, retaining the existing
  transitive dependency pins and explicit external CLI integration.
- Fail closed if the first session-options update is rejected or not confirmed.
  An unconfirmed instruction-isolation setting cannot produce a usable session
  or fall through to another session-creation attempt.
- Respect managed approval requirements in headless operation. Ordinary permission
  requests remain supported; requests requiring unavailable human approval are
  explicitly declined rather than silently approved or left waiting.
- Add metadata-only Created On diagnostics and a reusable SDK upgrade verification
  workflow with fixed offline contracts and reviewed dependency identities.

## Validation And Limits

- Created On correction was confirmed by the user in D365 with UTC output.
  Focused diagnostics passed 81 tests; the final document-ID bridge passed 64 tests.
- SDK offline contracts passed 25/25. The bounded live SDK 1.0.13 / CLI 1.0.83
  check passed 9/9 stages, including exactly one synthetic no-tool model turn,
  persisted-session resume and cleanup. No real case content was used.
- Extension and Host builds passed, including 5/5 default-menu tests and the
  source/dist menu byte check. Independent ZIP extraction and integrity validation
  passed all 55 manifest entries. Full product suites were not rerun for the
  version-only package preparation.
- No real installation or frozen executable run was performed for this package.
  Full installed-product qualification and
  universal security-product compatibility are not claimed.
- Optional tzdata and outdated Browserslist data remain known build warnings.

## Package Guidance

This is a complete Host and Extension package, not an executable-only patch.
Extract the entire ZIP to a new local folder, close the browser normally, and run
`install.bat` using the existing Windows account. Do not overlay individual files,
disable security protections or delete update recovery evidence. Stop and preserve
evidence if installation reports a failure.

## Package Identity

- Asset: `DynamicsHelper_v2.0.77.zip`
- Size: **14,357,834 bytes**
- SHA-256: `9dde6e68f46dc8423e3f220fea414384ea40d819aa146cb4f6b8faeadea2e3eb`
- Built from `fce8d03` plus the four version-carrier edits committed for this
  release. The verified package predates the release commit/tag and was not
  rebuilt from the tag. Subsequent release-note and handoff edits do not change
  the package bytes; the original local build record is preserved.
