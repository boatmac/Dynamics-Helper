import { useState, useEffect } from 'react';
import { translations, resolveLanguage, getTranslation, LanguageCode, TranslationDictionary } from './translations';

export { resolveLanguage, getTranslation };
export type { LanguageCode, TranslationDictionary };

export function useTranslation() {
    const [language, setLanguage] = useState<LanguageCode>('auto');
    const [resolvedLang, setResolvedLang] = useState<'en' | 'zh'>('en');

    useEffect(() => {
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
    }, []);

    // Resolve 'auto' to actual language
    useEffect(() => {
        setResolvedLang(resolveLanguage(language));
    }, [language]);

    const t = (key: string): string => {
        return getTranslation(key, resolvedLang);
    };

    return { t, language, setLanguage };
}
