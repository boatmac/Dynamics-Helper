# Prefs State Management Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize prefs type, defaults, and read-side bridge into `extension/src/utils/prefs.ts`, eliminate FAB's hardcoded prefs default dictionary, and document the new convention in DEVELOPER_GUIDE.md.

**Architecture:** Single source of truth (`utils/prefs.ts`) exporting `Preferences` interface, `DEFAULT_PREFS` literal, and read-only `usePrefs()` hook. FAB switches from local `useState` + storage listener to `usePrefs()` + a tiny `rootPathOverride` state for runtime page-derived rootPath. Options.tsx imports the type/defaults but keeps its writer state machine unchanged.

**Tech Stack:** React 19, TypeScript, chrome.storage.local, Vite (extension build).

**Spec:** `docs/superpowers/specs/2026-05-21-prefs-context-refactor-design.md`

**Scope note:** Extension has no test infra (per AGENTS.md and follow-up #2). Verification is `npm run build` (compile-time check) plus manual browser smoke test. No automated tests added in this plan.

---

## File Structure

| File | Role | Action |
|---|---|---|
| `extension/src/utils/prefs.ts` | Single source of `Preferences`, `DEFAULT_PREFS`, `usePrefs()` | **Create** |
| `extension/src/components/FAB.tsx` | UI in D365 page; consumes prefs | **Modify** (delete useState + storage effect, add hook + rootPathOverride) |
| `extension/src/components/Options.tsx` | Settings UI; writer of prefs | **Modify** (delete inline interface + DEFAULT_PREFS, import from utils) |
| `DEVELOPER_GUIDE.md` | Project dev docs | **Modify** (add "Preferences State Management" section) |
| `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` | Rolling follow-ups list | **Modify** (mark #7 CLOSED, generate two new follow-ups per spec § 7) |

---

## Task 1: Create `utils/prefs.ts` skeleton

**Files:**
- Create: `extension/src/utils/prefs.ts`

- [ ] **Step 1: Verify no file already exists at the target path**

Run: `Test-Path extension/src/utils/prefs.ts`
Expected: `False`

If `True` — STOP. The file exists; this plan assumes greenfield. Investigate before continuing.

- [ ] **Step 2: Create the file with complete contents**

Write `extension/src/utils/prefs.ts`:

```typescript
import { useState, useEffect } from 'react';
import { LanguageCode } from './translations';

// Single source of truth for the dh_prefs storage shape.
//
// All fields except buttonText/primaryColor/offsetBottom/offsetRight are
// optional to mirror Options.tsx's pre-refactor declaration -- changing
// optionality here would alter truthy-check semantics elsewhere (e.g.
// `if (extPrefs.language)` in Options.tsx). If you want to tighten this,
// do it as a separate refactor with regression coverage.
export interface Preferences {
    buttonText: string;
    primaryColor: string;
    offsetBottom: number;
    offsetRight: number;
    userInstructions?: string;
    userPrompt?: string;
    rootPath?: string;
    skillDirectories?: string;
    mcpConfigPath?: string;
    useWorkspaceOnly?: boolean;
    autoAnalyzeMode?: 'disabled' | 'critical' | 'always' | 'new_cases';
    enableStatusBubble?: boolean;
    betaChannelEnabled?: boolean;
    logLevel?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    language?: LanguageCode;
    team?: string;
    teamCatalogEnabled?: boolean;
    teamManifestUrl?: string;
    teamLabel?: string;
}

// Default values applied when dh_prefs is absent or partially populated.
// Must stay byte-identical to the previous DEFAULT_PREFS literal in
// Options.tsx so first-launch behaviour is unchanged.
export const DEFAULT_PREFS: Preferences = {
    buttonText: "DH",
    primaryColor: "#0D9488",
    offsetBottom: 24,
    offsetRight: 24,
    userInstructions: "",
    userPrompt: "",
    rootPath: "",
    skillDirectories: "~/.copilot/skills",
    mcpConfigPath: "~/.copilot/mcp-config.json",
    useWorkspaceOnly: true,
    autoAnalyzeMode: 'disabled',
    enableStatusBubble: true,
    betaChannelEnabled: false,
    logLevel: 'INFO',
    language: 'auto',
    teamCatalogEnabled: false,
    teamManifestUrl: ''
};

// Read-only React hook over chrome.storage.local.dh_prefs.
//
// Returns { prefs } where prefs is DEFAULT_PREFS merged with whatever is
// currently in storage. Subscribes to chrome.storage.onChanged so any
// downstream write (Options.tsx::persistPrefs) re-renders all consumers.
//
// Hook does NOT write. Writing is the job of Options.tsx::persistPrefs,
// which has additional responsibilities (host config.json mirror via
// update_config RPC, optional team manifest fetch). Keeping the hook
// read-only avoids accidentally firing those side effects from FAB.
export function usePrefs(): { prefs: Preferences } {
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

    useEffect(() => {
        chrome.storage.local.get('dh_prefs', (result) => {
            if (result.dh_prefs && typeof result.dh_prefs === 'object') {
                setPrefs(prev => ({ ...prev, ...(result.dh_prefs as Partial<Preferences>) }));
            }
        });

        const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === 'local' && changes.dh_prefs) {
                const next = changes.dh_prefs.newValue;
                if (next && typeof next === 'object') {
                    setPrefs(prev => ({ ...prev, ...(next as Partial<Preferences>) }));
                }
            }
        };
        chrome.storage.onChanged.addListener(handleChange);
        return () => chrome.storage.onChanged.removeListener(handleChange);
    }, []);

    return { prefs };
}
```

- [ ] **Step 3: Build to verify TypeScript compiles**

Run from `extension/` directory: `npm run build`
Expected: build succeeds with no errors. The new file is unused so far, but TS will type-check it.

- [ ] **Step 4: Commit**

```bash
git add extension/src/utils/prefs.ts
git commit -m "feat(prefs): introduce utils/prefs.ts single source of truth

Adds Preferences interface, DEFAULT_PREFS literal, and read-only
usePrefs() hook. Not yet consumed by any component -- Tasks 2 and 3
migrate FAB.tsx and Options.tsx onto it.

Closes step 1 of docs/superpowers/specs/2026-05-21-prefs-context-refactor-design.md"
```

---

## Task 2: Migrate Options.tsx to import from `utils/prefs.ts`

**Files:**
- Modify: `extension/src/components/Options.tsx:40-80` (delete inline declarations) + the top-level imports.

- [ ] **Step 1: Add the import**

Find the existing import block near the top of `Options.tsx`. Locate the line that imports from `'../utils/i18n'`:

```typescript
import { useTranslation, LanguageCode, PrefsLanguageProvider } from '../utils/i18n';
```

Add a new import line directly below it:

```typescript
import { Preferences, DEFAULT_PREFS } from '../utils/prefs';
```

- [ ] **Step 2: Delete the inline `interface Preferences` declaration**

Locate the block at `Options.tsx:40-60`:

```typescript
interface Preferences {
    buttonText: string;
    primaryColor: string;
    // ... 17 more fields ...
    teamLabel?: string;   // Display name for selected team
}
```

Delete the entire block (lines 40 through 60 inclusive, ending at the closing `}`).

- [ ] **Step 3: Delete the inline `DEFAULT_PREFS` declaration**

Locate the block at `Options.tsx:62-80`:

```typescript
const DEFAULT_PREFS: Preferences = {
    buttonText: "DH",
    // ... 16 more fields ...
    teamManifestUrl: ''
};
```

Delete the entire block (lines 62 through 80 inclusive, ending at the closing `};`).

After steps 2 and 3, line 40 onward should jump directly from previous content to whatever was on line 82 (the `// --- Helpers ---` comment).

- [ ] **Step 4: Build to verify**

Run from `extension/` directory: `npm run build`
Expected: build succeeds. If TypeScript reports any error like "Cannot find name 'Preferences'" or "DEFAULT_PREFS is not defined", check that step 1's import was added correctly.

- [ ] **Step 5: Manual smoke check Options page**

Run: `npm run build` (already done in step 4).
Then in Chrome: go to `chrome://extensions`, reload the unpacked extension at `extension/dist`, open Options. Verify:
- Page renders without console errors.
- All form fields show correct initial values (matching `DEFAULT_PREFS`).
- Reset button still works (resets to defaults).
- Changing any field still triggers persistence (check `chrome.storage.local` via DevTools → Application → Storage → "Extension Storage" → check `dh_prefs` updates).

- [ ] **Step 6: Commit**

```bash
git add extension/src/components/Options.tsx
git commit -m "refactor(Options): import Preferences/DEFAULT_PREFS from utils/prefs

Single source of truth for the prefs type and defaults. No behavior
change -- the literal moved across files but is byte-identical.
Options.tsx remains the sole writer (persistPrefs unchanged).

Step 2 of prefs-context-refactor."
```

---

## Task 3: Migrate FAB.tsx to `usePrefs()` hook

**Files:**
- Modify: `extension/src/components/FAB.tsx`

This task has the most surface area. Read each step fully before editing.

- [ ] **Step 1: Add the import**

Find the existing import that pulls from `'../utils/i18n'`:

```typescript
import { useTranslation } from '../utils/i18n';
```

Add directly below:

```typescript
import { usePrefs } from '../utils/prefs';
```

- [ ] **Step 2: Replace the local prefs `useState` with `usePrefs()` + rootPathOverride**

Locate `FAB.tsx:360-369`:

```typescript
const [prefs, setPrefs] = useState({
    primaryColor: "#0D9488",
    buttonText: "DH",
    offsetBottom: 24,
    offsetRight: 24,
    userPrompt: "",
    rootPath: "",
    autoAnalyzeMode: 'disabled',
    enableStatusBubble: true
});
```

Replace this entire block with:

```typescript
const { prefs } = usePrefs();
const [rootPathOverride, setRootPathOverride] = useState<string | null>(null);
const effectivePrefs = rootPathOverride !== null
    ? { ...prefs, rootPath: rootPathOverride }
    : prefs;
```

- [ ] **Step 3: Delete the local storage-loading effect**

Locate the effect at `FAB.tsx:382-407` (approximate line numbers after step 2's edit; search for `loadPrefs` or the comment `// Load preferences on mount and listen for changes`):

```typescript
// Load preferences on mount and listen for changes
useEffect(() => {
    const loadPrefs = () => {
         chrome.storage.local.get("dh_prefs", (result) => {
            if (result.dh_prefs && typeof result.dh_prefs === 'object') {
                setPrefs(prev => ({ ...prev, ...(result.dh_prefs as object) }));
            }
        });
    };

    loadPrefs();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'local' && changes.dh_prefs) {
             const newPrefs = changes.dh_prefs.newValue;
             if (newPrefs && typeof newPrefs === 'object') {
                 setPrefs(prev => ({ ...prev, ...(newPrefs as object) }));
             }
        }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
    };
}, []);
```

Delete the entire block (from the `// Load preferences ...` comment through the closing `}, []);` of the `useEffect`).

- [ ] **Step 4: Update the rootPath setter to use `setRootPathOverride`**

Locate `FAB.tsx:480-482` (search for `setPrefs(prev => ({ ...prev, rootPath }))`):

```typescript
if (rootPath && rootPath !== prefs.rootPath) {
    setPrefs(prev => ({ ...prev, rootPath }));
}
```

Replace with:

```typescript
if (rootPath && rootPath !== effectivePrefs.rootPath) {
    setRootPathOverride(rootPath);
}
```

- [ ] **Step 5: Update consumers that need the override-aware rootPath**

Three call sites read `prefs.rootPath`. They must read `effectivePrefs.rootPath`:

5a. **Line ~525** (the dependency array of the rootPath listener `useEffect`):

Find:
```typescript
}, [prefs.rootPath, scrapedData]); // Dependencies for the listener
```

Replace with:
```typescript
}, [effectivePrefs.rootPath, scrapedData]); // Dependencies for the listener
```

5b. **Line ~781** (the analyze payload):

Find:
```typescript
rootPath: prefs.rootPath,
```

Replace with:
```typescript
rootPath: effectivePrefs.rootPath,
```

5c. The line you already changed in step 4 (which now reads `effectivePrefs.rootPath`).

- [ ] **Step 6: Leave non-rootPath `prefs.xxx` reads alone**

The remaining 9 consumers (`prefs.enableStatusBubble`, `prefs.autoAnalyzeMode`, `prefs.userPrompt`, `prefs.buttonText`, including their dependency-array appearances) read fields that have no runtime override — they should continue reading from `prefs` directly.

**Do NOT do a blind find-replace of `prefs.` → `effectivePrefs.`**. Only the three rootPath sites change. The reason: `effectivePrefs` is only different from `prefs` for the `rootPath` field; using it for other fields adds confusion without benefit, and using it inside `useEffect` dependency arrays where the field never has an override creates spurious re-render triggers.

- [ ] **Step 7: Build to verify**

Run from `extension/` directory: `npm run build`
Expected: build succeeds. Common errors and fixes:
- `Cannot find name 'setPrefs'` — you missed deleting a `setPrefs(...)` call somewhere. Grep `extension/src/components/FAB.tsx` for `setPrefs` and check what's left should be only the rootPath one (now `setRootPathOverride`).
- `Property 'rootPath' is missing` — TypeScript noticed the new `Preferences` shape requires explicit handling. Check the import in step 1 succeeded.
- `Type '"disabled" | "critical" | ...' is not assignable to type 'string'` — old useState was inferring loose types. The new `usePrefs()` returns the strict `Preferences` shape; any local code that compared `prefs.autoAnalyzeMode === 'someValue'` should now type-check correctly. If it errors, check the comparison string is one of the four valid literals.

- [ ] **Step 8: Reload extension and manual smoke test**

Reload the extension in `chrome://extensions` (pointing to `extension/dist`).

Open a D365 case page. Verify:
- FAB renders. Button shows correct text (default "DH" or whatever Options has saved).
- Click FAB → menu opens normally.
- Run analyze → completes normally; payload should include the correct rootPath.
- Switch to a different case → confirm rootPath display updates (this is the rootPathOverride flow working).
- Open Options in another tab → change `language` → return to D365 page → confirm FAB UI text updates without reloading the extension.
- Open Options → change `enableStatusBubble` → confirm status bubble visibility responds in FAB.

- [ ] **Step 9: Commit**

```bash
git add extension/src/components/FAB.tsx
git commit -m "refactor(FAB): consume prefs via utils/prefs.ts hook

Replaces FAB's local useState({...8 fields...}) prefs dictionary with
usePrefs() reading the canonical DEFAULT_PREFS / Preferences from
utils/prefs.ts. Eliminates the two-sided default-value maintenance
that was already drifting (FAB had only 8 of 19 fields).

The rootPath runtime override (FAB derives it from page URL, never
writes to storage) becomes a separate component-local state +
effectivePrefs merge -- documented exception per spec section 4.1.

Step 3 of prefs-context-refactor."
```

---

## Task 4: Document the new convention in DEVELOPER_GUIDE.md

**Files:**
- Modify: `DEVELOPER_GUIDE.md`

- [ ] **Step 1: Locate the insertion point**

Find the line in `DEVELOPER_GUIDE.md` containing the i18n internationalization section header. Search for `## 7.` or `## Internationalization` (whichever the file uses). The new section goes immediately **after** the i18n section's content, before the next major section.

If unsure, run:
```bash
Select-String -Path DEVELOPER_GUIDE.md -Pattern "^## " | ForEach-Object { $_.LineNumber.ToString() + ': ' + $_.Line }
```

Pick a section number that fits. Number the new section accordingly (renumber later sections if necessary).

- [ ] **Step 2: Insert the new section**

Add this content (adjust the heading number to fit the file's existing numbering):

```markdown
## N. Preferences State Management

All extension preferences (the `dh_prefs` chrome.storage.local key) are typed and managed through `extension/src/utils/prefs.ts`:

- **`Preferences` interface** — the canonical type. Add new fields here, never in component-local state declarations.
- **`DEFAULT_PREFS`** — single source of truth for default values. Components must not declare their own default dictionaries.
- **`usePrefs()` hook** — read-only React hook returning `{ prefs }`. Subscribes to `chrome.storage.onChanged` and re-renders consumers on any `dh_prefs` change.

### Reading prefs

Any component (FAB, future overlays, etc.) calls `usePrefs()`:

```typescript
import { usePrefs } from '../utils/prefs';

const MyComponent = () => {
    const { prefs } = usePrefs();
    return <div>{prefs.buttonText}</div>;
};
```

Do **not** call `chrome.storage.local.get('dh_prefs')` directly inside a React component. That bypasses the hook's onChanged subscription and creates the same two-sided default-value drift the refactor eliminated.

### Writing prefs

Only `Options.tsx::persistPrefs(nextPrefs, opts?)` writes. It (a) calls `chrome.storage.local.set({ dh_prefs })`, (b) fires `update_config` RPC to the host so `config.json` is mirrored (see AGENTS.md § 3 "Options config persistence principle"), (c) optionally re-fetches the team manifest if `opts.fetchManifest` is set. Other components do **not** write to `dh_prefs`.

### Documented exception — runtime overrides

FAB derives `rootPath` from the active D365 page URL at runtime. This override is a component-local `useState` (not a write to storage) and intentionally does not propagate to Options or to `config.json`. Pattern:

```typescript
const { prefs } = usePrefs();
const [rootPathOverride, setRootPathOverride] = useState<string | null>(null);
const effectivePrefs = rootPathOverride !== null
    ? { ...prefs, rootPath: rootPathOverride }
    : prefs;
```

Any future runtime-only override (a value that's component-derived rather than user-configured) must follow the same pattern: separate local state + merged `effectivePrefs` view. Do **not** call any setter on the hook's state — the hook is read-only by design.

### Service workers

`serviceWorker.ts` cannot use React hooks. If a service worker ever needs prefs, it reads `chrome.storage.local.get('dh_prefs')` directly. The "use the hook" convention applies to React-rendered contexts only.
```

- [ ] **Step 3: Update the table of contents (if the file has one)**

Run:
```bash
Select-String -Path DEVELOPER_GUIDE.md -Pattern "^## "
```

If you see a numbered TOC near the top of the file, add an entry pointing to the new section. If there's no TOC, skip this step.

- [ ] **Step 4: Commit**

```bash
git add DEVELOPER_GUIDE.md
git commit -m "docs(dev): document Preferences state management convention

Spells out the single-source-of-truth rule (utils/prefs.ts), the
read-only hook contract (usePrefs), the writer contract
(Options.tsx::persistPrefs only), and the documented exception for
runtime overrides (FAB rootPath).

Per AGENTS.md DoD section 7.4: internal logic significantly changed
(centralized prefs state mgmt) so DEVELOPER_GUIDE.md updates.

Step 4 of prefs-context-refactor."
```

---

## Task 5: Close follow-up #7 and add new follow-ups

**Files:**
- Modify: `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`

- [ ] **Step 1: Locate the FAB PrefsLanguageContext follow-up**

Run:
```bash
Select-String -Path "docs/superpowers/plans/2026-05-11-beta-channel-toggle.md" -Pattern "FAB .PrefsLanguageContext"
```

Expected: one line containing `- **FAB \`PrefsLanguageContext\` adoption** (added 2026-05-21)`. Note the line number.

- [ ] **Step 2: Mark it CLOSED**

Edit the file. Replace:

```markdown
- **FAB `PrefsLanguageContext` adoption** (added 2026-05-21).
```

With:

```markdown
- **[CLOSED 2026-05-21]** **FAB `PrefsLanguageContext` adoption** (added 2026-05-21).
```

(Keep the rest of the bullet's body unchanged.)

- [ ] **Step 3: Append a Resolution paragraph at the end of that bullet**

After the existing bullet body (which ends with "...Cost: ~20 lines. Benefit: removes the 'Save first' latency for any FAB-visible pref."), add a new paragraph:

```markdown

  **Resolution:** Implemented per `docs/superpowers/specs/2026-05-21-prefs-context-refactor-design.md`. Scope grew during brainstorming: the actual problem turned out not to be the "Save first" latency (already fixed by v2.0.70 instant-persist) but two-sided maintenance of default-value dictionaries between Options.tsx and FAB.tsx, plus loss of TypeScript safety at the FAB ↔ storage boundary (`as object` cast). Refactor introduces `extension/src/utils/prefs.ts` as single source of truth (Preferences interface, DEFAULT_PREFS, read-only `usePrefs()` hook), migrates FAB to consume it, keeps Options.tsx as the sole writer (persistPrefs unchanged with all host-mirror responsibilities). Net code change: ~80 lines removed (duplication), one new ~80-line module, plus a new "Preferences State Management" section in DEVELOPER_GUIDE.md formalizing the convention.
```

(Note the leading blank line and the two-space indent on the `**Resolution:**` line — this matches the indent style of the other CLOSED entries in the file.)

- [ ] **Step 4: Add two new follow-ups generated by this work**

Per spec § 7. Append at the end of the open follow-ups section (before any CLOSED block, matching the file's existing layout):

```markdown
- **`useTranslation` storage path could collapse onto `usePrefs`** (added 2026-05-21, prefs-refactor follow-up). The `useTranslation` hook in `extension/src/utils/i18n.ts:37-64` reads `dh_prefs.language` from storage with its own listener — duplicating exactly what `usePrefs()` now does. Could be ~10 lines of cleanup: replace the inline storage subscribe with `const { prefs } = usePrefs(); const language = prefs.language ?? 'auto';`. Out of scope for the prefs refactor itself because i18n.ts works correctly today and the change is pure dedup with no behavior delta. Do this when next touching i18n.ts for any other reason.
- **FAB rootPathOverride regression test** (added 2026-05-21, prefs-refactor follow-up). The new `rootPathOverride` state in FAB.tsx + `effectivePrefs` merge is a documented exception to "all prefs come from the hook". A future refactor could accidentally collapse this back into the hook (e.g., trying to make the hook accept runtime overrides). Once extension test infra exists (follow-up #2), add a regression test that asserts: (a) FAB writes to `effectivePrefs.rootPath` are not persisted to `chrome.storage.local`, (b) Options-side rootPath changes are still observed by FAB unless an override is active, (c) clearing the override (setRootPathOverride(null)) restores Options' rootPath. This is a forward-looking guardrail; not actionable until follow-up #2 lands.
```

- [ ] **Step 5: Verify the edits**

Run:
```bash
Select-String -Path "docs/superpowers/plans/2026-05-11-beta-channel-toggle.md" -Pattern "CLOSED 2026-05-21" | Measure-Object
```

Expected count: previously 2 (notes-file, env-drift). After this task: 3 (added FAB context).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-05-11-beta-channel-toggle.md
git commit -m "docs: close follow-up #7 (FAB PrefsLanguageContext); log 2 generated follow-ups

Closure cross-references the implementing spec. Two new follow-ups:
useTranslation storage-path dedup and FAB rootPathOverride regression
test (depends on follow-up #2 extension test infra)."
```

---

## Task 6: Final verification

- [ ] **Step 1: Run host tests (no host code touched, must stay green)**

Run: `python -m unittest discover host`
Expected: `Ran 50 tests in <small>s -- OK`.

If failures appear, they are unrelated to this refactor (no host code was modified). Investigate before proceeding only if the failure pattern is new.

- [ ] **Step 2: Build extension one final time**

Run from `extension/`: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 3: Reload extension and run end-to-end smoke test**

Reload extension at `extension/dist`, then exercise the full happy path:

1. Open Options page → all settings render with current values.
2. Change `language` (EN ↔ ZH) → Options re-renders strings live (PrefsLanguageProvider path still works).
3. Save / blur — verify `chrome.storage.local.dh_prefs` updates (DevTools → Application → Storage).
4. Verify host config.json updates: open `%LOCALAPPDATA%\DynamicsHelper\config.json`, confirm `extension_preferences.language` reflects the new value.
5. Open D365 case page → FAB renders, button text matches `prefs.buttonText`.
6. Switch case → confirm rootPath display updates (rootPathOverride flow).
7. With FAB open, change `enableStatusBubble` in Options → confirm FAB status bubble visibility responds without reload.
8. Run a full analyze → completes successfully, report shows correct rootPath in payload.

- [ ] **Step 4: Review all commits**

Run: `git log --oneline origin/master..HEAD`
Expected: 5 new commits (Tasks 1-5; Task 6 has no commit).

Read each commit message — verify they match the conventional-commits style of recent project commits.

- [ ] **Step 5: Push**

```bash
git push origin master
```

Expected: push succeeds, commits visible on GitHub.

- [ ] **Step 6: Update todo / announce completion**

Mark all in-progress task todos as completed. Announce to the user: implementation done, follow-up #7 closed, two new follow-ups logged, all tests passing.

---

## Self-Review Checklist (run after writing the plan, before handing off)

- [x] **Spec coverage:** Every spec section maps to a task. § 3.1 → Task 1. § 3.2 → Task 3. § 3.3 → Task 2. § 3.4 → covered by Task 2's "Options keeps its writer state" decision. § 4.1 → Task 4. § 4.2-4.4 → no-ops, noted. § 5 → tasks 1-5. § 6 risks → addressed inline (R1 in Task 3 step 8 verification, R2 noted in Task 1, R3 in Task 5 step 4 follow-up, R4 trivial, R5 in Task 4 step 2 docs). § 7 → Task 5 step 4. § 8 → Task 6 step 3. § 9 → all tasks combined.
- [x] **No placeholders:** Every step has either complete code or an exact command. No "TODO", "TBD", "fill in".
- [x] **Type consistency:** `Preferences`, `DEFAULT_PREFS`, `usePrefs`, `Partial<Preferences>` used consistently across Tasks 1, 2, 3.
- [x] **File paths exact:** All paths absolute or rooted at the repo / extension/ as appropriate.
- [x] **Commit messages:** Each task ends with a concrete `git commit -m "..."` block matching project conventional-commits style (feat/refactor/docs/chore prefixes).

## Bailout

If at any point during execution `npm run build` produces an error you cannot diagnose within 10 minutes:

1. `git stash` your in-flight work.
2. `git checkout master -- extension/src/components/FAB.tsx extension/src/components/Options.tsx` to revert the touched files.
3. Verify `npm run build` is green at master.
4. Reapply step-by-step from the stash, building after each individual edit, to bisect the breaking change.
