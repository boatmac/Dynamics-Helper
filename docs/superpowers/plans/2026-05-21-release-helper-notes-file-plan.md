# `release_helper.py --notes-file` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--notes-file PATH` CLI flag to `release_helper.py` so GitHub releases can ship real markdown notes via a single command, and narrow `clean_releases_folder()` so the notes file survives the pre-build clean step.

**Architecture:** Four local edits inside `release_helper.py` (single-file Python script). New argparse flag → startup-time existence check → conditional `gh release create` dispatch → allowlist-only delete in clean step. Zero new dependencies, zero new files, fully backward compatible.

**Tech Stack:** Python 3.x (argparse, subprocess, os, shutil — all stdlib), GitHub CLI (`gh`) for the actual publish call.

**Spec:** `docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md`

**Testing note:** The project has no pytest infrastructure for `release_helper.py` and the spec explicitly opts out of adding one ("a one-shot script doesn't earn it"). Validation is done via the manual matrix in Task 6 using a dry-run mode that exercises the argparse + existence-check path without invoking gh.

---

## File Structure

Only one file changes:

- **Modify:** `release_helper.py` — four touch points:
  1. `argparse` parser definition in `main()` (~line 308)
  2. Startup-time `--notes-file` existence check, immediately after `parser.parse_args()` (~line 320)
  3. `publish_to_github()` signature + dispatch (~lines 246-284)
  4. `clean_releases_folder()` body rewritten with allowlist (~lines 287-304)
  5. Call site in `main()` passes the new argument through (~line 381)

Plus two documentation files:

- **Modify:** `AGENTS.md` — § 8 Release Workflow adds the `--notes-file` invocation example
- **Modify:** `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` — mark follow-up #10 as closed with a cross-reference

---

## Task 1: Add `--notes-file` argparse flag

**Files:**
- Modify: `release_helper.py` (function `main()`, immediately after the existing `--prerelease` argument definition near line 316)

- [ ] **Step 1: Read current argparse block to anchor the edit**

```bash
# In opencode: use Read tool with offset=307, limit=20 on release_helper.py
# Confirm the block ends at line ~319 with `--prerelease` definition
```

Expected: see lines 313-318 with `--no-build`, `--publish`, `--prerelease` parser.add_argument calls.

- [ ] **Step 2: Add the new argument**

Edit `release_helper.py`. Locate this existing block:

```python
    parser.add_argument(
        "--prerelease", action="store_true", help="Mark as pre-release on GitHub"
    )

    args = parser.parse_args()
```

Replace with:

```python
    parser.add_argument(
        "--prerelease", action="store_true", help="Mark as pre-release on GitHub"
    )
    parser.add_argument(
        "--notes-file",
        help="Path to a markdown file used as the GitHub release body. "
             "Without this flag, falls back to the hardcoded 4-line template.",
    )

    args = parser.parse_args()
```

- [ ] **Step 3: Smoke test argparse**

Run:

```bash
python release_helper.py --help
```

Expected output includes:
- A new line under "options:" reading `--notes-file NOTES_FILE  Path to a markdown file used as the GitHub release body...`
- All existing flags (`--no-build`, `--publish`, `--prerelease`) still present.

- [ ] **Step 4: Verify args namespace receives `notes_file`**

Run:

```bash
python -c "import sys; sys.argv=['release_helper.py', '0.0.0', '--notes-file', 'foo.md']; import argparse; import release_helper; p=argparse.ArgumentParser(); p.add_argument('version'); p.add_argument('--no-build', action='store_true'); p.add_argument('--publish', action='store_true'); p.add_argument('--prerelease', action='store_true'); p.add_argument('--notes-file'); print(p.parse_args())"
```

Expected: `Namespace(version='0.0.0', no_build=False, publish=False, prerelease=False, notes_file='foo.md')`

(This standalone parser mimics the helper's parser to confirm `--notes-file` lands in `args.notes_file` — Python's argparse hyphen-to-underscore conversion.)

- [ ] **Step 5: Commit**

