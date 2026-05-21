# Prefs State Management Refactor — Design Spec

**Date:** 2026-05-21
**Closes follow-up:** #7 (FAB `PrefsLanguageContext` adoption) in `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`
**Status:** Draft for user review

## 1. Problem

Two-sided maintenance is already happening for prefs default values, and TypeScript safety is escaping at the FAB ↔ storage boundary.

**Concrete evidence:**

- `extension/src/components/Options.tsx` defines `interface Preferences` and `DEFAULT_PREFS` (~20 fields, full set).
- `extension/src/components/FAB.tsx:360` declares its own `useState({ primaryColor, buttonText, offsetBottom, offsetRight, userPrompt, rootPath, autoAnalyzeMode, enableStatusBubble })` — 8 fields, hardcoded subset, **no shared type with Options**.
- FAB merges storage payloads via `setPrefs(prev => ({ ...prev, ...(result.dh_prefs as object) }))` — the `as object` cast erases the contract; any field FAB *doesn't* hardcode in its initial `useState` is type `unknown` to TypeScript.
- 11 prefs fields exist in Options' `DEFAULT_PREFS` but not in FAB's initializer (`language`, `logLevel`, `betaChannelEnabled`, `teamCatalogEnabled`, `teamManifestUrl`, `team`, `teamLabel`, `useWorkspaceOnly`, `mcpConfigPath`, `skillDirectories`, `userInstructions`). FAB happens not to read those today, so the gap is silent — but any future code in FAB that uses one of them ships with `undefined` as the implicit fallback because `as object` lets the access compile.
- `i18n.ts` does the right thing locally with `PrefsLanguageContext`, but only the Options subtree benefits. FAB falls back to `useTranslation`'s storage listener, which works for `language` only.

**Documentation gap:** `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, and `AGENTS.md` describe persistence rules (`extension_preferences` snake_case, host config.json mirroring) but say nothing about *where* the `Preferences` type lives, *who* may read prefs, or *who* may write them. The two-sided maintenance is an unwritten convention, easy to violate.

## 2. Goal

Single source of truth for prefs type, default values, storage I/O, and the live-React-state bridge. Every component reads via one hook; only the Options page writes (via the existing `persistPrefs` helper, which retains its host RPC + manifest-fetch responsibilities).

Non-goals:
- Changing what gets persisted to `config.json`. The host-side mirroring (snake_case mapping, `extension_preferences` writeback, `update_config` RPC) stays exactly as it is today.
- Changing the `PrefsLanguageContext` design. That context covers a real problem the storage path can't (within-Options live preview before the persist roundtrip) and stays in `i18n.ts`.
- Adding tests. Extension test infra is follow-up #2 (separate work). Manual verification only.

## 3. Architecture

### 3.1 New module: `extension/src/utils/prefs.ts`

Single home for the type, the defaults, and the read-side hook.

```ts
// utils/prefs.ts (sketch)

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
export type AutoAnalyzeMode = 'disabled' | 'always' | 'critical' | 'new_cases';
// (LanguageCode stays in i18n.ts and is re-exported by prefs.ts for convenience)

export interface Preferences {
  language: LanguageCode;
  primaryColor: string;
  buttonText: string;
  offsetBottom: number;
  offsetRight: number;
  rootPath: string;
  userPrompt: string;
  userInstructions: string;
  autoAnalyzeMode: AutoAnalyzeMode;
  enableStatusBubble: boolean;
  logLevel: LogLevel;
  mcpConfigPath: string;
  skillDirectories: string;
  useWorkspaceOnly: boolean;
  betaChannelEnabled: boolean;
  teamCatalogEnabled: boolean;
  teamManifestUrl: string;
  team: string;
  teamLabel: string;
}

export const DEFAULT_PREFS: Preferences = { /* identical to today's Options.tsx */ };

