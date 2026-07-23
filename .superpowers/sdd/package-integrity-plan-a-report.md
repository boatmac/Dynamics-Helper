# Package Integrity Plan A Implementation Report

## Scope and Heads

- Authored source reference: `e5910f47ddb73b8ee26d4ce1bacc6746545c512f`.
- Planning/implementation base: `5edebb4`.
- Reviewed product head: `909e08759897d5ab235211e65a72856ce8066dfe`.
- Plan A adds deterministic package ownership/integrity metadata and diagnostics only. It does not activate the transactional updater or runtime enforcement.

## Commit Map

- `1c1d0c2` `feat(host): centralize product capabilities`
- `f6debc2` `feat(release): define package ownership manifests`
- `737b26e` `feat(release): stage deterministic integrity packages`
- `085a80e` `feat(update): reject hostile package archives`
- `6fcfa30` `feat(host): verify packaged installation integrity`
- `3e33ad2` `feat(host): add side-effect-free update probe`
- `86cc9fb` `feat(host): expose package integrity diagnostics`
- `9042c1b` `fix(release): shorten atomic staging paths`
- `909e087` `fix(integrity): preserve temporary path ownership`

## Interface and Schema Summary

`product_info.py` is the single Host version/capability source. Canonical release documents are `update-manifest.json`, `host/release-integrity.json`, and `host/installed-product.json`. Staged validation accepts internally consistent N+1 packages when the caller supplies that selected target. `InstallationVerifier` checks the installed Host/Extension against the running Host version and capabilities. `--update-probe` exits before normal Host side effects.

## TDD RED Evidence

- Product info: missing `product_info` import.
- Package manifests: missing `package_manifest` import.
- Release staging: missing `package_archive` and `stage_release` APIs.
- Archive extraction: missing `stage_and_validate_archive`.
- Installation integrity: missing `install_integrity`.
- Early probe: missing probe symbols and normal Host startup instead of fixed output.
- Host diagnostics: `unknown_action` plus missing serializer.
- Review fixes: Windows long-path failure, temp-name collision deletion, source preflight after copy, and unexpected exception leakage all reproduced before fixes.

## GREEN Evidence

- Final focused Plan A suite: **66/66 passed**.
- Final full isolated Host discovery: **273/273 passed**.
- Source-only compileall: passed with no diagnostics.
- Extension full suite: **340/340 passed across 19 files**.
- Production Extension build: **2,218 modules transformed**, 13 listed artifacts.

## Restored Mutation Proofs

- Advertising `transactional-update-v1` failed the capability contract.
- Adding `_internal` to forbidden paths failed valid package generation.
- Adding metadata to product integrity and changing only a product hash failed cross-document bijection.
- Omitting `installed-product.json` failed historical updater bootstrap.
- Raw dataclass serialization failed exact response-shape tests.
- Frozen metadata absence failed the fail-closed mutation.
- Traversal remained blocked by overlapping normalization and containment guards; explicit preflight regressions and static source checks preserve the parent-segment rule.

## Historical Updater Bootstrap Evidence

The synthetic historical `Updater.apply_update` path copied `_internal` plus both Host metadata files. The installed `installed-product.json` linked the installed `release-integrity.json`, and root `update-manifest.json` was not installed.

## Final Verification

All accepted gates above ran from committed Plan A product code with isolated Host profile/temp roots. Synthetic package tests created no repository release asset. No real updater, installer, registry, AppData installation, authenticated model session, version change, tag, push, or publish occurred.

## Static and Scope Gates

- `git diff --check 5edebb4..HEAD`: passed.
- No `extract`/`extractall` use in package code.
- `transactional-update-v1` is absent from Plan A production capability declarations.
- Product changes are limited to the documented Host/release boundaries and tests; Extension/installer production code is unchanged.

## Migration Limits and Residual Risks

Hashes detect consistency, not malicious repacking. The first upgrade still uses historical updater code and cannot retroactively gain transactionality. A complete copy installs metadata; a partial startable copy fails integrity. Actual transactional update, crash recovery, installer reuse, and capability enforcement belong to Plans B-D. Disposable-VM update smoke remains deferred.

## Plan B Handoff

Plan B consumes the strict `UpdateManifest.entries`, `ReleaseIntegrity`, `InstalledProduct`, `ValidatedPackage`, ownership constants, path rules, and exact hash links. It must not alter or duplicate Plan A schemas and must keep the current updater dormant until later cutover.
