import { NextRequest } from 'next/server';

export const SUPPORTED_LOCALES = ['en', 'ru', 'fi'] as const;

/** Supported locale codes — derived from SUPPORTED_LOCALES so the type and list stay in sync. */
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Maps a locale code to the full language name used in LLM prompts. */
export const LOCALE_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  fi: 'Finnish',
};

/** Maps a locale code to the TMDB language tag (BCP 47). */
export const LOCALE_TO_TMDB_LANG: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  fi: 'fi-FI',
};

/**
 * Parse a raw `Accept-Language` header value into a supported locale.
 * Handles real-world values like "ru-RU,ru;q=0.9,en-US;q=0.8".
 * Falls back to `'en'` when the primary language is unsupported.
 */
export function parseLocale(acceptLanguage: string): Locale {
  const primaryLang = acceptLanguage.split(',')[0].split(';')[0].split('-')[0].toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(primaryLang)
    ? (primaryLang as Locale)
    : 'en';
}

/**
 * Convenience wrapper that reads the `Accept-Language` header from a
 * Next.js `NextRequest` and returns a supported locale.
 */
export function parseLocaleFromRequest(req: NextRequest): Locale {
  const acceptLanguage = req.headers.get('accept-language') ?? 'en';
  return parseLocale(acceptLanguage);
}
