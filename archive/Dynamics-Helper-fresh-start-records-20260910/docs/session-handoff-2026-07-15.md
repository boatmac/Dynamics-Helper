# Dynamics Helper Handoff

## Current Status

Updated: 2026-09-10. This is a task record, not execution authority.

- Canonical checkout remains `C:\MyWorkbench\Repository\Dynamics-Helper`, branch
  `hardening/plan-d-runtime-installer`. Last verified HEAD is `5930759`; verify
  actual Git state before continuing. The old `master` is not the current product.
- Stable `v2.0.77` was published from tag/release commit `8cf6e66`:
  https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.77
- It contains the user-confirmed Created On/UTC fix and SDK 1.0.13 adaptation.
  SDK offline contracts passed 25/25; the approved one-turn synthetic live check
  passed 9/9 against CLI 1.0.83. These are bounded results, not full product coverage.
- The complete package passed build and static archive verification (55 manifest
  entries). ZIP size: 14,357,834 bytes. SHA-256:
  `9dde6e68f46dc8423e3f220fea414384ea40d819aa146cb4f6b8faeadea2e3eb`.
- The user reported successful local update after release. This preserves the
  feedback that was uncommitted before documentation cleanup; it does not prove
  installed bytes, the current browser source path or business Analyze behavior.
- Historical installer simulations, frozen builds and SDK qualifications are
  recorded results, not instructions to rerun them for documentation cleanup.
  Optional tzdata/Browserslist warnings and incomplete cloud recovery qualification
  remain limitations; see the retained Cloud PC summary and version records.

## Active Work

The user intends to create a new private repository under a company EMU personal
account and may start a new product history rather than migrate old commits/docs.
First clean this checkout, then decide the migration. No target repository URL,
product identity or distribution-channel change has been selected.

Documentation cleanup removes historical plans/reports and superseded process
specifications from the working tree after byte-verified external archival.
It retains effective specifications, code/test references and concise evidence
summaries. See [documentation cleanup](documentation-cleanup.md) and the
[documentation index](README.md). No source, test, dependency, build output,
Git history, branch, tag or remote is changed by this documentation pass.
No commit, push, repository creation or migration has been performed for it.

The second cleanup pass archives and removes 20 retired tools/backup materials,
plus removes their three pending safety inventory entries. Maintained code and
test sources remain unchanged. Full originals and the pre-edit safety manifest
are retained at `C:\MyWorkbench\Repository\_archive\Dynamics-Helper-tools-pre-EMU-20260910`;
21/21 copies matched original before/after hashes. No archived tool was executed.

The subsequent naming pass moved retained specifications and the implementation
summary to `docs/specs` and updated all corresponding source/doc references.
Stale build trees, release ledgers/ZIPs and Host caches were archived outside the
repository with byte identity preserved; browser-facing Extension dist and
dependencies were retained. The Host comment-only edit was reviewed and its SDK
source hash rebound. This prepares the current tree, not its Git history, for
export. The later content pass corrected README/user/developer/architecture and
execution guidance, converted 22 retained design documents into current contracts,
and condensed two historical SDK records. Existing invariant identifiers and
source references remain intact. No behavior changes or new runtime verification
were introduced. Final static checks found no missing local link/anchor targets
and confirmed current SDK/safety source hashes match their review records.

## Next Decisions

- The requested design-document content pass is complete. For the new-product
  export, decide whether to further merge the now-current contracts or omit
  historical/version/task records; do not treat that export selection as decided.
- Three old SDK debug scripts remain because `host/test_debug_prompt_isolation.py`
  reads them. Decide their coordinated retirement with that test, without turning
  the test into an empty pass or modifying unrelated SDK review inputs.
- Decide the new product's support/update distribution before changing repository
  URLs: the current updater anonymously uses the old public release repository,
  whereas an EMU private repository requires authentication.
- Decide what to export from the cleaned working tree and its new default branch.
  Do not mirror old refs/tags if the desired outcome is a new history.
- Preserve the currently working extension/native identities unless an explicit
  product-identity migration is approved; do not clear user storage or overwrite
  installation files as a repository-cleanup shortcut.

## Retained History

The complete pre-cleanup handoff, including prior failures and original incident
history, is retained in the external archive described in
[documentation cleanup](documentation-cleanup.md). That archive is local history,
not an EMU export input or a standing authorization. Existing Git history remains
unchanged; removing current files does not remove their historical copies.
