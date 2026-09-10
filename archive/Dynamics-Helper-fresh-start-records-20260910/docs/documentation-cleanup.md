# Documentation Cleanup Record

## Scope

On 2026-09-10, the user requested cleaning the current repository before deciding
how to import it as a new product into an EMU-owned private repository. The first
pass organized documentation; the later retired-tool pass is recorded separately
below. Neither implements repository migration, new product identity, update-channel
changes or Git history rewriting.

## Archive

Original documents were copied before removal or summarization to:
`C:\MyWorkbench\Repository\_archive\Dynamics-Helper-docs-pre-EMU-20260910`.
This is a document archive, not another development checkout or Git worktree.

The archive contains `manifest.json` (relative path, bytes, SHA-256, disposition),
the original hierarchy, and `archive-snapshot.zip`. All 53 original files matched
the source before/after copy and archived/ZIP bytes. The existing uncommitted local
update feedback was included in the handoff snapshot and retained in its summary.
The archive includes private local/session/security history: do not automatically
publish it or include it in a new product repository. Existing commits and release
tags also retain history; this cleanup does not sanitize those Git objects.

## Working Tree Changes

| Material | Removed | Retained |
| --- | ---: | --- |
| Generated implementation/review reports | 11 | External original records |
| Historical implementation plans | 22 | One concise persistence-plan pointer used by source comments |
| Unimplemented integration research | 2 | External original records, not a new roadmap |
| Superseded or historical-process specifications | 12 | 21 specifications with continuing product-contract value |
| Initial SDK assessment and old handoff archive | 2 | Current SDK version record and external originals |

The current handoff and two Cloud PC records were summarized, not treated as proof
that unfinished qualification passed. Retired tasks, failed scenarios and missing
evidence do not become completed work merely because their detailed records move.
Affected documentation references now point to retained contracts or explain the
archival; no source/test comments were rewritten during that first pass.

## What Remains

`docs/specs` retains effective contracts under neutral paths.
No authoring skill or plugin is required. Some documents
describe earlier revisions; later accepted amendments and current durable guides
take precedence. Removing or consolidating these contracts needs a separate
content review, not an assumption that all generated documentation is temporary.

During the first pass, source, tests, test-review hashes, manifests, prompts,
public menu assets, local dependencies, build outputs, release ZIPs and all Git
refs remained untouched.
Historical debug scripts and other source cleanup candidates are not part of this
documentation pass. The archive and this one-time cleanup record need not become
part of a future new-product export.

## First Pass Validation

- Removed paths exactly match the 49 archive entries marked for removal; all 53
  archived originals and their ZIP copies match recorded sizes and SHA-256 values.
- All first-pass changes are Markdown. The six SDK-reviewed source hashes match; no
  product tests or builds were run for this documentation-only pass.
- Kept Markdown contains no references to the removed document paths. New links
  resolve locally; existing `../../releases` links in root README/USER_GUIDE are
  unchanged legacy GitHub release-navigation links, not new local-file links.
- Markdown inventory decreased from 112 to 65 files and by approximately 79% of
  lines. Existing `.gitattributes` historical-path metadata is harmless and remains
  unchanged with other Git configuration. No commit or push has been made.

## Retired Tools Follow-Up

The user approved continuing cleanup after the documentation pass. A separate
external archive, `C:\MyWorkbench\Repository\_archive\Dynamics-Helper-tools-pre-EMU-20260910`,
retains 20 retired tool/backup files plus the original test-safety manifest.
All 21 originals matched their before/after copy hashes. This archive may contain
private historical data and scripts with obsolete unsafe operations; do not run
them or include them in a new-product export. It is not a development checkout.

Removed from the working tree: nine unreferenced legacy Host diagnostic scripts,
the old Host backup and generated analysis report, the obsolete Host installer
and root download wrapper, and seven one-time maintenance/read-only materials.
The three corresponding pending inventory entries were removed from
`tests/test-safety-manifest.json`; test profiles, source hashes and exceptions
were not rewritten. Existing optional maintenance-scanning capability remains
in the checker; an absent retired directory does not require a framework change.

