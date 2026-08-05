# Sanitized Default Menu Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tracked, public-only `extension/items.json` so a fresh clone can test, build, and reproduce the exact default menu bytes shipped in a release.

**Architecture:** A Node standard-library contract test reads the real tracked JSON, so it can fail before the missing asset exists without changing the Vitest file count. The normal Extension test/build scripts run that contract, and a post-build verifier requires `dist/items.json` to be byte-identical to the tracked source. Runtime storage precedence remains unchanged.

**Tech Stack:** JSON, Node.js 24 `node:test`, npm 11 scripts, Vitest 3.2.4, TypeScript 5.9, Vite 7.3.1, CRXJS 2.0.0-beta.33.

---

## Scope and Commit Boundaries

**Product files:**

- Create: `extension/items.json`
- Create: `extension/test/defaultItems.test.mjs`
- Create: `extension/scripts/verifyDefaultItemsCopy.mjs`
- Modify: `.gitattributes`
- Modify: `.gitignore`
- Modify: `extension/package.json`
- Modify: `extension/src/components/Options.collapseFolders.test.ts`
- Modify: `USER_GUIDE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `AGENTS.md`

**Existing approved specification:**

- `docs/superpowers/specs/2026-08-06-sanitized-default-menu-asset-design.md`

**This plan:**

- `docs/superpowers/plans/2026-08-06-sanitized-default-menu-asset.md`

Commit this reviewed plan before starting Task 1. This plan then produces one
final reviewed product SHA on
`docs/sanitized-default-menu-design`. It does not push, merge, publish, tag, or
modify the repository-lineage evidence stores. A second plan, written after the
actual product SHA exists, will amend the lineage migration's fixed SHA and
Vitest JSON assertions.

### Task 1: Lock the Missing Asset Contract with a RED Test

**Files:**

- Create: `extension/test/defaultItems.test.mjs`
- Modify: `extension/package.json:6-12`

- [ ] **Step 1: Verify the branch starts clean and the asset is genuinely absent**

Run from the repository root:

```powershell
git status --short --branch
```

Expected: clean `docs/sanitized-default-menu-design`; the specification and
this plan are already committed.

```powershell
Test-Path -LiteralPath "extension\items.json"
```

Expected: `False`.

```powershell
& { $head=(git rev-parse HEAD); git merge-base --is-ancestor 0040b1de1bc196b203014a8e4f94a53babb7e9aa $head; if ($LASTEXITCODE -ne 0) { throw "product branch does not descend from canonical master" }; "product source HEAD: $head" }
```

Expected: one full 40-character SHA and exit code `0`.

```powershell
git check-ignore -v -- "extension/items.json"
```

Expected: `.gitignore:48:items.json` matches the path.

- [ ] **Step 2: Create the direct asset-contract test**

Use `apply_patch` to create `extension/test/defaultItems.test.mjs`:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const extensionDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(extensionDir, 'items.json');

const EXPECTED_ITEMS = [
  {
    type: 'folder',
    label: 'Dynamics Helper Resources',
    children: [
      {
        type: 'link',
        label: 'User Guide',
        url: 'https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md',
      },
      {
        type: 'link',
        label: 'Releases',
        url: 'https://github.com/boatmac/Dynamics-Helper/releases',
      },
      {
        type: 'link',
        label: 'Report a Bug',
        url: 'https://github.com/boatmac/Dynamics-Helper/issues/new',
      },
    ],
  },
  {
    type: 'markdown',
    label: 'About Dynamics Helper',
    content: '# Dynamics Helper\nPublic product resources and support links.',
  },
];

const ALLOWED_KEYS = {
  folder: ['children', 'label', 'type'],
  link: ['label', 'type', 'url'],
  markdown: ['content', 'label', 'type'],
};

function readSource() {
  return readFileSync(sourcePath, 'utf8');
}

function loadItems() {
  return JSON.parse(readSource());
}

function flatten(items) {
  return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

function canonicalSource(items) {
  return `${JSON.stringify(items, null, 2)}\n`;
}

test('tracked defaults contain only the reviewed public product resources', () => {
  const items = loadItems();
  assert.deepEqual(items, EXPECTED_ITEMS);
  assert.equal(readSource(), canonicalSource(EXPECTED_ITEMS));
});

test('tracked defaults use the minimal five-node menu schema', () => {
  const items = loadItems();
  const nodes = flatten(items);

  assert.equal(items.length, 2);
  assert.equal(nodes.length, 5);
  for (const node of nodes) {
    assert.ok(Object.hasOwn(ALLOWED_KEYS, node.type), `unsupported type: ${node.type}`);
    assert.deepEqual(Object.keys(node).sort(), ALLOWED_KEYS[node.type]);
  }
});

test('tracked default links stay inside the public product repository', () => {
  const links = flatten(loadItems()).filter((item) => item.type === 'link');

  assert.equal(links.length, 3);
  for (const link of links) {
    const url = new URL(link.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'github.com');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.port, '');
    assert.ok(url.pathname.startsWith('/boatmac/Dynamics-Helper/'));
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
  }
});

test('tracked defaults contain no credential or internal-service markers', () => {
  const credentialKey = /^(?:accesstoken|apikey|authorization|bearer|clientsecret|credential|password|privatekey|secret|sig|token)$/;
  const forbiddenValues = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    /\bgh[opurs]_[A-Za-z0-9_]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /[?&](?:se|sig|sp|spr|sv)=/i,
    /\b(?:localhost|[A-Za-z0-9.-]+\.(?:corp|internal|local))\b/i,
    /\b(?:10\.\d{1,3}|127\.\d{1,3}|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/,
    /\b(?:blob\.core\.windows\.net|crm\.dynamics\.com|microsoft\.com|sharepoint\.com)\b/i,
    /\b(?:Microsoft|OneSupport|SharePoint|Azure)\b/i,
    /\b(?:access[_-]?token|api[_-]?key|authorization|bearer|client[_-]?secret|credential|password|private[_-]?key|secret|sig|token)\s*[:=]/i,
    /\bauthorization\s*:\s*bearer\b/i,
  ];

  function violations(value, path = '$') {
    if (Array.isArray(value)) {
      return value.flatMap((entry, index) => violations(entry, `${path}[${index}]`));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, entry]) => {
        const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const keyFailures = credentialKey.test(normalizedKey) ? [`${path}.${key}`] : [];
        return [...keyFailures, ...violations(entry, `${path}.${key}`)];
      });
    }
    if (typeof value === 'string') {
      let unsafe = forbiddenValues.some((pattern) => pattern.test(value));
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        unsafe ||= Boolean(url.username || url.password || url.port);
      }
      return unsafe ? [path] : [];
    }
    return [];
  }

  assert.deepEqual(violations(loadItems()), []);

  const unsafe = [
    { access_token: 'value' },
    { api_key: 'value' },
    { Authorization: 'value' },
    { bearer: 'value' },
    { clientSecret: 'value' },
    { credential: 'value' },
    { password: 'value' },
    { private_key: 'value' },
    { secret: 'value' },
    { sig: 'value' },
    { token: 'value' },
    { url: 'https://example.com/?sig=value' },
    { url: 'https://example.com/?se=value' },
    { url: 'https://example.com/?sp=value' },
    { url: 'https://example.com/?spr=value' },
    { url: 'https://example.com/?sv=value' },
    { url: 'https://user:password@github.com/boatmac/Dynamics-Helper/releases' },
    { url: 'https://github.com:8443/boatmac/Dynamics-Helper/releases' },
    { url: 'https://tenant.sharepoint.com/path' },
    { url: 'https://account.blob.core.windows.net/container' },
    { url: 'https://tenant.crm.dynamics.com/path' },
    { url: 'https://localhost/path' },
    { url: 'https://service.corp/path' },
    { url: 'https://service.internal/path' },
    { url: 'https://service.local/path' },
    { url: 'https://10.2.3.4/path' },
    { url: 'https://127.0.0.1/path' },
    { url: 'https://169.254.1.2/path' },
    { url: 'https://172.16.1.2/path' },
    { url: 'https://192.168.1.2/path' },
    { content: '-----BEGIN PRIVATE KEY-----' },
    { content: 'access_token=value' },
    { content: 'api-key=value' },
    { content: 'authorization=value' },
    { content: 'authorization: Bearer value' },
    { content: 'bearer=value' },
    { content: 'credential=value' },
    { content: 'password=value' },
    { content: 'client_secret=value' },
    { content: 'private_key=value' },
    { content: 'secret=value' },
    { content: 'sig=value' },
    { content: 'token=value' },
    { content: 'gho_12345678901234567890' },
    { content: 'ghu_12345678901234567890' },
    { content: 'ghs_12345678901234567890' },
    { content: 'ghr_12345678901234567890' },
    { content: 'ghp_12345678901234567890' },
    { content: 'github_pat_12345678901234567890' },
    { content: 'Microsoft internal resource' },
    { content: 'OneSupport internal resource' },
    { content: 'SharePoint internal resource' },
    { content: 'Azure internal resource' },
    { url: 'https://microsoft.com/path' },
  ];
  for (const probe of unsafe) {
    assert.notDeepEqual(violations(probe), []);
  }

  const safe = [
    { content: 'Release token budgeting guidance' },
    { content: 'Secret-free public support links' },
    { content: 'Version 10.2.3 release notes' },
  ];
  for (const probe of safe) {
    assert.deepEqual(violations(probe), []);
  }
});

test('canonical source rejects hidden duplicate-key bytes', () => {
  const duplicateKeySource = '[{"type":"link","type":"markdown"}]\n';
  assert.notEqual(duplicateKeySource, canonicalSource(JSON.parse(duplicateKeySource)));
});
```

