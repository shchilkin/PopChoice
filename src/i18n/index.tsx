'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { en, type Translations } from './locales/en';
import { fi } from './locales/fi';
import { ru } from './locales/ru';

export type Locale = 'en' | 'ru' | 'fi';

const LOCALE_STORAGE_KEY = 'popchoice_locale';

const LOCALES: Locale[] = ['en', 'ru', 'fi'];

const translations: Record<Locale, Translations> = { en, ru, fi };

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  const browserLangs = navigator.languages ?? [navigator.language];
  const detected = browserLangs
    .map((l) => l.split('-')[0].toLowerCase())
    .find((l) => (LOCALES as string[]).includes(l));
  return (detected as Locale) ?? 'en';
}

// ── Context ───────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with 'en' to match the server snapshot and avoid hydration mismatches.
  // After mount, read from localStorage / navigator and apply the real locale.
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    setLocaleState(detectLocale());

    function handleStorage(e: StorageEvent) {
      if (e.key === LOCALE_STORAGE_KEY) {
        setLocaleState(detectLocale());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const currentTranslations = translations[locale] ?? translations.en;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: currentTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