Retained: current installation/build/runtime modules, the SDK offline/live entries,
test-safety tooling, development switch, and three historical SDK debug files
still read by `test_debug_prompt_isolation.py`. Their eventual retirement must
address that nonempty regression contract together, not simply delete its inputs.

The user explicitly requested a subsequent pass over the remaining generated
documents. That work remains pending: consolidate active contracts, identify
superseded passages and choose a minimal new-product document set. This second
pass does not mark those documents as fully cleaned or automatically exportable.

Second-pass static verification confirmed the 20 deleted paths exactly match the
archive list, all 21 archive hashes match, and only the three obsolete pending
inventory entries changed. Safety-core profiles and exceptions remain identical;
all six safety-core and six SDK source hashes match. No retained tracked file has
a functional reference to a removed tool. No test, gate, build, archived script,
installer or live probe was executed. No commit, push or migration was performed.

## Neutral Naming Pass

The user requested removing the retired authoring-tool name from the entire
current tree, excluding Git history. The 21 retained specifications and one
implementation summary now live in `docs/specs`; source/test comments, guide links
and old release-note references use those neutral paths. This is naming cleanup,
not a claim that every historical design has been consolidated or revalidated.

The complete old build trees, both local release/evidence directories, Host Python
caches and generated spec file were moved by same-volume rename to
`C:\MyWorkbench\Repository\_archive\Dynamics-Helper-builds-pre-EMU-20260910`.
All 184 files (132,139,721 bytes) matched before/after SHA-256. Original ZIP bytes
were not edited. Empty retired directory names were removed. Browser-facing
`extension/dist`, installed products and dependencies remain in place.

The Host source change is one specification-path comment. Its diff was reviewed
and its complete raw-byte hash rebound in `tests/sdk-test-review.json`; no SDK
behavior or prior execution evidence was rewritten. Other source changes are
comments or test description strings. No product tests/builds were run for this
non-behavioral change. A fresh export must use the current filesystem, not the
old Git index or old release archives; historical commits remain unchanged.

Final naming verification covered 22,510 files and 2,078 subdirectories, including
empty directories and ignored/hidden paths, with Git metadata excluded. No retired
name appeared in paths or the full raw-byte content scan; ripgrep exited 1 (no
matches), with empty stderr. No reparse points or traversal errors were found.
The remaining compressed timezone dependency was separately scanned without
extraction/execution: 619 members, no name/content matches or errors. Other
remaining third-party executables were scanned as raw bytes, not decompiled.
All 22 retained documents and 13 source references resolve; SDK and safety-core
source hashes each match 6/6. No Git history rewrite, commit, push or migration
was performed. Content consolidation remains a separate pending task.

## Current-Contract Content Pass

The user then approved acting on the documentation review. Root README, user,
developer and architecture guides now describe the actual installation entry,
supported D365 scope, source/runtime prerequisites and SDK/privacy boundaries.
Execution guidance distinguishes scoped tests, live probes, real registration
effects and current authorization instead of obsolete per-command or fixed review
rules. No product behavior was changed to match an old design.

All 22 retained design documents were condensed into current contracts, preserving
referenced invariant IDs and useful section anchors. Old hydration side-effect
examples, result-owner omissions, update action matrices and test/installation
recipes were replaced with current behavior. Two prior SDK records retain their
historical facts but no longer act as current implementation instructions.

Static verification covered 62 current Markdown files: 155 local links including
16 anchor links resolved without errors; the prohibited authoring name had zero
matches. The 22 specifications decreased from 5,991 to 2,731 lines (54.4%), and
the complete Markdown set had 8,824 lines before this closeout update. SDK and
safety-core review sources each matched 6/6. No tests, builds, installation,
network operation, commit or push was performed for this pass. Selecting the
final new-product export, and possibly merging contracts further, remains open.