export function usePrefs(): { prefs: Preferences } {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    chrome.storage.local.get('dh_prefs', (r) => {
      if (r.dh_prefs && typeof r.dh_prefs === 'object') {
        setPrefs(prev => ({ ...prev, ...(r.dh_prefs as Partial<Preferences>) }));
      }
    });
    const onChange = (changes: any, area: string) => {
      if (area === 'local' && changes.dh_prefs) {
        const next = changes.dh_prefs.newValue;
        if (next && typeof next === 'object') {
          setPrefs(prev => ({ ...prev, ...(next as Partial<Preferences>) }));
        }
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return { prefs };
}
```

The hook is **read-only**. Writing is the job of `Options.tsx::persistPrefs` (keeps its host RPC and manifest-fetch responsibilities — see § 3.3).

### 3.2 FAB.tsx changes

- Delete `useState({ primaryColor: '#0D9488', ... })` initializer (lines 360-369).
- Delete the `loadPrefs + chrome.storage.onChanged` effect (lines 383-407, ~25 lines).
- Add `const { prefs } = usePrefs();` near the top of the component.
- Keep the **rootPath override** (lines 480-482) as a separate state, per Q3 design decision:
  ```ts
  const [rootPathOverride, setRootPathOverride] = useState<string | null>(null);
  const effectivePrefs = rootPathOverride !== null
    ? { ...prefs, rootPath: rootPathOverride }
    : prefs;
  ```
  All consumers in FAB read `effectivePrefs.xxx` instead of `prefs.xxx`. The line that currently does `setPrefs(prev => ({ ...prev, rootPath }))` becomes `setRootPathOverride(rootPath)`.

### 3.3 Options.tsx changes

Options is the *writer* — it owns the mutable prefs state for in-flight UI edits, persistence side effects (host RPC, manifest fetch), and Reset semantics. It does **not** consume `usePrefs()`. The hook is for read-only consumers; Options is fundamentally different and would have to duplicate logic if forced through it (Q2 design decision).

What changes in Options.tsx:

- Remove the local `interface Preferences` declaration; import from `utils/prefs.ts` instead.
- Remove the local `const DEFAULT_PREFS = { ... }` declaration; import from `utils/prefs.ts` instead.
- Everything else stays: `useState<Preferences>(DEFAULT_PREFS)`, the load-from-storage `useEffect`, `persistPrefs`, `updatePref`, `handlePrefBlur`, `handleReset`, the PrefsLanguageProvider wrap.

Net diff in Options.tsx: ~25 lines deleted (the inline `interface Preferences` body and `DEFAULT_PREFS` literal), 2 lines added (imports). Zero behaviour change.

### 3.4 Why `usePrefs()` doesn't replace Options' state

The hook returns immutable `prefs`. Options' UI needs:

- Field-level controlled inputs (`<input value={prefs.userPrompt} onChange={...} />`).
- Local-only state during typing before `persistPrefs` fires on blur.
- The `setPrefs` setter wired through `updatePref` and `handlePrefBlur`.

Replacing all of that with `usePrefs()` would require either making the hook into a writer too (rejected in Q2 — keeps it pure) or duplicating the read state in Options anyway. The honest answer is: **Options is special, and that's fine**. The refactor's value is everywhere else: FAB now, future components later.

## 4. Documentation deltas

### 4.1 New section in `DEVELOPER_GUIDE.md`: "Preferences State Management"

Add after the existing § "State Management" mention (line ~169 area). Content:

> **Preferences State Management**
>
> All prefs (the `dh_prefs` chrome.storage.local key) are typed in `extension/src/utils/prefs.ts`:
>
> - `Preferences` interface — the canonical type. Add new fields here, never in component-local state declarations.
> - `DEFAULT_PREFS` — single source of truth for default values. Components must not declare their own default dictionaries.
> - `usePrefs()` hook — read-only React hook returning `{ prefs }`. Subscribes to `chrome.storage.onChanged` and re-renders on any `dh_prefs` change.
>
> **Reading prefs:** any component (FAB, future overlays, etc.) calls `usePrefs()`. Do NOT call `chrome.storage.local.get('dh_prefs')` directly inside a component.
>
> **Writing prefs:** only `Options.tsx::persistPrefs(nextPrefs, opts?)` writes. It (a) calls `chrome.storage.local.set({ dh_prefs })`, (b) fires `update_config` RPC to the host (so config.json is mirrored — see AGENTS.md § 3 "Options config persistence principle"), (c) optionally re-fetches the team manifest. Other components do not write to `dh_prefs`.
>
> **Documented exception — runtime overrides:** FAB derives `rootPath` from the active D365 page URL at runtime; this override is a component-local `useState`, not a write to storage, and intentionally does not propagate to Options or to config.json. Any future runtime-only override must follow the same pattern (separate local state + `effectivePrefs` merge), not `setPrefs` into the hook's state.

### 4.2 No change to `ARCHITECTURE.md`

ARCHITECTURE.md is system-level (deployment, registry, manifest); prefs state management is internal-logic-level. DEVELOPER_GUIDE.md is the right home.

### 4.3 No change to `USER_GUIDE.md`

User-facing behaviour is unchanged.

### 4.4 No change to `AGENTS.md`

Existing § 3 "Options config persistence principle" already covers the persistence rules. The new "single hook + single writer" rule is a code-organization concern that belongs in DEVELOPER_GUIDE.md. (If we find AI agents repeatedly fail the new convention, we'll port a one-line summary into AGENTS.md later.)

## 5. Migration plan (rough — full version goes in writing-plans output)

1. Create `extension/src/utils/prefs.ts` with `Preferences`, `DEFAULT_PREFS`, `usePrefs()`. Verify TS compilation.
2. Update `Options.tsx` imports — remove local `Preferences` and `DEFAULT_PREFS` declarations, import from `utils/prefs.ts`. Verify `npm run build` still passes (no behavior change).
3. Update `FAB.tsx`: delete `useState` initializer + storage effect, add `usePrefs()`, add `rootPathOverride` state + `effectivePrefs`. Re-point all `prefs.xxx` consumers to `effectivePrefs.xxx` where rootPath matters; everywhere else stays `prefs.xxx`.
4. Manual verify in browser: open Options → change `language` → switch to D365 page → FAB UI text in new language without reload. Open Options → change `primaryColor` → FAB button color updates without reload. (Both already work today; this is regression check.)
5. Verify FAB still detects rootPath changes when navigating between cases (rootPathOverride still flows).
6. Update `DEVELOPER_GUIDE.md` with the new section per § 4.1.
7. Close follow-up #7 in `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` with a Resolution paragraph linking back to this spec.
8. Commit per task; one commit per file boundary where possible.

## 6. Risks and open questions

### R1: FAB mounted before Options ever opened — first-run defaults

Today FAB's `useState({ primaryColor: '#0D9488', ... })` initializer means the first paint uses hardcoded values. After refactor, first paint uses `DEFAULT_PREFS` from `utils/prefs.ts`, then the `useEffect` runs `chrome.storage.local.get('dh_prefs')` and updates state. **Same two-paint behaviour as today** — no regression. (The 8 fields FAB hardcoded today happen to match `DEFAULT_PREFS` for those 8 keys; we verified this manually.)

### R2: Does `usePrefs()` belong in `utils/` or `hooks/`?

Project has no `hooks/` directory yet. `utils/` already hosts `i18n.ts` (which exports a hook), `telemetry.ts`, `MenuLogic.ts` — colocating `prefs.ts` with `i18n.ts` is consistent. Decision: `utils/prefs.ts`.

### R3: `useTranslation` storage path could collapse onto `usePrefs`

The `useTranslation` hook in `i18n.ts` lines 37-64 reads `dh_prefs.language` from storage with its own listener. After the refactor, that block could just call `usePrefs()` and read `prefs.language`. **Out of scope for this refactor** — `i18n.ts` works correctly today, and this is a follow-up cleanup that's pure code-dedup with no behavior change. Tracked in § 7 follow-ups.

### R4: Hook ordering rules

`usePrefs()` uses `useState` + `useEffect`; safe to call from any component top-level. No conditional / loop concerns.

### R5: Service worker access

`serviceWorker.ts` reads telemetry-related state but not `dh_prefs`. If it ever needs prefs in the future, it must use `chrome.storage.local.get` directly (service workers don't have React, can't use hooks). The convention "use the hook" applies to React contexts only. Document this nuance in DEVELOPER_GUIDE.md if/when a service worker prefs read appears.

## 7. Follow-ups generated by this work

- **`useTranslation` storage path → `usePrefs`** (R3 above). Cosmetic cleanup, ~10 lines saved in `i18n.ts`. File against beta-channel-toggle plan after this refactor lands.
- **Future runtime override pattern test cases** (depends on follow-up #2 PageReader test infra). When extension tests exist, add a regression test for FAB's `rootPathOverride` semantics so a future refactor doesn't accidentally collapse it back into the hook.

## 8. Verification (manual, since no test infra)

After implementation:

1. `npm run build` succeeds with zero TS errors.
2. Reload extension in `chrome://extensions`.
3. Open Options page — confirm all current behaviours unchanged: language switch, color picker, MCP path edits, Reset button, beta channel toggle, team catalog sync.
4. Open a D365 case page — confirm FAB renders with correct color, position, button text. Switch case → confirm rootPath display updates (override mechanism works).
5. With FAB open, go back to Options, change language EN ↔ ZH → confirm FAB UI strings update without reload.
6. With FAB open, change `primaryColor` in Options → confirm FAB button color updates without reload.
7. Confirm `host/native_host.log` shows the `update_config` RPC firing on each Options change (host mirror still working).
8. `python -m unittest discover host` passes (50/50, unchanged — no host code modified).

## 9. Definition of Done

- Spec committed (this file).
- Plan written (separate file via writing-plans skill).
- Implementation across `utils/prefs.ts` (new), `FAB.tsx`, `Options.tsx`.
- `DEVELOPER_GUIDE.md` updated per § 4.1.
- Follow-up #7 marked CLOSED with link to this spec.
- Manual verification § 8 passes.
- `npm run build` succeeds.
- `python -m unittest discover host` 50/50.
- Commits pushed to `master`.