```bash
git add release_helper.py
git commit -m "release_helper: add --notes-file argparse flag

Argparse-only change. Flag is parsed but not yet wired up to
publish_to_github(). Backward compatible: omitting the flag yields
args.notes_file=None, which subsequent tasks treat as 'use the
hardcoded template'.

Spec: docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md"
```

---

## Task 2: Startup-time existence check for `--notes-file`

**Files:**
- Modify: `release_helper.py` (function `main()`, immediately after `args = parser.parse_args()` and before `clean_releases_folder(...)` call near line 322-324)

- [ ] **Step 1: Read the current main() entry section to anchor the edit**

```bash
# Use Read tool on release_helper.py with offset=320, limit=8
```

Expected: see `args = parser.parse_args()`, blank line, `# 0. Clean Releases Folder`, `releases_dir = os.path.join(...)`, `clean_releases_folder(releases_dir)`.

- [ ] **Step 2: Insert the existence check**

Edit `release_helper.py`. Locate:

```python
    args = parser.parse_args()

    # 0. Clean Releases Folder
    releases_dir = os.path.join(ROOT_DIR, "releases")
    clean_releases_folder(releases_dir)
```

Replace with:

```python
    args = parser.parse_args()

    # Fail fast on --notes-file pointing nowhere. Must run BEFORE
    # clean_releases_folder() so a typo cannot trigger pointless cleanup.
    if args.notes_file and not os.path.isfile(args.notes_file):
        print(f"Error: --notes-file '{args.notes_file}' does not exist.")
        sys.exit(1)

    # 0. Clean Releases Folder
    releases_dir = os.path.join(ROOT_DIR, "releases")
    clean_releases_folder(releases_dir)
```

- [ ] **Step 3: Verify the failure path**

Run:

```bash
python release_helper.py 0.0.0 --notes-file does-not-exist.md
```

