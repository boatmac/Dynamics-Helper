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
