# Beta Channel Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single opt-in checkbox in extension Options ("Receive beta updates") that lets users receive pre-release versions, with a correct semver parser so prerelease tags like `2.0.70-beta` no longer crash the updater.

**Architecture:** New host-side helpers `_parse_version()` / `_version_gt()` replace the crashy int-split version compare. `check_for_updates()` reads the existing `extension_preferences.beta_channel_enabled` setting from `config.json` and switches between `/releases/latest` (today's stable-only behaviour) and `/releases?per_page=10` (all releases including prereleases). The Options.tsx UI mirrors the existing `enableStatusBubble` pattern: state field on `Preferences`, default `false` in `DEFAULT_PREFS`, host-sync mapping at the existing `get_config` response handler, push via the existing `update_config` payload. No new IPC actions needed.

**Tech Stack:** Python 3.13 (host), TypeScript/React 19 (extension), unittest, Chrome Native Messaging, `chrome.storage.local`.

**Spec:** `docs/superpowers/specs/2026-05-11-beta-channel-toggle-design.md`

**Repo conventions to keep:**
- Host edits use the venv: `& "host/venv/Scripts/python.exe" -m unittest ...`
- Extension build: `cd extension; npm run build` (output in `extension/dist/`)
- After every commit, working tree must be clean and tests green on 0.3.0 venv
- One commit per task

---

## File Structure

| File | Responsibility |
|---|---|
| `host/dh_native_host.py` | Add `_parse_version()`, `_version_gt()` helpers (module-level, near other top-level helpers). Modify `check_for_updates()` to read `extension_preferences.beta_channel_enabled` from `config.json` at call time and switch endpoint. Drop the old int-split compare in favour of `_version_gt()`. |
| `host/test_version_parse.py` (new) | Unit tests for `_parse_version()` and `_version_gt()`, every case in spec § 3.5. |
| `extension/src/components/Options.tsx` | Add `betaChannelEnabled?: boolean` to `Preferences`. Set default `false` in `DEFAULT_PREFS`. Mirror in/out at the existing host-sync mapper and the existing `update_config` push. Add one checkbox row in the "General" tab using the `enableStatusBubble` row as the visual template. Wire a `trackEvent` call on change. |
| `extension/src/utils/translations.ts` | Add `betaChannelLabel`, `betaChannelHint` keys for `en` and `zh`. |
| `AGENTS.md` | One-line note that "beta channel" is a normal user preference, no special edit-protection needed. |
| `USER_GUIDE.md` | Document the new toggle. |

Out of scope per spec § 2: rollback semantics, multiple channels, "you are on beta" badge.

---

## Tasks

### Task 1: Add version parser tests (RED)

**Why first:** TDD. Lock the spec § 3.5 contract in tests before writing the helper. These tests will fail because the helpers don't exist yet, which is exactly what we want to verify before moving on.

**Files:**
- Create: `host/test_version_parse.py`

- [ ] **Step 1: Create the test file with every case from spec § 3.5**

`host/test_version_parse.py`:

```python
"""Tests for the semver-style version parser used by the updater.

Spec: docs/superpowers/specs/2026-05-11-beta-channel-toggle-design.md § 3.5
Implementation: _parse_version() and _version_gt() in dh_native_host.py.
"""

import unittest

from dh_native_host import _parse_version, _version_gt


class TestParseVersion(unittest.TestCase):
    def test_plain_stable(self):
        self.assertEqual(_parse_version("2.0.70"), ((2, 0, 70), ()))

    def test_leading_v_is_stripped(self):
        self.assertEqual(_parse_version("v2.0.70"), ((2, 0, 70), ()))

    def test_simple_prerelease(self):
        self.assertEqual(_parse_version("2.0.70-beta"), ((2, 0, 70), ("beta",)))

    def test_multi_part_prerelease(self):
        self.assertEqual(
            _parse_version("2.0.70-beta.2"), ((2, 0, 70), ("beta", "2"))
        )

    def test_unparseable_returns_none(self):
        self.assertIsNone(_parse_version("not-a-version"))
        self.assertIsNone(_parse_version(""))
        self.assertIsNone(_parse_version("1.2"))  # missing patch
        self.assertIsNone(_parse_version("1.2.3.4"))  # too many parts


class TestVersionGt(unittest.TestCase):
    def test_patch_bump_is_greater(self):
        self.assertTrue(_version_gt("2.0.71", "2.0.70"))

    def test_equal_is_not_greater(self):
        self.assertFalse(_version_gt("2.0.70", "2.0.70"))

    def test_stable_is_greater_than_prerelease_same_triple(self):
        # semver 11.3: a pre-release version has lower precedence than the
        # associated normal version.
        self.assertTrue(_version_gt("2.0.70", "2.0.70-beta"))

    def test_prerelease_is_not_greater_than_stable_same_triple(self):
        self.assertFalse(_version_gt("2.0.70-beta", "2.0.70"))

    def test_higher_patch_prerelease_greater_than_lower_stable(self):
        # 2.0.71-beta is still 2.0.71 territory, which is > 2.0.70.
        self.assertTrue(_version_gt("2.0.71-beta", "2.0.70"))

    def test_prerelease_ordering_numeric(self):
        # semver 11.4.4: when all preceding identifiers are equal,
        # a larger set of pre-release fields has higher precedence.
        self.assertTrue(_version_gt("2.0.70-beta.2", "2.0.70-beta.1"))

    def test_prerelease_shorter_is_lower(self):
        # 2.0.70-beta < 2.0.70-beta.1 because the longer set wins when
        # the shared prefix is equal.
        self.assertFalse(_version_gt("2.0.70-beta", "2.0.70-beta.1"))
        self.assertTrue(_version_gt("2.0.70-beta.1", "2.0.70-beta"))

    def test_unparseable_remote_returns_false(self):
        # Defensive: an unparseable remote tag must not trigger an update.
        self.assertFalse(_version_gt("garbage", "2.0.70"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
& "host/venv/Scripts/python.exe" -m unittest host/test_version_parse.py -v
```

Expected: `ImportError: cannot import name '_parse_version' from 'dh_native_host'` (or `cannot import name '_version_gt'`). This is the desired RED state.

- [ ] **Step 3: Commit the failing tests**

```powershell
git add host/test_version_parse.py
git commit -m "test(host): add semver parser tests (RED, helpers not implemented yet)"
```

---

### Task 2: Implement `_parse_version()` and `_version_gt()` (GREEN)

**Files:**
- Modify: `host/dh_native_host.py` — add helpers in the module-level helpers area (anywhere between the existing `_apply_log_level()` at line 184 and the `class NativeHost:` definition is fine; put them at the end of the helpers block).

- [ ] **Step 1: Find a good insertion point**

Open `host/dh_native_host.py`. Locate the `_apply_log_level()` function (around line 184). Find the blank line immediately before the `class NativeHost:` definition. The helpers go just above that.

- [ ] **Step 2: Add the implementation**

Add this block. Take care: the regex anchors the leading `v` as optional and refuses a 4-part numeric:

```python
import re

# Matches "2.0.70" or "v2.0.70" optionally followed by "-<prerelease>".
# Prerelease is dot-separated identifiers per semver.org § 9.
_VERSION_RE = re.compile(
    r"^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.\-]+))?$"
)


def _parse_version(tag: str) -> tuple[tuple[int, int, int], tuple[str, ...]] | None:
    """Parse a semver-ish tag like "2.0.70", "v2.0.70", or "2.0.70-beta.2".

    Returns ((major, minor, patch), prerelease_parts) or None when the
    tag is not recognisable as a semver. See spec § 3.4.
    """
    if not isinstance(tag, str):
        return None
    m = _VERSION_RE.match(tag.strip())
    if not m:
        return None
    major, minor, patch, pre = m.groups()
    triple = (int(major), int(minor), int(patch))
    parts = tuple(pre.split(".")) if pre else ()
    return triple, parts


def _compare_prerelease(a: tuple[str, ...], b: tuple[str, ...]) -> int:
    """Compare two prerelease tuples per semver.org § 11.4.

    Returns negative, zero, or positive (like cmp): a < b, ==, or a > b.
    Empty tuple means "no prerelease" (i.e. a stable release) and per
    semver § 11.3 it ranks HIGHER than any non-empty prerelease.
    """
    if a == b:
        return 0
    # Stable beats prerelease at the same numeric triple.
    if not a:
        return 1
    if not b:
        return -1
    # Both have identifiers; compare element-wise.
    for ai, bi in zip(a, b):
        a_is_num = ai.isdigit()
        b_is_num = bi.isdigit()
        if a_is_num and b_is_num:
            ai_n, bi_n = int(ai), int(bi)
            if ai_n != bi_n:
                return -1 if ai_n < bi_n else 1
        elif a_is_num and not b_is_num:
            # numeric < alphanumeric per § 11.4.3
            return -1
        elif not a_is_num and b_is_num:
            return 1
        else:
            if ai != bi:
                return -1 if ai < bi else 1
    # All shared identifiers are equal; the longer one wins (§ 11.4.4).
    if len(a) == len(b):
        return 0
    return -1 if len(a) < len(b) else 1


def _version_gt(remote_tag: str, local_tag: str) -> bool:
    """True iff remote is strictly semver-greater than local.

    Returns False (defensively) if either tag is unparseable, so an
    unrecognised remote release never triggers an update prompt.
    See spec § 3.4.
    """
    remote = _parse_version(remote_tag)
    local = _parse_version(local_tag)
    if remote is None or local is None:
        return False
    r_triple, r_pre = remote
    l_triple, l_pre = local
    if r_triple != l_triple:
        return r_triple > l_triple
    return _compare_prerelease(r_pre, l_pre) > 0
```

Also: confirm `import re` is present at module top. It should already be there; if not, add it (the existing file uses regex elsewhere — quick `git grep "^import re" host/dh_native_host.py` will confirm).

- [ ] **Step 3: Run tests to verify they pass**

```powershell
& "host/venv/Scripts/python.exe" -m unittest host/test_version_parse.py -v
```

Expected: every test in `TestParseVersion` and `TestVersionGt` PASS (13 tests total).

- [ ] **Step 4: Run the full host test suite to check for regressions**

```powershell
& "host/venv/Scripts/python.exe" -m unittest discover host
```

Expected: 50 tests OK (37 existing + 13 new). If anything went red, stop and fix before commit.

- [ ] **Step 5: Commit**

```powershell
git add host/dh_native_host.py
git commit -m "feat(host): add semver-style version parser for updater

Implements _parse_version() and _version_gt() with full semver
ordering (stable > prerelease at same triple; longer prerelease >
shorter prerelease per semver.org 11.4.4). Defensive: unparseable
tags compare as 'not greater' so a malformed remote release never
prompts an update.

Will replace the int-split compare in check_for_updates() in the
next commit. Spec: docs/superpowers/specs/2026-05-11-beta-channel-
toggle-design.md."
```

---

### Task 3: Switch `check_for_updates()` to use the new helpers and the channel setting

**Files:**
- Modify: `host/dh_native_host.py:406-475` — the entire body of `check_for_updates()`.

- [ ] **Step 1: Read the current implementation**

The function as it stands is roughly:

```python
async def check_for_updates(self, force=False):
    try:
        now = time.time()
        if not force and (now - self.last_update_check) < 3600:
            return
        self.last_update_check = now
        url = "https://api.github.com/repos/boatmac/Dynamics-Helper/releases/latest"

        def fetch():
            ...  # urllib GET, returns the JSON dict or None

        data = await self.loop.run_in_executor(None, fetch)
        if not data:
            ...
            return

        tag_name = data.get("tag_name", "").lstrip("v")
        try:
            remote_ver = [int(x) for x in tag_name.split(".")]
            local_ver = [int(x) for x in VERSION.split(".")]
            if remote_ver > local_ver:
                ...  # find zip asset, send update_available
        except ValueError:
            ...
```

- [ ] **Step 2: Replace the body with the channel-aware version**

Replace the function body so it:
1. Reads `extension_preferences.beta_channel_enabled` from `config.json` at call time (no caching — the user may have just toggled).
2. Branches on the setting to pick the endpoint.
3. Uses `_version_gt()` from Task 2 in place of the int-split compare.
4. Handles the two response shapes: `/releases/latest` returns a JSON object; `/releases` returns a JSON array.

New body (replace lines 406-475 — line numbers approximate; the existing function's bounds are from `async def check_for_updates` through the function's closing logic; replace everything inside the function but keep the `async def check_for_updates(self, force=False):` signature):

```python
    def _read_beta_channel_pref(self) -> bool:
        """Best-effort read of the beta-channel preference from config.json.

        Returns False when config is missing, unreadable, or the key is
        absent — i.e. the safe default (stable channel only).
        """
        try:
            cfg_path = os.path.join(USER_DATA_DIR, "config.json")
            if not os.path.exists(cfg_path):
                return False
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = json.loads(f.read())
            ext = data.get("extension_preferences", {})
            return bool(ext.get("beta_channel_enabled", False))
        except Exception as e:
            logging.warning(f"Could not read beta_channel_enabled: {e}")
            return False

    async def check_for_updates(self, force=False):
        """Checks for updates from GitHub Releases.

        When the user has opted in to beta updates (config.json
        extension_preferences.beta_channel_enabled == True) we query
        /releases?per_page=10 which includes prereleases, and pick the
        highest semver-greater tag. Otherwise we use /releases/latest
        which GitHub server-side filters to stable only.
        """
        try:
            now = time.time()
            if not force and (now - self.last_update_check) < 3600:
                return
            self.last_update_check = now

            beta_enabled = self._read_beta_channel_pref()
            if beta_enabled:
                url = (
                    "https://api.github.com/repos/boatmac/Dynamics-Helper/"
                    "releases?per_page=10"
                )
            else:
                url = (
                    "https://api.github.com/repos/boatmac/Dynamics-Helper/"
                    "releases/latest"
                )
            logging.info(
                f"Checking for updates (beta_channel_enabled={beta_enabled})"
            )

            def fetch():
                try:
                    req = urllib.request.Request(
                        url, headers={"User-Agent": "DynamicsHelper-NativeHost"}
                    )
                    with urllib.request.urlopen(req, timeout=30) as response:
                        if response.status == 200:
                            return json.loads(response.read().decode())
                except Exception as e:
                    logging.warning(f"Update check network error: {e}")
                return None

            if not self.loop:
                return

            data = await self.loop.run_in_executor(None, fetch)
            if not data:
                if force:
                    self.send_message(
                        {
                            "action": "update_error",
                            "payload": {"error": "Failed to fetch update data."},
                        }
                    )
                return

            # Normalise to a list of release dicts.
            if isinstance(data, list):
                candidates = data
            else:
                candidates = [data]

            # Pick the highest semver-greater release.
            best_release = None
            best_tag = None
            for release in candidates:
                tag = release.get("tag_name", "")
                if not tag:
                    continue
                if not _version_gt(tag, VERSION):
                    continue
                if best_tag is None or _version_gt(tag, best_tag):
                    best_tag = tag
                    best_release = release

            if best_release is None:
                logging.info(
                    f"No update available (Local: {VERSION}, "
                    f"checked {len(candidates)} release(s))"
                )
                if force:
                    self.send_message(
                        {
                            "action": "update_not_available",
                            "payload": {"version": VERSION},
                        }
                    )
                return

            logging.info(f"Update available: {best_tag}")

            # Find the .zip asset URL on the chosen release.
            assets = best_release.get("assets", [])
            zip_url = None
            for asset in assets:
                if asset.get("name", "").endswith(".zip"):
                    zip_url = asset.get("browser_download_url")
                    break

            final_url = zip_url if zip_url else best_release.get(
                "html_url",
                "https://github.com/boatmac/Dynamics-Helper/releases",
            )

            self.send_message(
                {
                    "action": "update_available",
                    "payload": {
                        "version": best_tag,
                        "url": final_url,
                        "is_prerelease": bool(best_release.get("prerelease", False)),
                    },
                }
            )

        except Exception as e:
            logging.error(f"check_for_updates failed: {e}\n{traceback.format_exc()}")
            if force:
                self.send_message(
                    {
                        "action": "update_error",
                        "payload": {"error": str(e)},
                    }
                )
```

Notes for the engineer:
- `USER_DATA_DIR`, `VERSION`, `urllib.request`, `json`, `os`, `time`, `traceback`, `logging` are all already imported at the top of the file. Verify with `git grep "^import\|^from" host/dh_native_host.py | head -30` if unsure.
- `_read_beta_channel_pref` is added as a **method on NativeHost** (note the `self`), placed immediately above `check_for_updates`. Indentation must match the surrounding methods.
- The new `is_prerelease` flag in the message payload is informational — extension does not need to act on it today, but the spec mentions a possible future "you are on beta" indicator (§ 7), and surfacing it now is one line.

- [ ] **Step 3: Smoke-test the host still starts cleanly**

```powershell
Remove-Item -Recurse -Force build, dist/dh_native_host -ErrorAction SilentlyContinue
& "host/venv/Scripts/pyinstaller.exe" --onedir --clean -y --name dh_native_host host/dh_native_host.py 2>&1 | Select-Object -Last 3
$tmp = "$env:TEMP\plan_task3_$(Get-Random)"
Copy-Item -Recurse "dist/dh_native_host" $tmp
$em = "$env:TEMP\dh_startup.log"; if (Test-Path $em) { Set-Content $em "" }
$nh = "$env:LOCALAPPDATA\DynamicsHelper\native_host.log"; if (Test-Path $nh) { Set-Content $nh "" }
$j = Start-Job -ScriptBlock { param($e) & $e 2>&1 } -ArgumentList "$tmp/dh_native_host.exe"
Start-Sleep 20
Stop-Job $j -EA SilentlyContinue; Remove-Job $j -Force -EA SilentlyContinue
Get-Content $nh | Select-Object -Last 10
Remove-Item -Recurse -Force $tmp -EA SilentlyContinue
```

Expected: log should show `Successfully imported copilot SDK.` ... `Copilot Session created successfully.` Should NOT show any AttributeError or NameError. The clean-tmp smoke is the gold standard from phase 3.

- [ ] **Step 4: Re-run all host tests**

```powershell
& "host/venv/Scripts/python.exe" -m unittest discover host
```

Expected: 50 tests OK.

- [ ] **Step 5: Commit**

```powershell
git add host/dh_native_host.py
git commit -m "feat(host): update check honours beta_channel_enabled preference

When extension_preferences.beta_channel_enabled is true, fetch
/releases?per_page=10 (includes prereleases) and pick the highest
semver-greater tag. When false, keep today's behaviour (/releases/
latest, server-side filters out prereleases). Drops the brittle
int-split compare in favour of _version_gt() so prerelease tags
like 2.0.70-beta no longer crash the updater with ValueError.

Adds 'is_prerelease' to the update_available payload (informational,
no UI action required today). Spec § 3.3 / § 3.4."
```

---

### Task 4: Add `betaChannelEnabled` to extension `Preferences`

**Files:**
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Add field to the `Preferences` interface (around line 51)**

Find the interface definition that starts at `interface Preferences {` (line 51). Find the existing `enableStatusBubble?: boolean;` line (around line 63). Add a sibling line immediately after it:

```typescript
    enableStatusBubble?: boolean;
    betaChannelEnabled?: boolean;
    logLevel?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
```

(Only the middle line is new. The two surrounding lines exist for orientation — do not duplicate them.)

- [ ] **Step 2: Add default to `DEFAULT_PREFS` (around line 70)**

Find the `DEFAULT_PREFS` const (line 70). Find the existing `enableStatusBubble: true,` line (around line 82). Add a sibling immediately after it:

```typescript
    enableStatusBubble: true,
    betaChannelEnabled: false,
    logLevel: 'INFO',
```

(Only the middle line is new.)

- [ ] **Step 3: Map host -> extension on `get_config` response (around line 625)**

Find the existing line that maps `enable_status_bubble`:

```typescript
if (extPrefs.enable_status_bubble !== undefined) newPrefs.enableStatusBubble = extPrefs.enable_status_bubble;
```

Add a sibling line immediately after it:

```typescript
if (extPrefs.enable_status_bubble !== undefined) newPrefs.enableStatusBubble = extPrefs.enable_status_bubble;
if (extPrefs.beta_channel_enabled !== undefined) newPrefs.betaChannelEnabled = extPrefs.beta_channel_enabled;
```

- [ ] **Step 4: Push extension -> host in the `update_config` payload (around line 710)**

Find the existing block inside the `update_config` action's `extension_preferences` dict. It looks like:

```typescript
extension_preferences: {
    auto_analyze_mode: prefs.autoAnalyzeMode,
    user_prompt: prefs.userPrompt,
    enable_status_bubble: prefs.enableStatusBubble,
    useWorkspaceOnly: prefs.useWorkspaceOnly,
    log_level: prefs.logLevel,
    ...
```

Add a new line immediately after `enable_status_bubble`:

```typescript
    enable_status_bubble: prefs.enableStatusBubble,
    beta_channel_enabled: prefs.betaChannelEnabled,
    useWorkspaceOnly: prefs.useWorkspaceOnly,
```

- [ ] **Step 5: Sanity-check by building the extension**

```powershell
cd extension; npm run build
```

Expected: build succeeds with no TypeScript errors. Look for any "Property 'betaChannelEnabled' does not exist on type 'Preferences'" — if it appears, recheck Step 1.

Return to repo root: `cd ..`

- [ ] **Step 6: Commit**

```powershell
git add extension/src/components/Options.tsx
git commit -m "feat(extension): add betaChannelEnabled to Preferences plumbing

State field + default false + host sync (get_config maps
beta_channel_enabled -> betaChannelEnabled; update_config pushes
the inverse). UI checkbox follows in the next commit."
```

---

### Task 5: Add the checkbox UI and translations

**Files:**
- Modify: `extension/src/utils/translations.ts`
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Add translation keys**

Open `extension/src/utils/translations.ts`. The file uses a `{[key]: {en, zh}}` shape — each translation is a single entry with both languages as siblings. Find the existing `statusBubble` entry as the visual template:

```typescript
statusBubble: { en: "Enable Status Bubble", zh: "启用状态气泡" },
```

Add two new entries somewhere in the same logical block (the "Options Page" section is fine, near `statusBubble`):

```typescript
betaChannelLabel: { en: "Receive beta updates", zh: "接收 Beta 更新" },
betaChannelHint: {
    en: "Beta versions include new features and fixes before they ship to stable. They may also be less tested. Toggling off does not downgrade you from a beta you are already on.",
    zh: "Beta 版本会先于 Stable 版本提供新功能和修复，但测试可能不充分。关闭此项不会将你从已安装的 Beta 版本降级。",
},
```

The file is UTF-8 (no BOM). When editing on Windows, ensure your editor preserves UTF-8 — do NOT save as UTF-16 or Windows-1252. After saving, verify with:

```powershell
$line = (Get-Content extension/src/utils/translations.ts -Encoding UTF8 | Select-String "betaChannelLabel").Line
"$line"
([regex]::Matches($line, "[\u4e00-\u9fff]")).Count  # expect ≥ 4 Chinese chars (接收 Beta 更新)
```

- [ ] **Step 2: Find the existing `enableStatusBubble` checkbox row in Options.tsx**

Search for the line `id="enableStatusBubble"` (around line 1318). The row is a small JSX block — typically a wrapper `<div>` containing an `<input type="checkbox">` plus a `<label>`. Read the surrounding lines so you can identify the row's opening and closing JSX tags.

- [ ] **Step 3: Add a new checkbox row immediately after the `enableStatusBubble` row**

Use the existing row as the visual template. Replace the variable names from `enableStatusBubble` to `betaChannelEnabled` and from `t('statusBubble')` to `t('betaChannelLabel')`. Add a small hint paragraph below the label using `t('betaChannelHint')`. Example (adjust class names to whatever the surrounding row uses):

```tsx
<div className="flex items-start gap-2 mt-3">
    <input
        type="checkbox"
        id="betaChannelEnabled"
        checked={prefs.betaChannelEnabled === true}
        onChange={(e) => {
            const enabled = e.target.checked;
            setPrefs(prev => ({ ...prev, betaChannelEnabled: enabled }));
            try {
                trackEvent('Beta Channel Toggled', { enabled });
            } catch { /* telemetry never blocks UX */ }
        }}
        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 mt-0.5"
    />
    <div className="flex flex-col">
        <label
            htmlFor="betaChannelEnabled"
            className="text-xs font-semibold text-slate-700 select-none cursor-pointer"
        >
            {t('betaChannelLabel')}
        </label>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {t('betaChannelHint')}
        </p>
    </div>
</div>
```

The default `checked={prefs.betaChannelEnabled === true}` instead of `!== false` matches the spec default of `false` (opt-in).

- [ ] **Step 4: Confirm `trackEvent` is in scope**

If the file already imports `trackEvent` (search for `import.*trackEvent`), nothing to do. If not, add `import { trackEvent } from '../utils/telemetry';` near the other imports at the top of the file. The `try/catch` around the call is intentional — telemetry must never block the user toggling a setting.

- [ ] **Step 5: Build and reload**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build, no TypeScript or lint errors.

Open Chrome → `chrome://extensions` → reload the extension (it points at `extension/dist/`). Open the Options page. Confirm the new row appears under the existing General-tab toggles, the checkbox defaults to OFF, and the label/hint render in both languages (toggle language in Options if available).

- [ ] **Step 6: Commit**

```powershell
git add extension/src/utils/translations.ts extension/src/components/Options.tsx
git commit -m "feat(extension): add 'Receive beta updates' checkbox in Options

UI mirrors the existing enableStatusBubble row pattern. Defaults
to OFF (opt-in). Toggling fires a Beta Channel Toggled telemetry
event. Strings via translations.ts (en + zh).

End-to-end behaviour: toggle on -> update_config push -> host
config.json gains extension_preferences.beta_channel_enabled=true
-> next check_for_updates() call uses /releases (includes
prereleases)."
```

---

### Task 6: End-to-end manual verification

**Why this task exists:** mocking the GitHub API in unittest is heavier than the value (spec § 3.5). We instead exercise the real surface once.

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm baseline behaviour (toggle off)**

With the rebuilt extension loaded:
1. Make sure the new toggle is OFF.
2. Open the FAB / wherever "Check for updates" lives. Trigger an update check (or wait for the hourly auto-check).
3. Tail the host log:
   ```powershell
   Get-Content "$env:LOCALAPPDATA\DynamicsHelper\native_host.log" -Tail 20 -Wait
   ```
   Expect to see `Checking for updates (beta_channel_enabled=False)` followed by `No update available (Local: ..., checked 1 release(s))` (assuming no newer stable shipped while you were working).

- [ ] **Step 2: Confirm beta channel behaviour (toggle on)**

1. Toggle the new checkbox ON in Options.
2. Confirm the host log shows `Updated config.json` and that `config.json` at `%LOCALAPPDATA%\DynamicsHelper\config.json` now contains `"beta_channel_enabled": true` inside `extension_preferences`.
3. Trigger an update check.
4. Expect `Checking for updates (beta_channel_enabled=True)` in the log. The HTTP call now hits `/releases?per_page=10`.
5. If there is no live beta release on the repo: `No update available ...` is the correct outcome. The branch logic itself is exercised; the discovery of a real beta will be exercised once `2.0.72-beta` ships (spec § 6).

- [ ] **Step 3: Confirm toggle persists across host restart**

1. Toggle ON, close Chrome (or kill the host process via Task Manager — anything that terminates the native messaging session).
2. Reopen Chrome / re-open Options.
3. The checkbox should still read ON. The host's config.json is the source of truth, the extension reads it back via `get_config` on Options mount (Options.tsx line ~555).

- [ ] **Step 4: Sanity-check the parser is wired**

In a Python REPL inside the venv, simulate a prerelease tag end-to-end:

```powershell
& "host/venv/Scripts/python.exe" -c @'
import sys; sys.path.insert(0, "host")
from dh_native_host import _version_gt
print("2.0.70-beta > 2.0.70 ?", _version_gt("2.0.70-beta", "2.0.70"))   # False
print("2.0.71-beta > 2.0.70 ?", _version_gt("2.0.71-beta", "2.0.70"))   # True
'@
```

Expected: prints `False` then `True`. This confirms the function the updater calls behaves as the spec demands.

- [ ] **Step 5: No commit needed (verification only)**

---

### Task 7: Docs touch-up

**Files:**
- Modify: `AGENTS.md`
- Modify: `USER_GUIDE.md`

- [ ] **Step 1: Add USER_GUIDE.md entry**

Open `USER_GUIDE.md`. Find the section that documents the Options page (search for `Options` in the file). Add a small paragraph describing the new toggle. Suggested phrasing:

```markdown
### Receive beta updates

Toggle ON to receive pre-release versions of Dynamics Helper as soon as they
are published. Pre-releases may contain new features and fixes before they
reach the stable channel — they may also be less thoroughly tested.

Toggling OFF will not roll you back from a pre-release you have already
installed; you will simply return to the stable channel for future updates.
```

If the file doesn't have a clearly delimited "Options" section, place the paragraph alongside any other Options-related documentation you find. Don't invent a brand-new top-level section if the existing structure isn't there.

- [ ] **Step 2: Add AGENTS.md one-liner**

Open `AGENTS.md`. Find § 3 "Frontend (TypeScript / React)" → "User Edit Protection (Critical Pattern)". Add a small note at the END of that section indicating beta-channel preference is a normal field (no special edit-protection needed). Suggested:

```markdown
* **Beta channel preference** (`prefs.betaChannelEnabled`): plain
  preference, no `isUserEdited` guard needed — there is no background
  refresh path that overwrites it.
```

- [ ] **Step 3: Commit**

```powershell
git add USER_GUIDE.md AGENTS.md
git commit -m "docs: document beta channel toggle for users and agents

USER_GUIDE.md gets a short Options paragraph explaining the toggle.
AGENTS.md gets a one-line note that the new preference is plain
(no user-edit-protection ref needed). Spec § 4."
```

---

### Task 8: Final cross-check

**Files:** none modified — checklist only.

- [ ] **Step 1: Run all host tests one last time**

```powershell
& "host/venv/Scripts/python.exe" -m unittest discover host
```

Expected: 50 tests OK (37 baseline + 13 from Task 1).

- [ ] **Step 2: Confirm extension builds cleanly**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build, no warnings about unused imports of `trackEvent` or unused `betaChannelEnabled`.

- [ ] **Step 3: Confirm working tree is clean and review the commit list**

```powershell
git status
git log --oneline -10
```

Expected: nothing to commit, the seven new commits from this plan visible on top of `c5f4212` (or whatever the parent commit is at start of execution).

- [ ] **Step 4: Sanity-check no stray edits**

```powershell
git diff origin/master..HEAD --stat
```

Expected: only the files listed in the "File Structure" table at the top of this plan should appear.

---

## Self-Review

(Reviewer applied per writing-plans skill.)

**Spec coverage:**
- Spec § 1 (problem: `/releases/latest` filters prereleases): Task 3 step 2 swaps endpoint.
- Spec § 2 goals 1-5: Task 4-5 (UI), Task 3 (endpoint switch + parser), Task 2 (semver order), Task 5 step 3 (default off; no regression for stable users — `_read_beta_channel_pref` returns False on missing key).
- Spec § 3.1 data model: Task 4 step 1 (Preferences field), Task 4 step 4 (host push), Task 3 step 2 (host read).
- Spec § 3.2 UI: Task 5.
- Spec § 3.3 endpoint switch: Task 3 step 2.
- Spec § 3.4 parser & comparator: Task 2.
- Spec § 3.5 tests: Task 1 (every case in the spec table is a named test method).
- Spec § 4 change manifest: every file in the manifest has a task.
- Spec § 5 migration: Task 3 step 2 `_read_beta_channel_pref` defaults to False on missing key; Task 4 step 2 default in DEFAULT_PREFS is `false`.
- Spec § 6 rollout: out of scope for plan (tracked in spec).
- Spec § 7 open questions: out of scope per spec.

**Placeholder scan:** none.

**Type consistency:**
- `_parse_version` returns `tuple[tuple[int, int, int], tuple[str, ...]] | None` in both Task 1 (test imports) and Task 2 (implementation).
- `_version_gt(remote_tag, local_tag)` signature is identical in Task 1, Task 2, Task 3, Task 6 step 4.
- Field name `betaChannelEnabled` (camel) used everywhere in TypeScript; `beta_channel_enabled` (snake) everywhere in Python and the wire payload. Mapping happens exactly once on each direction (Task 4 step 3 host→ext, Task 4 step 4 ext→host).
- Telemetry event name: `Beta Channel Toggled` (consistent in Task 5 step 3).

---

## Notes for the executor

- The pre-existing host smoke-test pattern (`Copy-Item dist/dh_native_host` to `%TEMP%`, wait 12s, tail `native_host.log`) is the canonical way to confirm a host change boots. Don't shortcut it.
- The spec is final — if you find a spec ambiguity while executing, stop and surface it to the user; don't reinterpret on the fly.
- Each task is one commit. Don't squash, don't re-order. The `is_prerelease` payload addition in Task 3 step 2 is a deliberate extra: it costs one line, opens a future "you are on beta" badge feature (spec § 7) without scope creep today.

## Follow-up nits (not blocking this plan)

- Code reviewer for Task 2 noted that `_compare_prerelease` is only tested transitively via `_version_gt`. The numeric-vs-alphanumeric § 11.4.3 branch is therefore not explicitly covered (Task 1 tests cover numeric-vs-numeric and the length tiebreak through `_version_gt` but not a mixed pair like `("1",)` vs `("alpha",)`). If we ever add `rc` or `alpha` to the release pipeline, add one direct unit test for `_compare_prerelease`. Cheap, not urgent.
- Code reviewer for Task 3 noted that `_read_beta_channel_pref` was deliberately split out as a pure I/O helper to be unit-testable, but no unit test exists for it. A 3-line test fixture (tmp `USER_DATA_DIR`, write a `config.json`, assert True/False/missing-key/malformed-JSON behaviour) would lock the safe-default contract cheaply. Not urgent; the function's behaviour is exercised end-to-end via the smoke test and the manual verification in Task 6.
- ~~release_helper.py `--prerelease` swallow bug~~ FIXED in commit `4761f33`: argv-list form instead of `shell=True` string concat.
- ~~release_helper.py Chrome manifest version field rejects `2.0.70-beta`~~ FIXED in commit `4761f33`: new `update_chrome_manifest_version()` splits into numeric `version` + display `version_name`.
- **SDK ping-timestamp shim (host/dh_native_host.py:244-287, added in `b4bb6ab`)** — monkey-patches `copilot.client.PingResponse.from_dict` to tolerate ISO 8601 strings from CLI 1.0.46+. Delete the shim once `github-copilot-sdk` releases a version whose `PingResponse.from_dict` natively accepts ISO timestamps. Verify by running the host without the shim against the then-current CLI; if `client.start()` succeeds, the shim is redundant.
- **PageReader has no automated test** (extension has no unit test infra at all). The session-name reuse bug (caseNumber pollution by D365 task-ID + SKU concatenation) shipped through the test pyramid undetected. Setting up vitest / jest for extension/src and writing a regression test for `pageReader.idRegex` + `extractValueFromNeighbors` with the polluted-text fixture would catch the next variant. Tracked but not blocking; the host-side `_extract_case_id` strict regex catches the worst case (returns None instead of silent collision).
- **SAS token redaction in config.json** (added 2026-05-21 per `docs/superpowers/specs/2026-05-21-team-prefs-config-mirror-design.md` consequence #1). `teamManifestUrl` typically contains an Azure Blob SAS token (`?sp=r&se=...&sig=...`) that is now mirrored to `%LOCALAPPDATA%\DynamicsHelper\config.json` in plaintext. Same posture as `chrome.storage.local`, but the attack surface widens slightly because external scanners may inspect `%LOCALAPPDATA%`. Options to consider: (a) DPAPI-encrypt the URL field on host write, decrypt on read; (b) store the URL in Windows Credential Manager and keep only an opaque handle in config.json; (c) split the URL into base + opaque token reference. None urgent for current single-user scope.
- **`userInstructions` markdown vs. config.json** (added 2026-05-21). The Extension's "User Instructions" textarea is persisted as `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (markdown file), not inside `config.json` `extension_preferences`. Reconsider whether merging it into `config.json` (as a string blob) would improve backup/restore parity — at the cost of mixing prose into a JSON file. Counter-argument: keeping it as `.md` lets users edit it with their preferred markdown editor outside the Options UI.
- **`userPrompt` markdown vs. config.json** (added 2026-05-21). Same shape as the `userInstructions` question: persisted as `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` rather than in `config.json`. Same trade-off applies.
- **`dh_items` bookmark menu independent file** (added 2026-05-21). Personal bookmarks (`chrome.storage.local.dh_items`) are not mirrored anywhere on disk currently. If `chrome.storage.local` corrupts or the user resets Chrome, personal bookmarks are gone. Consider persisting them as `%LOCALAPPDATA%\DynamicsHelper\bookmarks.json` (separate from `config.json` to avoid bloating the main config). Out of scope for the team-prefs work; surfaced because of the same "what does the user lose if storage clears" lens.
- **FAB `PrefsLanguageContext` adoption** (added 2026-05-21). The i18n Context introduced in v2.0.70 covers the Options.tsx component tree only. `FAB.tsx` calls `useTranslation()` without an override and still reads from `chrome.storage.local` directly, sync'd via `chrome.storage.onChanged`. This means: in the D365 page (where FAB runs), language switches made in Options don't reflect until `Save Changes` writes to storage. For now this is acceptable (FAB has no React state coupling to Options), but if a future feature needs FAB to share other prefs with Options (theme, button text, etc.), elevating the Context to a shared `PrefsContext` exported from `utils/` would let FAB opt in. Cost: ~20 lines. Benefit: removes the "Save first" latency for any FAB-visible pref.
- **Team items click-to-use in Options editor** (added 2026-05-21, beta.3 follow-up). Today the Options bookmark editor treats team items as view-only: single-click selects (no-op for team items since Add-to is disabled), and there is no way to open a team link or read a team note's markdown content without leaving Options and using FAB on an actual case page. FAB already handles both via `handleItemClick` in `FAB.tsx:914` (link → `resolveDynamicUrl` + `window.open`; markdown → `resultPopover`). Proposal: extend `DraggableItem` onClick so when `isTeamItem === true`:
  - `type === 'folder'` → toggle collapse (current behaviour, unchanged)
  - `type === 'link'` → `window.open(await resolveDynamicUrl(item.url))` in a new tab
  - `type === 'markdown'` → open a new lightweight `NotePreviewModal` (readonly ReactMarkdown + remarkGfm, Close-only footer; reuses the markdown-it bundle already pulled in by FAB)
  Personal item click behaviour stays as-is (single-click = select for Add-to). `resolveDynamicUrl` is already exported from `MenuLogic.ts:158` so no refactor needed there. Estimated cost: ~15 lines in DraggableItem + ~50 lines new component + a few i18n keys. Tradeoff vs alternative "double-click to use, single-click to select": single-click-to-use is the right call for team items because Add-to is disabled — there is no useful selection action on a team item anyway. Tracked here because user surfaced it after Plan A landed; not part of beta.3 itself.
- **Default-collapsed state for newly synced team folders** (added 2026-05-21, beta.3 follow-up). Currently after manifest sync every team folder renders expanded because `teamCollapsedLabels` is empty for never-seen keys. For small catalogs this is fine; for larger team catalogs the user may want everything to start collapsed. Three possible implementations: (a) on sync, bulk-add all folder keys to `teamCollapsedLabels` — breaks user memory because re-sync wipes their manual expand state; (b) add an optional `defaultCollapsed: true` field to the team manifest schema so the team owner controls the default, with `teamCollapsedLabels` only overriding when the user has explicitly toggled — requires a second `teamFoldersEverInteracted` Set to distinguish "user has touched this" from "never seen"; (c) `teamFoldersEverSeen` Set: first render adds new keys to both `teamCollapsedLabels` AND `teamFoldersEverSeen` so unseen folders default collapsed but the user's subsequent toggles stick. Recommended path is (b) because the team owner knows their own catalog size and old manifests without the field keep current behaviour (zero migration cost). Not urgent — current "default expanded" is a reasonable discoverability default.
- **[CLOSED 2026-05-21]** **`release_helper.py` hardcodes release notes** (added 2026-05-21, beta.3 follow-up). `publish_to_github()` at `release_helper.py:261` builds the GitHub release body from a 4-line f-string template (`"Release {tag}\n\n## Installation\n..."`). For beta.3 we had to write the real release notes to a separate markdown file and call `gh release create ... --notes-file` manually — bypassing helper's `--publish` flag entirely. Two related papercuts:
  1. `clean_releases_folder()` at `release_helper.py:287` indiscriminately wipes everything under `releases/` before building, so a notes markdown placed there gets deleted. Workaround for beta.3 was to keep the notes in `%TEMP%\opencode\` and feed `gh` explicitly.
  2. There is no `--notes-file <path>` parameter on the helper; you have to either accept the boring 4-line auto-notes or skip `--publish`.

  Proposal: add `--notes-file PATH` argument; when provided, pass it through to `gh release create --notes-file` instead of building the f-string. Also: change `clean_releases_folder()` to only delete `*.zip` and known build-output directory names, not arbitrary user files like `notes-*.md`. Cost: ~20 lines. Benefit: a future `python release_helper.py 2.0.71 --prerelease --publish --notes-file releases/notes-v2.0.71.md` is one command end-to-end.

  **Resolution:** Implemented per `docs/superpowers/specs/2026-05-21-release-helper-notes-file-design.md` (plan: `docs/superpowers/plans/2026-05-21-release-helper-notes-file-plan.md`). `--notes-file PATH` flag added with startup-time existence check; `clean_releases_folder()` narrowed to allowlist (`*.zip` + `DynamicsHelper_v*` dirs only). Next release can use a single command: `python release_helper.py <ver> --publish --prerelease --notes-file releases/notes-v<ver>.md`.
- **Local Python env has wrong SDK version installed** (added 2026-05-21, observed while running DoD test step for follow-up #10). `host/requirements.txt` pins `github-copilot-sdk==0.3.0` but the active Python 3.13 site-packages has 0.2.0 installed. Symptom: `python -m unittest discover host` produces 1 failure + 9 errors all of the form `ImportError: cannot import name 'PreToolUseHookOutput' / 'PermissionRequestResultKind' from 'copilot.session'` or `'PermissionRequestResult' from 'copilot.generated.rpc'` (these symbols exist in 0.3.0 only). Verified pre-existing on commit `4071206` (before any follow-up #10 code change). Not a wire-drift incident per AGENTS.md § 9.5 — the upstream package is fine, the local venv just drifted (likely from a `dev_switch.py` flip or an `--upgrade` that downgraded back to 0.2.0). Fix is one command: `pip install -r host/requirements.txt --upgrade`. Action item: re-run host tests after the install to confirm green; if any still fail, *that* is a real SDK 0.3.0 wire-drift and warrants its own follow-up + AGENTS.md § 9.5 playbook entry. Tracking here because it surfaced during DoD verification and the env fix is independent of the release_helper.py work.