Expected:
- stdout: `Error: --notes-file 'does-not-exist.md' does not exist.`
- exit code: 1 (verify with `echo $LASTEXITCODE` on PowerShell or `echo $?` on bash)
- `releases/` folder NOT cleaned (check `Get-ChildItem releases\` — anything that was there should still be there)

- [ ] **Step 4: Verify the success path (file exists, no other effects yet)**

```bash
"placeholder" | Out-File -Encoding utf8 -FilePath "C:\Users\zhaobo\AppData\Local\Temp\opencode\dummy-notes.md"
python release_helper.py 0.0.0 --notes-file "C:\Users\zhaobo\AppData\Local\Temp\opencode\dummy-notes.md"
```

Expected:
- The existence check passes silently
- Execution continues into the existing version-bump / build flow (will fail later because `0.0.0` is a fake version, but that's fine — we're confirming the check itself doesn't block valid inputs)

**Stop the run with Ctrl-C** after the cleanup step prints, OR let it fail naturally on the version bump / git step. We only need to confirm the existence check doesn't bail out.

- [ ] **Step 5: Restore repo state**

If the run got past the git step and committed anything, undo it:

```bash
git status
# If any staged changes from the test run exist:
git reset --hard HEAD
```

- [ ] **Step 6: Commit**

```bash
git add release_helper.py
git commit -m "release_helper: fail fast when --notes-file does not exist

Existence check runs immediately after parse_args(), before any
side-effecting work. A typo in the notes-file path no longer wastes
the clean / bump / build cycle.

Spec: docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md"
```

---

## Task 3: Wire `--notes-file` through `publish_to_github()`

**Files:**
- Modify: `release_helper.py` (function `publish_to_github`, lines 246-284)
- Modify: `release_helper.py` (call site in `main()`, near line 380-381)

- [ ] **Step 1: Read the current publish_to_github() function**

```bash
# Use Read tool on release_helper.py with offset=246, limit=40
```

Expected: see the full function including hardcoded `notes = (f"Release {tag}\n\n" ...)` block and the `cmd = ["gh", "release", "create", ...]` construction.

- [ ] **Step 2: Update the function signature and dispatch**

Edit `release_helper.py`. Replace the entire `publish_to_github()` function body with:

```python
def publish_to_github(version, zip_path, prerelease=False, notes_file=None):
    print(f"\n--- Publishing v{version} to GitHub ---")

    try:
        subprocess.run(
            ["gh", "--version"], check=True, stdout=subprocess.DEVNULL
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(
            "Error: 'gh' CLI not found. Please install GitHub CLI to publish releases."
        )
        return

    tag = f"v{version}"
    title = f"v{version}"

    if notes_file:
        # Path was validated for existence at startup (main() guard).
        cmd = [
            "gh", "release", "create", tag, zip_path,
            "--title", title, "--notes-file", notes_file,
        ]
    else:
        notes = (
            f"Release {tag}\n\n"
            "## Installation\n"
            "1. Download and extract the zip file.\n"
            "2. Double-click `install.bat` (Safely bypasses PowerShell restrictions).\n"
            "3. Follow the on-screen instructions."
        )
        # Use argv-list form (NOT shell=True) so the multi-line --notes string
        # cannot swallow the trailing --prerelease flag. Previously
        # `shell=True` with a single f-string command silently dropped
        # --prerelease on Windows; verified by observing isPrerelease=false
        # on the v2.0.70-beta release.
        cmd = [
            "gh", "release", "create", tag, zip_path,
            "--title", title, "--notes", notes,
        ]

    if prerelease:
        cmd.append("--prerelease")

    print(
        f"Executing: {' '.join(cmd[:5])} ... "
        f"(prerelease={prerelease}, notes_file={notes_file})"
    )

    try:
        subprocess.run(cmd, check=True)
        print("GitHub Release created successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Failed to create GitHub Release: {e}")
```

Key changes:
1. Signature: added `notes_file=None` (default keeps backward compat with positional callers).
2. Branch: if `notes_file` truthy → `--notes-file PATH`; else → existing `--notes` inline template.
3. Comment moved next to the inline-notes branch where it still applies.
4. `print(...)` debug line includes `notes_file=` for visibility.

- [ ] **Step 3: Update the call site in main()**

Locate this block in `main()` (near line 380):

```python
    if args.publish and zip_path:
        publish_to_github(args.version, zip_path, args.prerelease)
    elif args.publish and not zip_path:
        print("Error: Cannot publish without building.")
```

Replace with:

```python
    if args.publish and zip_path:
        publish_to_github(args.version, zip_path, args.prerelease, args.notes_file)
    elif args.publish and not zip_path:
        print("Error: Cannot publish without building.")
```

(One-line change: append `, args.notes_file` to the call.)

- [ ] **Step 4: Smoke test — import the module to catch syntax errors**

```bash
python -c "import release_helper; print('publish_to_github sig:', release_helper.publish_to_github.__code__.co_varnames[:4])"
```

Expected: `publish_to_github sig: ('version', 'zip_path', 'prerelease', 'notes_file')`

- [ ] **Step 5: Verify backward-compat dispatch path (notes_file=None)**

Inspect the function logic mentally or run a dry trace:

```bash
python -c "
import release_helper
import inspect
src = inspect.getsource(release_helper.publish_to_github)
assert 'if notes_file:' in src
assert '--notes-file' in src
assert '--notes' in src  # the fallback path still uses --notes inline
print('Both code paths present.')
"
```

Expected: `Both code paths present.`

- [ ] **Step 6: Commit**

```bash
git add release_helper.py
git commit -m "release_helper: dispatch publish_to_github to --notes-file when provided

publish_to_github() now accepts notes_file=None. When truthy, builds
the gh release create command with --notes-file PATH; when None
(default), preserves the existing 4-line hardcoded template. The
call site in main() passes args.notes_file through.

Spec: docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md"
```

---

## Task 4: Narrow `clean_releases_folder()` to allowlist deletion

**Files:**
- Modify: `release_helper.py` (function `clean_releases_folder`, lines 287-304)

- [ ] **Step 1: Read the current clean_releases_folder() function**

```bash
# Use Read tool on release_helper.py with offset=287, limit=20
```

Expected: see the current loop that calls `os.unlink()` on any file and `shutil.rmtree()` on any directory under `releases/`.

- [ ] **Step 2: Replace the function**

Edit `release_helper.py`. Replace the entire `clean_releases_folder()` function with:

```python
def clean_releases_folder(release_folder):
    """Delete only build artifacts (*.zip and DynamicsHelper_v* staging dirs).

    Preserves release-notes markdown and any other user-curated files placed
    in releases/. Callers may safely keep `notes-v<version>.md` next to the
    zip without losing it on the next build.

    Previously this function indiscriminately wiped everything under
    release_folder, which forced release notes to live outside the repo
    during the v2.0.70-beta.3 release. Allowlist behaviour fixes that
    papercut (follow-up #10).
    """
    if not os.path.exists(release_folder):
        os.makedirs(release_folder)
        return

    print(f"Cleaning build artifacts in {release_folder}...")
    for item in os.listdir(release_folder):
        item_path = os.path.join(release_folder, item)
        is_zip = os.path.isfile(item_path) and item.lower().endswith(".zip")
        is_staging_dir = (
            os.path.isdir(item_path) and item.startswith("DynamicsHelper_v")
        )
        if not (is_zip or is_staging_dir):
            continue
        try:
            if is_zip:
                os.unlink(item_path)
            else:
                shutil.rmtree(item_path)
        except Exception as e:
            print(f"Failed to delete {item_path}. Reason: {e}")
```

- [ ] **Step 3: Verify behaviour with a controlled setup**

Set up a test scenario inside `releases/` and run only the clean function in isolation:

```bash
# Make sure releases/ exists and has known contents
New-Item -ItemType Directory -Force -Path "releases" | Out-Null
"zip-stub" | Out-File -Encoding utf8 -FilePath "releases\old-build.zip"
"# notes" | Out-File -Encoding utf8 -FilePath "releases\notes-v0.0.0-test.md"
New-Item -ItemType Directory -Force -Path "releases\DynamicsHelper_v0.0.0-test" | Out-Null
"stub" | Out-File -Encoding utf8 -FilePath "releases\DynamicsHelper_v0.0.0-test\stub.txt"
New-Item -ItemType Directory -Force -Path "releases\not-a-build-dir" | Out-Null
"stub" | Out-File -Encoding utf8 -FilePath "releases\not-a-build-dir\keep.txt"

# Now invoke just the clean function
python -c "
import os, sys
sys.path.insert(0, '.')
import release_helper
release_helper.clean_releases_folder(os.path.join(os.getcwd(), 'releases'))
"

# Check what's left
Get-ChildItem -Recurse releases\
```

Expected after cleanup:
- ✅ `releases\notes-v0.0.0-test.md` still present
- ✅ `releases\not-a-build-dir\` still present (including `keep.txt`)
- ❌ `releases\old-build.zip` deleted
- ❌ `releases\DynamicsHelper_v0.0.0-test\` deleted (entire directory)

- [ ] **Step 4: Clean up test artifacts**

```bash
Remove-Item -Recurse -Force releases\notes-v0.0.0-test.md, releases\not-a-build-dir -ErrorAction SilentlyContinue
```

- [ ] **Step 5: Commit**

```bash
git add release_helper.py
git commit -m "release_helper: narrow clean_releases_folder to allowlist deletion

Now removes only *.zip files and DynamicsHelper_v* staging directories.
Release notes markdown and any other user-curated files in releases/
survive the clean step.

Previously the function indiscriminately wiped everything under
releases/, which forced beta.3 release notes to live in %TEMP% to
avoid being deleted. Allowlist behaviour closes follow-up #10 papercut.

Spec: docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md"
```

---

## Task 5: End-to-end manual validation (dry-run + real publish)

**Files:** None (validation only)

This task exercises the spec's validation matrix scenarios 1-5 against the just-modified script. **No commit at the end of this task** unless one of the scenarios reveals a bug to fix.

- [ ] **Step 1: Scenario 3 — Missing notes file fails fast**

```bash
python release_helper.py 0.0.0 --publish --notes-file nonexistent-file.md
echo "exit code: $LASTEXITCODE"
```

Expected:
- stdout: `Error: --notes-file 'nonexistent-file.md' does not exist.`
- exit code: 1
- `releases/` unchanged (no clean happened)
- No version files modified (check `git status` — should be clean)

- [ ] **Step 2: Scenario 4 — Notes file without --publish is silently ignored**

Create a real notes file and run without `--publish`:

```bash
"# Dummy notes for dry run" | Out-File -Encoding utf8 -FilePath "C:\Users\zhaobo\AppData\Local\Temp\opencode\dummy-notes.md"
# Use --no-build to skip the actual build/zip step (we only care about argparse + check behaviour)
python release_helper.py 0.0.0 --no-build --notes-file "C:\Users\zhaobo\AppData\Local\Temp\opencode\dummy-notes.md"
```

Expected:
- Existence check passes silently
- Script proceeds into version-bump and tries to update package.json to `0.0.0` — **this will mutate files**
- Since `--no-build` is set, no actual build/zip
- No `gh release create` call (no `--publish`)

**Immediately restore the version files:**

```bash
git checkout -- extension/package.json extension/manifest.json host/dh_native_host.py
git status  # confirm clean
```

- [ ] **Step 3: Scenario 5 — Clean step preserves notes markdown**

(This was already exercised in Task 4 Step 3, but re-verify after all changes are in place.)

```bash
"# Real notes" | Out-File -Encoding utf8 -FilePath "releases\notes-v0.0.0-test.md"
"zip" | Out-File -Encoding utf8 -FilePath "releases\old.zip"
python -c "import os, sys; sys.path.insert(0,'.'); import release_helper; release_helper.clean_releases_folder(os.path.join(os.getcwd(),'releases'))"
Get-ChildItem releases\
```

Expected: `notes-v0.0.0-test.md` survives; `old.zip` gone.

Cleanup:

```bash
Remove-Item -Force releases\notes-v0.0.0-test.md -ErrorAction SilentlyContinue
```

- [ ] **Step 4: Verify --help is still readable**

```bash
python release_helper.py --help
```

Expected: usage line shows `[--notes-file NOTES_FILE]` alongside existing flags, no formatting weirdness.

- [ ] **Step 5: (Deferred) Scenarios 1 + 2 happen naturally on next real release**

Document in the next release's pre-flight checklist:

- **Scenario 1** (backward compat, no `--notes-file`): exercised any time someone runs the old command form.
- **Scenario 2** (happy path with `--notes-file`): exercised on the **next real release**. When you next run `python release_helper.py <ver> --publish --prerelease --notes-file releases/notes-v<ver>.md`, confirm the GitHub release body matches the file's content verbatim (visit the release page after publish).

No commit for this task — validation only.

---

## Task 6: Update AGENTS.md release workflow docs

**Files:**
- Modify: `AGENTS.md` (§ 8 Release Workflow, "Automation Script" section)

- [ ] **Step 1: Read the current § 8 to anchor the edit**

```bash
# Use grep / Read tool to find the section heading "## 8. Release Workflow"
```

Locate the existing example commands block. It looks like:

```markdown
* **Stable Release:**

    ```bash
    python release_helper.py 2.0.57 --publish
    ```

* **Beta/Pre-release:**

    ```bash
    python release_helper.py 2.0.58-beta --publish --prerelease
    ```
```

- [ ] **Step 2: Add the new `--notes-file` example**

After the Beta/Pre-release example, insert:

```markdown
* **Release with markdown notes (recommended for major/beta releases):**

    ```bash
    python release_helper.py 2.0.71 --publish --prerelease --notes-file releases/notes-v2.0.71.md
    ```

    The `--notes-file` flag passes the markdown file to `gh release create --notes-file`, so the GitHub release body matches the file's content verbatim. Without this flag the script falls back to a 4-line hardcoded template ("Release vX.X.X / Installation / ..."). Place the notes file under `releases/` — the build step's clean phase now preserves it (only `*.zip` and `DynamicsHelper_v*` staging dirs are deleted).
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document release_helper.py --notes-file usage in AGENTS.md

Adds the recommended invocation form for releases that ship real
markdown release notes (i.e. anything bigger than a tiny bugfix).
Also notes the new clean-step behaviour so future maintainers know
they can safely keep notes-v<version>.md next to the zip.

Spec: docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md"
```

---

## Task 7: Close follow-up #10 in the rolling plan

**Files:**
- Modify: `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` (Follow-up nits section)

- [ ] **Step 1: Locate the follow-up #10 bullet**

```bash
# Use Read or grep to find: "release_helper.py hardcodes release notes"
```

The current bullet looks like (truncated):

```markdown
- **`release_helper.py` hardcodes release notes** (added 2026-05-21, beta.3 follow-up). `publish_to_github()` at `release_helper.py:261` builds the GitHub release body from a 4-line f-string template... Proposal: add `--notes-file PATH` argument...
```

- [ ] **Step 2: Edit the bullet to mark closed**

Use the Edit tool to prepend `**[CLOSED 2026-05-21]** ` to the bullet's start and append a closing line at the end. Resulting bullet:

```markdown
- **[CLOSED 2026-05-21]** **`release_helper.py` hardcodes release notes** (added 2026-05-21, beta.3 follow-up). `publish_to_github()` at `release_helper.py:261` builds the GitHub release body from a 4-line f-string template (`"Release {tag}\n\n## Installation\n..."`). [...full original text preserved...]

  **Resolution:** Implemented per `docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md`. `--notes-file PATH` flag added; `clean_releases_folder()` narrowed to allowlist (`*.zip` + `DynamicsHelper_v*` dirs only). Next release can use a single command: `python release_helper.py <ver> --publish --prerelease --notes-file releases/notes-v<ver>.md`.
```

Use the Edit tool, not Write. The `oldString` should be the unique opening fragment of the bullet (`- **\`release_helper.py\` hardcodes release notes** (added 2026-05-21, beta.3 follow-up).`) and `newString` should prepend `**[CLOSED 2026-05-21]** ` to that fragment. Then a second Edit appends the Resolution paragraph at the bullet's actual end (locate the unique closing fragment like `Cost: ~20 lines. Benefit:...one command end-to-end.`).

- [ ] **Step 3: Verify the edit landed correctly**

```bash
Select-String -Path "docs/superpowers/plans/2026-05-11-beta-channel-toggle.md" -Pattern "CLOSED 2026-05-21"
```

Expected: one match on the follow-up #10 bullet.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-05-11-beta-channel-toggle.md
git commit -m "docs: close follow-up #10 (release_helper.py --notes-file)

Cross-references the implementing spec and the resolved behaviour.
The other 8 open follow-ups remain unchanged."
```

---

## Self-Review

After writing the plan, applied the checklist:

**1. Spec coverage** — every spec section traced to a task:
- Spec § "CLI surface" → Task 1 (argparse) + Task 2 (existence check) + Task 3 (dispatch)
- Spec § "Code changes" 4 touch points → Tasks 1-4 one-to-one
- Spec § "Validation" 5 scenarios → Task 5 (3, 4, 5 actively run; 1, 2 deferred to next release with documented expectation)
- Spec § "Documentation updates" → Task 6 (AGENTS.md) + Task 7 (follow-up list)
- Spec § "Non-goals" → respected throughout; no tasks added for auto-detect / inline `--notes` / rename / retry logic
- Spec § "Rollback" → covered implicitly by per-task commits (each commit is independently revertable)

**2. Placeholder scan** — no "TBD", "TODO", "implement later", "similar to Task N". Every code step shows full code; every command step shows full command with expected output.

**3. Type consistency** —
- `publish_to_github` parameter name `notes_file` consistent across Task 1 (argparse name `--notes-file` → Python attr `notes_file` via argparse hyphen rule), Task 3 (function sig + dispatch), Task 3 Step 3 (call site `args.notes_file`).
- Function name `clean_releases_folder` retained (Task 4) — spec explicitly chose not to rename; no callers to update beyond the existing one.
- Variable names `is_zip` / `is_staging_dir` consistent inside Task 4 code.

No issues found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-release-helper-notes-file-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
