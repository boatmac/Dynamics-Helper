import React, { useState, useEffect, useContext, createContext } from 'react';
import { translations, resolveLanguage, getTranslation, LanguageCode, TranslationDictionary } from './translations';

export { resolveLanguage, getTranslation };
export type { LanguageCode, TranslationDictionary };

// PrefsLanguageContext lets a React subtree publish its current language
// preference synchronously, decoupling translation from chrome.storage events.
//
// Why this exists: the Options page has its own React state for prefs.language
// (live, updated on every dropdown change). Before this context, every
// useTranslation() callsite re-read chrome.storage independently and only
// re-rendered after onChanged fired -- which only fires on Save. The result
// was a 'switch language -> nothing happens until Save' UX bug.
//
// FAB.tsx is unaffected: when no Provider wraps the tree the hook falls back
// to the storage-driven implementation as before.
export const PrefsLanguageContext = createContext<LanguageCode | null>(null);

export interface PrefsLanguageProviderProps {
    language: LanguageCode;
    children: React.ReactNode;
}

export function PrefsLanguageProvider({ language, children }: PrefsLanguageProviderProps) {
    return React.createElement(PrefsLanguageContext.Provider, { value: language }, children);
}

export function useTranslation() {
    // Context override: when present this wins over the storage-driven state.
    // null means 'no provider in tree, behave like before'.
    const ctxLanguage = useContext(PrefsLanguageContext);

    const [language, setLanguage] = useState<LanguageCode>('auto');
    const [resolvedLang, setResolvedLang] = useState<'en' | 'zh'>('en');

    useEffect(() => {
        // Only consult storage when no context is available. Inside the
        // Options tree the provider is the source of truth and we skip the
        // storage read+listener entirely.
        if (ctxLanguage !== null) {
            return;
        }

        // Load preference
        chrome.storage.local.get("dh_prefs", (result) => {
            const prefs = result.dh_prefs as any;
            if (prefs && prefs.language) {
                setLanguage(prefs.language);
            }
        });

        // Listen for changes
        const listener = (changes: any, area: string) => {
            if (area === 'local' && changes.dh_prefs) {
                const newPrefs = changes.dh_prefs.newValue;
                if (newPrefs && newPrefs.language) {
                    setLanguage(newPrefs.language);
                }
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, [ctxLanguage]);

    // Resolve 'auto' to actual language. When the context override is present
    // it takes priority over the storage-fed state on every render.
    const effectiveLanguage: LanguageCode = ctxLanguage !== null ? ctxLanguage : language;
    useEffect(() => {
        setResolvedLang(resolveLanguage(effectiveLanguage));
    }, [effectiveLanguage]);

    const t = (key: string): string => {
        return getTranslation(key, resolvedLang);
    };

    return { t, language: effectiveLanguage, setLanguage };
}