- [ ] **Step 3: Add the standalone test script**

Use `apply_patch` to add this entry under `scripts` in
`extension/package.json`, without changing any existing script yet:

```json
"test:default-items": "node --test test/defaultItems.test.mjs"
```

- [ ] **Step 4: Run the test and verify the expected RED**

```powershell
npm run test:default-items --prefix extension
```

Expected: exit code `1`; the first failing test reports `ENOENT` for
`extension/items.json`. A syntax error or any other failure is not an acceptable
RED.

### Task 2: Add the Public Asset and Make the Contract GREEN

**Files:**

- Create: `extension/items.json`
- Modify: `.gitattributes`
- Modify: `.gitignore:47-49`
- Modify: `extension/src/components/Options.collapseFolders.test.ts:5-74`

- [ ] **Step 1: Add the exact approved tracked asset**

Use `apply_patch` to create `extension/items.json`:

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

- [ ] **Step 2: Remove the global ignore rule**

Use `apply_patch` to delete only this line from `.gitignore`:

```gitignore
items.json
```

Keep the surrounding `# Misc` section and `build/` rule.

- [ ] **Step 3: Pin the asset to LF bytes**

If `.gitattributes` does not exist, use `apply_patch` to create it. Otherwise
append this rule with `apply_patch`:

```gitattributes
extension/items.json text eol=lf
```

