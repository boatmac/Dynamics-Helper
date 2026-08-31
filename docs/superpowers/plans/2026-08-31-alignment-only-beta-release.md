# Alignment-Only Beta Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, and publish `2.0.75-beta.1` from the completed prompt-alignment boundary without unfinished Plan D code.

**Architecture:** Use an isolated branch based on `1ba54f3`, add the complete public default-menu build unit, and produce a paired Extension/Native Host ZIP. Verification is batched and observable; tag and publication occur only after the exact committed release candidate reproduces the verified build.

**Tech Stack:** React 19, TypeScript 5.9, Vitest 3, Python 3.13, unittest, PyInstaller 6.22.2, PowerShell 7, GitHub CLI

---

### Task 1: Complete The Buildable Source Boundary

**Files:**
- Add: `extension/items.json`
- Add: `extension/test/defaultItems.test.mjs`
- Add: `extension/scripts/verifyDefaultItemsCopy.mjs`
- Modify: `extension/package.json`
- Modify: `.gitignore`
- Modify: `.gitattributes`
- Modify: `AGENTS.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `USER_GUIDE.md`

- [ ] Apply the complete reviewed public-menu test, asset, build, and documentation change set.
- [ ] Run `node --test extension/test/defaultItems.test.mjs`; require all five tests to pass.
- [ ] Verify the build script runs the source check before Vite and the dist check afterward.
- [ ] Commit the complete unit; never commit or publish its RED-only state.

### Task 2: Prepare The Isolated Toolchain

**Files:**
- Generate ignored: `host/venv/`
- Generate ignored: `extension/node_modules/`

- [ ] Create `host/venv` with Python 3.13.
- [ ] Install `host/requirements.txt`, which pins the reviewed SDK `1.0.5`, and exact `pyinstaller==6.22.2`.
- [ ] Run `npm ci` in `extension/`.
- [ ] Record resolved Python, SDK, Node, npm, and PyInstaller versions.

### Task 3: Version The Complete Candidate

**Files:**
- Modify: `extension/package.json`
- Modify: `extension/package-lock.json`
- Modify: `extension/manifest.json`
- Modify: `host/dh_native_host.py`
- Create: `releases/notes-v2.0.75-beta.1.md`

- [ ] Set every product version to `2.0.75-beta.1`; Chrome numeric version is `2.0.75`.
- [ ] Write release notes that describe prompt-source alignment and public defaults only.
- [ ] Reject any Plan D, transactional-update, direct-bootstrap, or quarantine claim.

### Task 4: Run Observable Verification

**Files:**
- Update: `docs/alignment-beta-release-progress.md`

- [ ] Discover exact Host and Extension test totals before execution.
- [ ] Run prompt-alignment selectors first.
- [ ] Run complete Host tests in bounded batches and report cumulative `N/total` progress.
- [ ] Run complete Extension tests in bounded file batches and report cumulative assertion progress.
- [ ] Run TypeScript and production Extension build gates.
- [ ] Stop after at most three review/fix rounds if a blocking defect remains.

### Task 5: Build And Validate The Paired Release

**Files:**
- Generate ignored: `extension/dist/`
- Generate ignored: `dist/dh_native_host/`
- Generate ignored: `releases/DynamicsHelper_v2.0.75-beta.1.zip`

- [ ] Build the Host with `host/venv/Scripts/pyinstaller.exe --onedir --clean -y --name dh_native_host host/dh_native_host.py`.
- [ ] Run an isolated frozen-host version/probe check without registration or AppData mutation.
- [ ] Create the full ZIP through existing release packaging.
- [ ] Inspect ZIP required paths, embedded Extension/Host version agreement, and SHA-256.

### Task 6: Commit, Rebuild, And Publish

**Files:**
- Update: `docs/alignment-beta-release-progress.md`

- [ ] Stage only the complete source, release notes, and final progress record.
- [ ] Inspect status, diff, and recent history; commit `chore: release v2.0.75-beta.1`.
- [ ] Rebuild and rerun release-critical gates at the exact commit.
- [ ] Create lightweight tag `v2.0.75-beta.1` only after exact-commit PASS.
- [ ] Push only `release/alignment-2.0.75-beta.1` and `refs/tags/v2.0.75-beta.1`.
- [ ] Create a GitHub prerelease with the exact ZIP and notes file, then verify tag target, prerelease state, asset name, size, and SHA-256.
