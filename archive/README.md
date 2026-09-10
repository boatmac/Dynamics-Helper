# Old Repository Historical Archive

This directory preserves records belonging to this repository. It is not part
of the current product documentation, executable tooling or new-product export.
The current architecture, user/developer guides, design contracts and TODO remain
outside this directory and were not overwritten during restoration.

## Preserved Material

| Directory | Source and purpose |
| --- | --- |
| `Dynamics-Helper-docs-pre-EMU-20260910` | Full documentation snapshots taken before the initial cleanup, with original manifests and ZIP |
| `Dynamics-Helper-tools-pre-EMU-20260910` | Retired scripts, backup/report material and the pre-edit safety inventory |
| `Dynamics-Helper-builds-pre-EMU-20260910` | Original local build trees, release packages and evidence ledgers |
| `Dynamics-Helper-fresh-start-records-20260910` | Version, release and task records saved before the fresh documentation layout |
| `committed-specifications-5930759` | Exact Git-blob copies of the 21 baseline specifications not contained in the initial document archive |
| `retired-ui-workflow` | Original UI prompt that depended on an absent tooling directory, with its own byte manifest |

`restoration-manifest.json` records every restored payload's provenance, size and
SHA-256. `restoration-verification.json` records the completed copy checks.
For canonical tree-level checks use `tree-checksum-correction.json`: the original
records' claim of sorted tree serialization was incorrect due to a dictionary
sorting bug. All original per-file hashes remain valid. Original metadata is
preserved byte-for-byte; the correction records its hashes and replacement
ordinal-sorted tree digests rather than silently rewriting historical evidence.
External source copies remain intact as additional backups; they are no longer
the only physical location of these preserved records. Original archive READMEs
retain their original descriptions of external locations and are not rewritten.

The restoration copied 297 external-archive files and 21 committed specifications,
318 payload files totaling 136,240,807 bytes. External source before/after hashes
and destination hashes matched. Committed specifications also matched their Git
blob IDs. The check found no changes to the monitored active product files.

This does not claim to reconstruct every uncommitted intermediate edit. Complete
committed history remains in the existing repository's Git database; these
selected physical snapshots supplement it rather than replace it.

## Tracking And Safety

Historical text, manifests and this index are eligible for Git tracking with
text conversion disabled to preserve their recorded bytes. They have not been
staged or committed by this restoration. Binary build trees and ZIP copies are
kept locally inside this archive but ignored by Git; a clone will not include
those ignored payloads. Preserve them separately when backing up the old
repository, or use a separately agreed release/artifact storage destination.

These records may contain private environment information, outdated instructions
and retired scripts. Do not execute them, treat old approvals as current authority,
or add them to test discovery, build inputs or installation procedures.

## New Product Export

Exclude the entire `archive/` directory, `.git`, local dependencies and generated
artifacts when creating the new product's initial tree. Git attributes mark this
directory `export-ignore`; ordinary copy tools do not honor that attribute and
must exclude it explicitly. Do not use a mirror push to create a clean history.

`git archive HEAD` reads committed files and attributes from HEAD, not this
working tree. While these cleanup changes remain uncommitted, HEAD still contains
retired paths and lacks newly created documents; staging alone does not fix that.
Do not export HEAD as the cleaned product. After an explicitly approved checkpoint,
verify the chosen tree and its archive exclusions, or use a reviewed filesystem
export that includes intended new files and explicitly excludes this directory.
The same restriction applies to exporting any older commit or release tag.

Old names and historical discussions are intentionally retained only here and in
Git history. Name/content checks for the new product must target its export tree,
not require destruction of the old repository's historical archive. No remote,
branch, tag, commit or publication was changed by this restoration.
