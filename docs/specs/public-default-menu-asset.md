# Public Default Menu Asset

Status: Implemented. Current public asset, runtime precedence, and build-gate
contract. No private menu is an input to this specification.

## 1. Problem

The Extension manifest exposes `items.json` as a web-accessible resource. That
required release input must have public, reproducible provenance, not depend on
an ignored file from a developer profile or installed product.

`extension/items.json` is a tracked asset. No local private copy is needed to
supply the default menu, and no installed copy may be used as a repair template.

## 2. Decisions

1. `extension/items.json` is a tracked public-only product asset.
2. Links stay under `https://github.com/boatmac/Dynamics-Helper/`.
3. The asset is independent of private/installed menus; those are not read,
   transformed, or used as templates to construct defaults.
4. Labels and markdown are English; menu-data localization is not introduced.
5. Existing valid `dh_items`, including `[]`, win over packaged defaults.
6. Missing personal storage or explicit Reset can load defaults. Invalid stored
   data is reported without replacing it with defaults.
7. Team identity checks and personal-wins merge remain unchanged.

## 3. Asset Contract

The canonical raw JSON array has exactly two roots and five total nodes:

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

Only these fields are allowed: folder `type/label/children`, link
`type/label/url`, markdown `type/label/content`. Exact labels, URLs, content,
order, and node count are part of the contract, not merely illustrative data.

The tracked asset contains no `source`, `collapsed`, `target`, `icon`, `tags`,
placeholders, credentials, query strings, fragments, private domains, or
organization-specific names. URLs use HTTPS, host `github.com`, and the exact
product repository path. Hidden duplicate JSON keys are invalid even if normal
parsing would conceal them.

## 4. Git and Packaging

`.gitattributes` pins `extension/items.json text eol=lf`. The required asset is
tracked directly, not provisioned from an ignored local menu. The manifest and
runtime consumers continue using `chrome.runtime.getURL('items.json')`.

The build copies the canonical source into `extension/dist/items.json`. The
release packages the complete Extension tree with that file; omission is not
an acceptable way to preserve or replace old installed defaults. Product update
transactions own tree replacement, while user bookmark storage remains separate.

Every manifest-referenced input must be tracked or reproducibly generated before
tagging. The release helper commits/tags before its own build, so an authorized
release requires a clean checkout and successful pre-tag Extension build with
the source/dist byte-identity gate. The helper's later build is not a substitute
for that pre-tag check. This document grants no release authorization.

## 5. Runtime Compatibility

1. Any valid stored personal array, including empty, wins.
2. Missing storage falls back to packaged defaults. Invalid/unreadable personal
   data produces a visible load issue without fetching or persisting replacement
   defaults as though storage were absent.
3. Eligible team items merge afterward through exact top-level personal-wins
   collision rules; packaged defaults do not bypass catalog identity checks.

There is no migration that recognizes and rewrites old seeded defaults: such
content may already contain user edits. An upgrade replaces the packaged asset,
not the existing `dh_items` tree.

Options/default-loading and Reset recursively initialize folder collapse state;
`collapsed: true` is runtime/user state, never a field in the tracked asset.
Personal mutations and Reset removal share the serialized personal queue. Reset
cleanup preserves newer edits and follows matching Host durable acknowledgment;
loading defaults is not permission to replay acknowledged Host defaults.

## 6. Validation

`extension/test/defaultItems.test.mjs` reads the real tracked asset. Its contract
checks exact public content, minimal five-node schema, allowed repository URLs,
absence of credential/private markers, and rejection of hidden duplicate keys.
A duplicated fixture is not evidence for the canonical asset's bytes.

`extension/package.json` defines the build sequence as the default-items Node
gate, TypeScript compilation, Vite build, then the default-items-copy verifier.
`extension/scripts/verifyDefaultItemsCopy.mjs` compares raw source and dist buffers
for byte identity, not merely equivalent parsed JSON.

The `test:run` and `test:coverage` scripts also include the Node asset gate before
Vitest; filtering Vitest does not exclude that additional scope. Verification
must use an applicable reviewed entry, not assume a script name authorizes every
operation it contains.

A build-copy match alone does not prove a clean checkout or matching committed
blob; release preflight checks source identity separately. No tests or builds run
as part of documentation-only maintenance.

## 7. Documentation

Public examples use supported `type: 'link'`, not `type: 'url'`. Product defaults,
personal bookmarks, and team cache have distinct provenance and owners. This
document defines the default content locally rather than delegating its entire
schema to a link or an installed file.

## 8. Source Identity

The exact product source identifies required packaged menu bytes without
injecting a private/local input.

## 9. Non-goals

No private support menu, existing-bookmark replacement, menu schema migration,
default-data localization, Team Catalog change, TypeScript-owned replacement
for `items.json`, installation operation, or release publication is introduced.
