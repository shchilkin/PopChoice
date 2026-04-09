'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { en, type Translations } from './locales/en';
import { fi } from './locales/fi';
import { ru } from './locales/ru';

export type Locale = 'en' | 'ru' | 'fi';

const LOCALE_STORAGE_KEY = 'popchoice_locale';

const LOCALES: Locale[] = ['en', 'ru', 'fi'];

const translations: Record<Locale, Translations> = { en, ru, fi };

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
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && (LOCALES as string[]).includes(saved)) {
      setLocaleState(saved as Locale);
      return;
    }
    // Detect browser language on first visit
    const browserLangs = navigator.languages ?? [navigator.language];
    const detected = browserLangs
      .map((l) => l.split('-')[0].toLowerCase())
      .find((l) => (LOCALES as string[]).includes(l));
    if (detected) {
      setLocaleState(detected as Locale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  const currentTranslations =
    locale === 'ru' ? translations.ru : locale === 'fi' ? translations.fi : translations.en;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: currentTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