- [ ] **Step 4: Verify the asset is no longer ignored**

```powershell
git check-ignore -v -- "extension/items.json"
```

Expected: no output, exit code `1`.

- [ ] **Step 5: Run the direct contract test and verify GREEN**

```powershell
npm run test:default-items --prefix extension
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 6: Prove the contract test catches unsafe drift**

Temporarily use `apply_patch` to change only the User Guide hostname in
`extension/items.json` from `github.com` to `example.com`.

```powershell
npm run test:default-items --prefix extension
```

Expected: exit code `1`; the exact-resource assertion and public-repository URL
assertion fail.

Use `apply_patch` to restore the exact approved URL, then rerun:

```powershell
npm run test:default-items --prefix extension
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 7: Remove the stale private default-shape fixture**

In `extension/src/components/Options.collapseFolders.test.ts`, replace the file
header comment with exactly:

```typescript
/**
 * collapseFolders is the shared helper used by BOTH the initial mount path
 * AND handleReset. The tracked public default intentionally omits `collapsed`,
 * so both paths must apply the same recursive runtime transformation.
 */
```

Then replace the final test with this generic behavior-only test:

```typescript
    it('collapses every folder in a mixed default-like tree', () => {
        const defaultShape: MenuItem[] = [
            {
                type: 'folder',
                label: 'Resources',
                children: [{ type: 'link', label: 'Guide', url: 'https://example.com' }],
            },
            { type: 'link', label: 'Release Notes', url: 'https://example.com/releases' },
            { type: 'markdown', label: 'About', content: '# About' },
        ];
        const result = collapseFolders(defaultShape);
        const folders = result.filter(i => i.type === 'folder');
        expect(folders).toHaveLength(1);
        expect(folders[0].collapsed).toBe(true);
    });
```

- [ ] **Step 8: Verify the focused tests**

Install exact dependencies if `extension/node_modules` is absent:

```powershell
npm ci --prefix extension
```

```powershell
npm run test:default-items --prefix extension
```

Expected: 5 tests pass.

```powershell
npm run test:run --prefix extension -- src/components/Options.collapseFolders.test.ts
```

Expected: 1 Vitest file and 5 tests pass.

