import React, { useContext, createContext } from 'react';
import { translations, resolveLanguage, getTranslation, LanguageCode, TranslationDictionary } from './translations';
import { usePrefs } from './prefs';

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
// to the usePrefs() storage subscription as before.
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
    // null means 'no provider in tree, fall back to usePrefs()'.
    const ctxLanguage = useContext(PrefsLanguageContext);

    // usePrefs() is the single source of truth for chrome.storage.dh_prefs.
    // We always subscribe (Rules of Hooks: cannot call conditionally), but
    // when a Provider wraps the tree we ignore the storage value and use
    // ctxLanguage instead. This costs one extra subscriber when inside an
    // Options-style tree, but i18n storage events are rare (only on language
    // dropdown change) and usePrefs already de-dupes by memoising the prefs
    // object reference.
    const { prefs } = usePrefs();
    const storageLanguage: LanguageCode = prefs.language ?? 'auto';

    const effectiveLanguage: LanguageCode = ctxLanguage !== null ? ctxLanguage : storageLanguage;
    const resolvedLang = resolveLanguage(effectiveLanguage);

    const t = (key: string): string => {
        return getTranslation(key, resolvedLang);
    };

    return { t, language: effectiveLanguage };
}
