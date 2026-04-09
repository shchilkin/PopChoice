'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { en, type Translations } from './locales/en';
import { fi } from './locales/fi';
import { ru } from './locales/ru';

export type Locale = 'en' | 'ru' | 'fi';

const LOCALE_STORAGE_KEY = 'popchoice_locale';

const LOCALES: Locale[] = ['en', 'ru', 'fi'];

const translations: Record<Locale, Translations> = { en, ru, fi };

// ── Locale store ──────────────────────────────────────────────────────────────
// Module-level set keeps references stable across renders so useSyncExternalStore
// does not re-subscribe on every render.
const localeListeners = new Set<() => void>();

function subscribeLocale(callback: () => void): () => void {
  localeListeners.add(callback);
  window.addEventListener('storage', callback); // cross-tab sync
  return () => {
    localeListeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function getClientLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  const browserLangs = navigator.languages ?? [navigator.language];
  const detected = browserLangs
    .map((l) => l.split('-')[0].toLowerCase())
    .find((l) => (LOCALES as string[]).includes(l));
  return (detected as Locale) ?? 'en';
}

function getServerLocale(): Locale {
  return 'en';
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
  const locale = useSyncExternalStore(subscribeLocale, getClientLocale, getServerLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    localeListeners.forEach((cb) => cb());
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