- [ ] **Step 9: Commit the tracked asset and contract**

```powershell
git add -- .gitattributes .gitignore extension/items.json extension/package.json extension/test/defaultItems.test.mjs extension/src/components/Options.collapseFolders.test.ts
```

```powershell
git diff --cached --check
```

```powershell
git ls-files --error-unmatch extension/items.json
```

Expected: `extension/items.json`.

```powershell
git commit -m "fix(extension): track public default menu"
```

### Task 3: Verify the Built Asset Is Byte-Identical

**Files:**

- Create: `extension/scripts/verifyDefaultItemsCopy.mjs`
- Modify: `extension/package.json:6-13`

- [ ] **Step 1: Create the post-build byte verifier**

Use `apply_patch` to create `extension/scripts/verifyDefaultItemsCopy.mjs`:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(extensionDir, 'items.json'));
const built = readFileSync(resolve(extensionDir, 'dist', 'items.json'));

assert.ok(source.equals(built), 'dist/items.json differs from tracked items.json');
console.log('default menu build copy: PASS');
```

- [ ] **Step 2: Add the verifier script without changing `build` yet**

Add this entry under `scripts` in `extension/package.json`:

```json
"verify:default-items-copy": "node scripts/verifyDefaultItemsCopy.mjs"
```

- [ ] **Step 3: Verify the expected pre-build RED**

Ensure this clean branch has no existing build output:

```powershell
Test-Path -LiteralPath "extension\dist\items.json"
```

Expected: `False`.

```powershell
npm run verify:default-items-copy --prefix extension
```

Expected: exit code `1` with `ENOENT` for `extension/dist/items.json`.

- [ ] **Step 4: Integrate both checks into normal scripts**

Replace the four relevant scripts in `extension/package.json` with exactly:

```json
"build": "npm run test:default-items && tsc && vite build && npm run verify:default-items-copy",
"test:run": "npm run test:default-items && vitest run",
"test:coverage": "npm run test:default-items && vitest run --coverage",
"verify:default-items-copy": "node scripts/verifyDefaultItemsCopy.mjs"
```

Keep `test`, `dev`, `preview`, and `test:default-items` unchanged.

- [ ] **Step 5: Run the complete build and verify GREEN**

```powershell
npm run build --prefix extension
```

Expected: 5 Node contract tests pass; TypeScript and Vite exit `0`; final line
includes `default menu build copy: PASS`.

- [ ] **Step 6: Independently compare source and built bytes**

```powershell
& { $source=(Get-FileHash -Algorithm SHA256 -LiteralPath "extension\items.json").Hash; $built=(Get-FileHash -Algorithm SHA256 -LiteralPath "extension\dist\items.json").Hash; if ($source -ne $built) { throw "items.json build hash mismatch" }; "items.json SHA-256: $source" }
```

Expected: one SHA-256 value and no mismatch.

```powershell
& { $working=(git hash-object --no-filters extension/items.json); $committed=(git rev-parse HEAD:extension/items.json); if ($working -ne $committed) { throw "working items.json bytes differ from committed blob" }; "committed items.json blob: $committed" }
```

Expected: one Git blob ID and no mismatch.

- [ ] **Step 7: Commit build-copy enforcement**

```powershell
git add -- extension/package.json extension/scripts/verifyDefaultItemsCopy.mjs
```

```powershell
git diff --cached --check
```

```powershell
git commit -m "build(extension): verify default menu asset"
```

### Task 4: Document Public Defaults and Release Provenance

**Files:**

- Modify: `USER_GUIDE.md:227-243`
- Modify: `DEVELOPER_GUIDE.md:268-275`
- Modify: `AGENTS.md:334-352`

- [ ] **Step 1: Freeze the historical release-note boundary**

```powershell
git diff --quiet HEAD -- releases/notes-v2.0.70-beta.5.md; if ($LASTEXITCODE -ne 0) { throw "historical release note is modified" }
```

```powershell
git rev-parse HEAD:releases/notes-v2.0.70-beta.5.md
```

Expected: no working-tree diff and one full blob ID. Record the ID in task
evidence. Historical release notes remain unchanged even though this design
resolves their old policy follow-up.

- [ ] **Step 2: Correct the Team Catalog bookmark type**

In the `USER_GUIDE.md` team bookmark example, replace:

```json
{ "type": "url", "label": "Sales Dashboard", "url": "https://..." }
```

with:

```json
{ "type": "link", "label": "Sales Dashboard", "url": "https://..." }
```

- [ ] **Step 3: Document default-menu compatibility**

Immediately after the **Personal bookmarks** paragraph in `USER_GUIDE.md`, add:

```markdown
**Built-in defaults:** New browser profiles start with public Dynamics Helper documentation, release, and issue-reporting links. An upgrade does not replace a non-empty personal bookmark menu. Missing, invalid, or empty personal bookmark storage falls back to the shipped defaults. Clearing browser storage or clicking **Reset** loads the currently shipped public defaults again.
```

- [ ] **Step 4: Document the required packaged-asset rule for developers**

Immediately after `DEVELOPER_GUIDE.md`'s Test File Conventions list, add:

```markdown
### Required Packaged Assets

