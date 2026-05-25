// Regression guard for the FAB.tsx `rootPathOverride` mechanism (FAB.tsx:362-365).
//
// Context: per docs/superpowers/plans/2026-05-11-beta-channel-toggle.md
// follow-up #5 (the "FAB rootPathOverride regression test" item, opened
// 2026-05-21 during the prefs-refactor), the override is a documented
// exception to the rule that "all prefs come from the usePrefs() hook".
// A future refactor could accidentally collapse it back into the hook
// (e.g., make the hook accept runtime overrides), which would break the
// invariants below. This file locks those invariants as pure-function
// unit tests so the regression surfaces without spinning up the full
// FAB component in jsdom (which would require mocking MutationObserver,
// window event listeners, chrome.runtime.sendMessage, setupContextMenu,
// usePrefs, etc. — all noise relative to the three behaviours we care
// about).
//
// The three invariants (verbatim from follow-up #5):
//   (a) FAB writes to `effectivePrefs.rootPath` are not persisted to
//       chrome.storage.local
//   (b) Options-side rootPath changes are still observed by FAB unless an
//       override is active
//   (c) clearing the override (setRootPathOverride(null)) restores Options'
//       rootPath
//
// The production code under test is the pure expression at FAB.tsx:363-365:
//   const effectivePrefs = rootPathOverride !== null
//     ? { ...prefs, rootPath: rootPathOverride }
//     : prefs;
// Extracting it into mergeRootPathOverride() in utils/prefs.ts keeps the
// merge logic in one place and gives the test a stable import surface.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeRootPathOverride, DEFAULT_PREFS, type Preferences } from '../utils/prefs';
import {
  installChromeMock,
  resetChromeMock,
  chromeMockSpies,
} from '../test/chromeMock';

// Build from DEFAULT_PREFS so we always satisfy the full Preferences
// interface (strict tsc cares; Vitest's esbuild does not — the build was
// catching this even though tests passed). Override two fields with
// non-default test values so an accidental "use prefs.rootPath" wins
// vs. a "use override" path is visible in the assertions.
const PREFS_BASE: Preferences = {
  ...DEFAULT_PREFS,
  rootPath: 'C:\\Options\\Path',
  buttonText: 'DH',
};

beforeEach(() => {
  installChromeMock();
  resetChromeMock();
});

describe('FAB rootPathOverride invariants (follow-up #5)', () => {
  // F-Inv1: writes to effectivePrefs.rootPath do not persist to chrome.storage.
  //
  // Strategy: mergeRootPathOverride is a pure function. The invariant is
  // proven by exercising the merge against a chrome mock and asserting no
  // storage spy fired. This is the structural guard — if a future
  // refactor adds `chrome.storage.local.set` inside the merge (e.g.,
  // because someone "fixed" the override by writing it through), this
  // test fails.
  it('F-Inv1: merging an override does not touch chrome.storage.local', () => {
    const result = mergeRootPathOverride(PREFS_BASE, 'C:\\FAB\\Override');
    expect(result.rootPath).toBe('C:\\FAB\\Override');
    expect(chromeMockSpies.storageSet).not.toHaveBeenCalled();
    expect(chromeMockSpies.storageGet).not.toHaveBeenCalled();
    expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled();
    expect(chromeMockSpies.sendMessage).not.toHaveBeenCalled();
  });

  // F-Inv2: when no override is active, Options-side rootPath changes flow
  // through (the hook value wins). Models the production case where
  // rootPathOverride === null and prefs.rootPath updates from the
  // PrefsContext propagate untouched to FAB.
  it('F-Inv2: with override=null, the prefs.rootPath value passes through', () => {
    const result = mergeRootPathOverride(PREFS_BASE, null);
    expect(result.rootPath).toBe('C:\\Options\\Path');
    // Also verify the function returns the same reference when override is
    // null — this matches FAB.tsx's `: prefs` branch and is what
    // downstream useEffect dependency arrays depend on for stable
    // identity. Breaking this would cause spurious re-runs of the
    // effects that depend on effectivePrefs.rootPath.
    expect(result).toBe(PREFS_BASE);
  });

  // F-Inv3: clearing an override (transitioning to override=null) restores
  // the Options value. Models the recovery path after a context-menu
  // selection that previously called setRootPathOverride(somePath).
  it('F-Inv3: clearing the override restores prefs.rootPath', () => {
    const withOverride = mergeRootPathOverride(PREFS_BASE, 'C:\\FAB\\Override');
    expect(withOverride.rootPath).toBe('C:\\FAB\\Override');

    const afterClear = mergeRootPathOverride(PREFS_BASE, null);
    expect(afterClear.rootPath).toBe('C:\\Options\\Path');
    expect(afterClear).toBe(PREFS_BASE);
  });

  // Cross-cutting: the override only touches rootPath. Unrelated prefs
  // fields must come through unchanged on the override branch — otherwise
  // a future refactor that lifts the override into a partial-prefs hook
  // could silently drop other fields.
  it('override branch leaves non-rootPath fields untouched', () => {
    const result = mergeRootPathOverride(PREFS_BASE, 'C:\\FAB\\Override');
    expect(result.language).toBe(PREFS_BASE.language);
    expect(result.buttonText).toBe(PREFS_BASE.buttonText);
    expect(result.primaryColor).toBe(PREFS_BASE.primaryColor);
    expect(result.offsetBottom).toBe(PREFS_BASE.offsetBottom);
    expect(result.offsetRight).toBe(PREFS_BASE.offsetRight);
  });
});
