# Spec: `release_helper.py --notes-file` support

**Date**: 2026-05-21
**Status**: Approved — ready for implementation
**Related follow-up**: `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` item #10 (beta.3 release-day papercut)

## Problem

Today `python release_helper.py <version> --publish` cannot publish real release notes. The body of the GitHub release is built from a hardcoded 4-line f-string in `publish_to_github()` (`release_helper.py:261`):

```python
notes = (
    f"Release {tag}\n\n"
    "## Installation\n"
    "1. Download and extract the zip file.\n"
    "2. Double-click `install.bat` ...\n"
    "3. Follow the on-screen instructions."
)
```

For v2.0.70-beta.3 we wrote a 50+ line markdown release notes file but had to bypass the helper entirely:

1. Run `python release_helper.py 2.0.70-beta.3 --prerelease` (no `--publish`) to do the build + zip
2. Push the tag manually
3. Run `gh release create v2.0.70-beta.3 ... --notes-file <path> --prerelease` by hand

Worse, `clean_releases_folder()` (`release_helper.py:287`) wipes everything in `releases/` indiscriminately before each build, so a notes markdown placed there gets deleted. The beta.3 workaround was to keep notes in `%TEMP%\opencode\` outside the repo.

## Goal

A single invocation suffices:

```
python release_helper.py 2.0.71 --publish --prerelease --notes-file releases/notes-v2.0.71.md
```

The markdown file's content becomes the GitHub release body verbatim.

## CLI surface

New argument added to existing parser:

```
--notes-file PATH    Path to a markdown file used as the GitHub release body.
```

Behaviour matrix:

| Condition | Behaviour |
|---|---|
| `--notes-file` omitted | Unchanged — `publish_to_github()` uses the existing 4-line template. |
| `--notes-file PATH`, file exists, `--publish` set | Pass `--notes-file PATH` through to `gh release create`. |
| `--notes-file PATH`, file does **not** exist | Hard fail (`sys.exit(1)`) at startup, before clean / bump / build. |
| `--notes-file PATH`, no `--publish` | Silently ignored. Matches the existing `--prerelease`-without-`--publish` posture. |

## Code changes

Four touch points in `release_helper.py`. Total ~25–30 lines.

### Change 1 — argparse (in `main()`, before `parser.parse_args()`)

```python
parser.add_argument(
    "--notes-file",
    help="Path to a markdown file used as the GitHub release body",
)
```

### Change 2 — Startup-time existence check (in `main()`, immediately after `args = parser.parse_args()`)

```python
if args.notes_file and not os.path.isfile(args.notes_file):
    print(f"Error: --notes-file '{args.notes_file}' does not exist.")
    sys.exit(1)