`extension/items.json` is the tracked public bootstrap menu consumed by both Options and FAB and copied by CRXJS into `extension/dist/items.json`. It must never contain internal URLs, credentials, query strings, or organization-specific content. Personal bookmarks live in `dh_items`; Team Catalog data is fetched separately.

Every file referenced by `extension/manifest.json` must either be tracked or be produced deterministically by a reviewed build step before release tagging. `npm run build` verifies that the packaged `items.json` is byte-identical to the tracked source.
```

- [ ] **Step 5: Add the release provenance rule for agents**

Under `AGENTS.md`'s release workflow, immediately before **What it does**, add:

```markdown
**Required packaged assets:** Every manifest-referenced release input must be tracked or reproducibly generated before a release tag is created. `extension/items.json` is a tracked public-only product asset; never replace it with an ignored local/private menu. The Extension build must finish with the source/dist byte-identity check passing.
```

- [ ] **Step 6: Verify active documentation and historical immutability**

```powershell
git grep -n '"type": "url"' -- USER_GUIDE.md
```

Expected: no output, exit code `1`.

```powershell
git rev-parse HEAD:releases/notes-v2.0.70-beta.5.md
```

Expected: the same full blob ID recorded before the documentation edits.

```powershell
git diff --quiet HEAD -- releases/notes-v2.0.70-beta.5.md; if ($LASTEXITCODE -ne 0) { throw "historical release note changed" }
```

Expected: exit code `0`.

```powershell
git diff --check
```

Expected: exit code `0`.

- [ ] **Step 7: Run the complete Extension verification**

```powershell
npm run test:run --prefix extension
```

Expected: 5 Node contract tests pass, followed by the existing 6 Vitest files
and 43 Vitest tests passing.

```powershell
npm run build --prefix extension
```

Expected: build exits `0` and prints `default menu build copy: PASS`.

- [ ] **Step 8: Commit documentation**

```powershell
git add -- USER_GUIDE.md DEVELOPER_GUIDE.md AGENTS.md
```

```powershell
git diff --cached --check
```

```powershell
git commit -m "docs(menu): document public defaults"
```

### Task 5: Prove Fresh-Clone Reproducibility

**Files:**

- Create temporary clone: `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-verification`
- No tracked file changes.

- [ ] **Step 1: Verify the product branch is clean and reserve the target**

```powershell
git status --short --branch
```

Expected: clean `docs/sanitized-default-menu-design`.

```powershell
Test-Path -LiteralPath "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-verification"
```

Expected: `False`.

Immediately before cloning, verify the source HEAD still descends from the
reviewed canonical base:

```powershell
& { $head=(git rev-parse HEAD); git merge-base --is-ancestor 0040b1de1bc196b203014a8e4f94a53babb7e9aa $head; if ($LASTEXITCODE -ne 0) { throw "product branch does not descend from canonical master" }; "product source HEAD before clone: $head" }
```

Expected: one full 40-character SHA and exit code `0`.

- [ ] **Step 2: Clone the exact local product branch without hardlinks**

Run from `C:\Users\zhaobo\AppData\Local\Temp\opencode`:

```powershell
git clone --no-hardlinks --branch docs/sanitized-default-menu-design --single-branch "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-design" "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-verification"
```

- [ ] **Step 3: Verify the fresh clone contains the tracked asset before setup**

Run from the verification clone:

```powershell
git ls-files --error-unmatch extension/items.json
```

Expected: `extension/items.json`.

```powershell
git status --short --branch
```

Expected: clean branch.

```powershell
git rev-parse HEAD
```

Compare it directly with the source repository:

```powershell
& { $source=(git -C "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-design" rev-parse HEAD); $clone=(git rev-parse HEAD); if ($source -ne $clone) { throw "verification clone HEAD mismatch" }; "verified product HEAD: $clone" }
```

Expected: one matching full SHA.

- [ ] **Step 4: Install dependencies and run all Extension checks**

```powershell
npm ci --prefix extension
```

```powershell
npm run test:run --prefix extension
```

Expected: 5 Node contract tests plus 6 Vitest files / 43 Vitest tests pass.

```powershell
npm run build --prefix extension
```

Expected: build exits `0` and prints `default menu build copy: PASS`.

- [ ] **Step 5: Verify byte identity and clean tracked state in the fresh clone**

```powershell
& { $source=(Get-FileHash -Algorithm SHA256 -LiteralPath "extension\items.json").Hash; $built=(Get-FileHash -Algorithm SHA256 -LiteralPath "extension\dist\items.json").Hash; if ($source -ne $built) { throw "items.json build hash mismatch" }; "fresh-clone items.json SHA-256: $source" }
```

```powershell
& { $working=(git hash-object --no-filters extension/items.json); $committed=(git rev-parse HEAD:extension/items.json); if ($working -ne $committed) { throw "working items.json bytes differ from committed blob" }; "fresh-clone committed items.json blob: $committed" }
```

```powershell
git status --short --branch
```

Expected: clean tracked status; ignored `node_modules` and `dist` do not appear.

After all checks, reassert that the source branch has not moved beyond the
tested clone:

```powershell
& { $source=(git -C "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-design" rev-parse HEAD); $clone=(git rev-parse HEAD); if ($source -ne $clone) { throw "source branch moved after verification clone was created" }; git merge-base --is-ancestor 0040b1de1bc196b203014a8e4f94a53babb7e9aa $clone; if ($LASTEXITCODE -ne 0) { throw "tested product SHA is not based on canonical master" }; "tested product SHA: $clone" }
```

Expected: one matching full SHA. This exact clone SHA is the only eligible
lineage target.

- [ ] **Step 6: Record the final product commit for the lineage amendment**

Run first in the verification clone and record the tested SHA:

```powershell
git rev-parse HEAD
```

Then run in the product branch and require the identical SHA:

```powershell
& { $source=(git rev-parse HEAD); $tested=(git -C "C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-sanitized-default-menu-verification" rev-parse HEAD); if ($source -ne $tested) { throw "product source no longer matches tested clone" }; "new canonical product target: $tested" }
```

Record that full 40-character tested SHA as the new canonical product target.

```powershell
git log --oneline --decorate 0040b1de1bc196b203014a8e4f94a53babb7e9aa..HEAD
```

Expected: the specification, its reviewed amendment, the committed plan, and
three implementation commits are all visible.

```powershell
git status --short --branch
```

Expected: clean branch.

## Follow-up Plan Boundary

After Task 5, write a separate exact lineage-amendment plan based on committed
lineage-plan SHA `9b96fe118277a7157de0e275319eb9654cc43ef1` and the recorded product SHA.
It must distinguish two immutable values:

- **Pre-mutation remote SHA:**
  `0040b1de1bc196b203014a8e4f94a53babb7e9aa`.
- **Post-fast-forward canonical target:** the recorded product SHA.

That plan must:

- Preserve the full pre-mutation SHA in Task 1-3 historical evidence and every
  GitHub pre-push drift gate.
- Add a separately authorized fast-forward of the reviewed product commit to
  `master`, with exact old/new SHAs and immediate read-back, before any gate
  expects the post-fix target.
- Replace target-state checks, fresh clones, protection checks, and local
  handoff assertions with the full post-fast-forward product SHA only after
  that step.
- Remove both `numTotalTestSuites == 6` and
  `numPassedTestSuites == 6` as file-count assertions. Require
  `len(testResults) == 6`, validate those six rows against the exact tracked
  Vitest filenames, require every row status is `passed`, and retain 43 total
  and passed tests.
- Populate any `extension_files` result field from `len(testResults)`, never
  from either suite counter. Suite counters may remain recorded only when
  explicitly labeled as nested-suite statistics.
- Catalog the failed Task 4 attempts as historical, non-authoritative evidence.
- Define a new append-only Task 4 phase and external authority snapshot.
- Require separate user authorization before any push or GitHub setting change.

The lineage amendment's own documentation commit SHA must never become the
product target. Do not guess or precompute the product SHA in this plan, and do not amend the
lineage documents before the product branch passes fresh-clone verification.
