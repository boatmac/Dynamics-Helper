# Sanitized Default Menu Asset Design

- **Date:** 2026-08-06
- **Status:** Approved for planning
- **Scope:** Make the Extension's required default-menu asset public, tracked,
  safe, and reproducible without changing existing users' stored bookmarks.

## 1. Problem

`extension/manifest.json` exposes `items.json` as a web-accessible resource, and
CRXJS resolves every manifest asset during `npm run build`. The repository has
ignored every `items.json` since the active lineage's root commit, however, and
no tracked generator or setup step creates the file.

This creates two integrity failures:

1. A fresh clone cannot build after documented dependency setup because the
   required asset is absent.
2. Release tags do not identify all shipped bytes. The release helper commits
   and tags before building from a working tree that may contain an ignored
   local `items.json`; a packaged release can therefore include unversioned
   default data.

The installed production copy is not a valid source for repair. It contains
internal URLs and has changed independently of Git, so copying or sanitizing it
would retain unreviewed organizational content and would not restore provenance.

## 2. Decisions

1. `extension/items.json` becomes a tracked product asset.
2. It contains only public Dynamics Helper resources hosted under
   `https://github.com/boatmac/Dynamics-Helper`.
3. The data is created independently from this specification; no private or
   installed copy is read, copied, transformed, or used as a template.
4. Labels and markdown are English. This change does not add menu-data
   internationalization.
5. Existing `dh_items`, including an explicitly stored empty array, remain
   untouched on upgrade. Invalid stored data is reported without replacement.
6. The new default applies only when personal storage is missing or when the
   user explicitly invokes Reset.
7. Team Catalog and personal/team merge behavior remain unchanged.

## 3. Asset Contract

`extension/items.json` is a raw JSON array with exactly two top-level items and
five total nodes:

```json
[
  {
    "type": "folder",
    "label": "Dynamics Helper Resources",
    "children": [
      {
        "type": "link",
        "label": "User Guide",
        "url": "https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md"
      },
      {
        "type": "link",
        "label": "Releases",
        "url": "https://github.com/boatmac/Dynamics-Helper/releases"
      },
      {
        "type": "link",
        "label": "Report a Bug",
        "url": "https://github.com/boatmac/Dynamics-Helper/issues/new"
      }
    ]
  },
  {
    "type": "markdown",
    "label": "About Dynamics Helper",
    "content": "# Dynamics Helper\nPublic product resources and support links."
  }
]
```

Allowed fields are deliberately minimal:

- Folder: `type`, `label`, `children`.
- Link: `type`, `label`, `url`.
- Markdown: `type`, `label`, `content`.

The tracked asset must not contain `source`, `collapsed`, `target`, `icon`,
`tags`, placeholders, query strings, fragments, credentials, internal domains,
or organization-specific names. Every URL must use HTTPS, host `github.com`,
and remain under `/boatmac/Dynamics-Helper/`.

## 4. Git and Packaging

- Remove the global `items.json` rule from `.gitignore`.
- Add `.gitattributes` rule `extension/items.json text eol=lf` so the tracked,
  working-tree, and packaged JSON bytes are stable on Windows and Unix.
- Do not add a force-include exception while leaving a broad ignore rule; the
  asset's tracked status must be obvious.
- Keep `extension/manifest.json` and the two existing
  `chrome.runtime.getURL("items.json")` consumers unchanged.
- CRXJS continues to copy the source asset into `extension/dist/items.json`.
- The release helper continues packaging `extension/dist`; because source and
  default data are now in the same commit, a tag identifies the shipped menu
  bytes.
- Self-update continues replacing the same installed filename. Omitting the
  file is not acceptable because the updater may preserve a stale installed
  copy.

## 5. Runtime Compatibility

The existing precedence rule remains:

1. Any valid personal `dh_items` array, including an empty array, wins.
2. Missing personal storage falls back to packaged defaults; invalid storage is
   reported without fetching or persisting defaults.
3. Team items merge through the existing label-collision policy.

There is no migration that identifies or rewrites old seeded defaults. Such
defaults are indistinguishable from user edits and replacing them could destroy
user intent.

Options and Reset retain their current behavior: they recursively add
`collapsed: true` to loaded folders before persisting `dh_items`. The tracked
asset itself omits this runtime/user-state field.

## 6. Validation

Add a direct asset-contract test that loads the tracked JSON and fails unless:

- The root is an array with exactly two entries and five recursive nodes.
- The exact labels, item types, markdown, and three reviewed URLs match this
  specification.
- Only `folder`, `link`, and `markdown` occur.
- Every node has only the fields allowed for its type.
- All link URLs parse as HTTPS `github.com` URLs under the product repository
  path, with no query or fragment.
- No key or string matches reviewed credential, private-key, internal-domain,
  or organization-name patterns.

Add build-copy verification after a fresh `npm ci`:

- `npm run test:run` passes.
- `npm run build` passes without provisioning any ignored input.
- `extension/dist/items.json` exists and is byte-identical to
  `extension/items.json`.
- `git hash-object --no-filters extension/items.json` equals
  `git rev-parse HEAD:extension/items.json`, proving the checkout bytes match
  the committed blob rather than merely matching another normalized copy.
- Git status remains clean except for ignored dependency/build directories.

The test must use the real tracked asset, not a duplicated fixture. Existing
collapse tests remain focused on runtime transformation; they need not preserve
the historical private seven-root shape.

## 7. Documentation

- Update the bookmark-import example in `USER_GUIDE.md` from the unsupported
  `type: "url"` to `type: "link"` while documenting that packaged defaults are
  public product links and personal/team data remains separate.
- Update release/developer documentation to state that every required packaged
  asset must be tracked or reproducibly generated before tagging.
- Remove the release-note follow-up that treats `items.json` shipping policy as
  unresolved only if that note is an active checklist; historical release notes
  otherwise remain immutable history.

## 8. Migration Integration

This product fix precedes repository-lineage migration acceptance:

1. Implement and review this design on a branch based on canonical `master`.
2. Establish a new reviewed canonical commit that includes the tracked asset.
3. Amend the repository-lineage specification and plan with two explicit SHAs:
   preserve pre-mutation remote SHA
   `0040b1de1bc196b203014a8e4f94a53babb7e9aa` in historical and drift gates,
   then add a separately authorized exact-SHA fast-forward with read-back before
   post-mutation target checks use the reviewed product commit.
4. Correct Vitest evidence assertions to use `testResults.length == 6` and
   `43` passed tests. `numTotalTestSuites` counts file and nested suite nodes and
   is not the test-file count.
5. Recreate Task 4 staging validation from the new canonical commit. Do not
   inject a temporary local `items.json` into the old commit and call that a
   fresh-clone pass.

Existing immutable Task 1-3 evidence remains historical evidence for the
pre-fix topology. New canonical-baseline evidence must explicitly record the
superseding commit rather than rewriting prior manifests.

## 9. Non-goals

- Shipping internal support links or categories.
- Copying the installed production menu.
- Migrating, merging, or replacing existing users' non-empty bookmarks.
- Adding a menu schema migration or generalized import validator.
- Internationalizing default-menu data.
- Changing Team Catalog behavior.
- Removing `items.json` in favor of TypeScript-owned defaults.
- Publishing a release as part of this fix.
