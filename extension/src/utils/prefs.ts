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
    /**
     * Maximum seconds the host will wait for Copilot to finish a single
     * analyze before timing out. User-configurable in Options (C2b-lite).
     * Clamped server-side to [60, 3600]; Options UI enforces the same
     * range. Default 1200 (was hardcoded 600 pre-v2.0.72).
     *
     * FAB derives its safety timeout from this value + 10s grace so the
     * popover error always comes from the host's truthful "Copilot did
     * not finish" branch, never FAB's generic fallback.
     */
    analyzeTimeoutSeconds?: number;
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
    teamManifestUrl: '',
    analyzeTimeoutSeconds: 1200
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

/**
 * Merge a runtime rootPath override over a Preferences object.
 *
 * Used by FAB.tsx to support context-menu invocations that specify a
 * rootPath different from the Options-configured one (e.g. a right-click
 * "Analyze Error" from a different workspace). The override is a React
 * useState in FAB, deliberately kept OUT of the usePrefs hook and OUT of
 * chrome.storage — it must not persist, and it must not leak across
 * tabs, components, or page reloads.
 *
 * This function is a pure expression extracted from FAB.tsx (was an
 * inline ternary). Extracting it serves two purposes:
 *   1. Single source of truth for the override-merge semantics.
 *   2. A stable import surface for the regression tests in
 *      FAB.rootPathOverride.test.ts that lock the three follow-up #5
 *      invariants.
 *
 * Contract:
 *   - override === null → return the input prefs by reference (preserves
 *     identity for downstream useEffect dependency arrays).
 *   - override is a string → return a NEW object with rootPath replaced
 *     and all other fields shallow-spread.
 *   - No side effects. No storage I/O. No chrome.runtime calls.
 */
export function mergeRootPathOverride(
    prefs: Preferences,
    override: string | null,
): Preferences {
    if (override === null) {
        return prefs;
    }
    return { ...prefs, rootPath: override };
}