```

Placement is intentional: must run **before** `clean_releases_folder()` so a typo doesn't wipe build artifacts pointlessly.

### Change 3 — `publish_to_github()` signature and dispatch

```python
def publish_to_github(version, zip_path, prerelease=False, notes_file=None):
    print(f"\n--- Publishing v{version} to GitHub ---")

    try:
        subprocess.run(["gh", "--version"], check=True, stdout=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: 'gh' CLI not found. Please install GitHub CLI to publish releases.")
        return

    tag = f"v{version}"
    title = f"v{version}"

    if notes_file:
        cmd = ["gh", "release", "create", tag, zip_path,
               "--title", title, "--notes-file", notes_file]
    else:
        notes = (
            f"Release {tag}\n\n"
            "## Installation\n"
            "1. Download and extract the zip file.\n"
            "2. Double-click `install.bat` (Safely bypasses PowerShell restrictions).\n"
            "3. Follow the on-screen instructions."
        )
        cmd = ["gh", "release", "create", tag, zip_path,
               "--title", title, "--notes", notes]

    if prerelease:
        cmd.append("--prerelease")

    print(f"Executing: {' '.join(cmd[:5])} ... (prerelease={prerelease}, notes_file={notes_file})")

    try:
        subprocess.run(cmd, check=True)
        print("GitHub Release created successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Failed to create GitHub Release: {e}")
```

### Change 4 — `clean_releases_folder()` narrowed scope

Current implementation deletes every file and subdirectory under `releases/`. Replace with allowlist deletion:

```python
def clean_releases_folder(release_folder):
    """Delete only build artifacts (*.zip and DynamicsHelper_v* staging directories).

    Preserves release-notes markdown and any other user-curated files placed
    in releases/. Callers may safely keep `notes-v<version>.md` next to the
    zip without losing it on the next build.
    """
    if not os.path.exists(release_folder):
        os.makedirs(release_folder)
        return

    print(f"Cleaning build artifacts in {release_folder}...")
    for item in os.listdir(release_folder):
        item_path = os.path.join(release_folder, item)
        is_zip = os.path.isfile(item_path) and item.lower().endswith(".zip")
        is_staging_dir = os.path.isdir(item_path) and item.startswith("DynamicsHelper_v")
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

Function name is left as `clean_releases_folder` to avoid touching the single caller (`main()` line 324). Docstring carries the updated semantics.

### Change 5 — `main()` call site

Single argument added at the existing `publish_to_github(...)` call:

```python
if args.publish and zip_path:
    publish_to_github(args.version, zip_path, args.prerelease, args.notes_file)
```

## Validation

No automated tests (extension has no test infra, helper itself has never had any). Manual matrix to run in dev mode before next release:

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | Backward-compat: old usage | `python release_helper.py 2.x.x` | Identical behaviour to today (4-line template if it ever reached `--publish`; no `--publish` here = build only). |
| 2 | Happy path with notes | `python release_helper.py 2.x.x --publish --prerelease --notes-file releases/notes-v2.x.x.md` | GitHub release body matches the markdown file verbatim. |
| 3 | Missing notes file | `python release_helper.py 2.x.x --publish --notes-file nonexistent.md` | Exit code 1 immediately. `releases/` untouched. No git ops. No build. |
| 4 | Notes file without `--publish` | `python release_helper.py 2.x.x --notes-file foo.md` (foo.md exists) | Build completes, zip produced, no GitHub call, no error. |
| 5 | Clean preserves notes | Place `releases/notes-v2.x.x.md` in advance, then run any build | After clean step, `notes-v2.x.x.md` still present; previous `*.zip` and `DynamicsHelper_v*` staging dirs removed. |

Scenario 2 can be tested cheaply by running against a throwaway tag (e.g. `v0.0.0-test`) and immediately deleting the resulting GitHub release with `gh release delete`.

## Documentation updates

After implementation lands:

1. `AGENTS.md` § 8 "Release Workflow" — add the `--notes-file` invocation to the example commands list, e.g.:
   ```
   * **Stable Release with notes:**
     python release_helper.py 2.0.71 --publish --notes-file releases/notes-v2.0.71.md
   ```
2. `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` — mark follow-up #10 as closed, cross-reference this spec.

## Non-goals (YAGNI)

- **Auto-detect `releases/notes-v<version>.md`** — explicitly considered and rejected during brainstorming. User preference: explicit `--notes-file` path > convention-based magic.
- **`--notes` inline string flag** — `gh release create` already supports `--notes "..."` directly; nobody writes multi-line markdown on the command line.
- **Rename `clean_releases_folder` → `clean_build_artifacts`** — semantically more accurate but only one caller; rename cost > clarity gain.
- **Retry logic for `gh` CLI failures** — single-shot script; failed publish is rerun manually with the same command.
- **Version-stamp validation against the markdown content** — e.g. checking that the file mentions `v<version>` somewhere. Out of scope; trust the operator.

## Rollback

If the change breaks the release flow, revert the commit. The four touch points are local to `release_helper.py`; no cross-file coupling. No data migration. No persistent state.

## Estimated effort

- Implementation: 25–30 LoC across 4 functions
- Manual validation: ~15 min (run scenarios 3, 4, 5 in dev mode; scenarios 1 and 2 are exercised naturally on next real release)
- Doc updates: 5 min
- Total: under an hour
