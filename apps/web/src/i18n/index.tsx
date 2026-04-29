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
// Module-level store starts at 'en' so both the server snapshot and the initial
// client snapshot agree — no hydration mismatch. After the component mounts,
// detectLocale() reads localStorage/navigator and calls notifyLocaleChange(),
// which triggers useSyncExternalStore to re-render with the real locale.
let localeStore: Locale = 'en';
const localeListeners = new Set<() => void>();

function subscribeLocale(callback: () => void): () => void {
  localeListeners.add(callback);
  return () => {
    localeListeners.delete(callback);
  };
}

function getLocaleSnapshot(): Locale {
  return localeStore;
}

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  const browserLangs = navigator.languages ?? [navigator.language];
  const detected = browserLangs
    .map((l) => l.split('-')[0].toLowerCase())
    .find((l) => (LOCALES as string[]).includes(l));
  return (detected as Locale) ?? 'en';
}

function notifyLocaleChange(): void {
  localeListeners.forEach((cb) => cb());
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
  // Both server and initial client snapshot return 'en' — no hydration mismatch.
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot);

  const setLocale = useCallback((newLocale: Locale) => {
    localeStore = newLocale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // Ignore storage persistence failures so the UI locale still updates.
    }
    notifyLocaleChange();
  }, []);

  useEffect(() => {
    // After hydration, apply the real locale from localStorage/navigator.
    // Mutates the module-level store and notifies useSyncExternalStore —
    // this is not a React setState call, so it satisfies react-hooks/set-state-in-effect.
    const detected = detectLocale();
    if (detected !== localeStore) {
      localeStore = detected;
      notifyLocaleChange();
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === LOCALE_STORAGE_KEY) {
        localeStore = detectLocale();
        notifyLocaleChange();
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
