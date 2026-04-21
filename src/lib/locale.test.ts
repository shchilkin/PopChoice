import { describe, expect, it } from 'vitest';

import {
  LOCALE_LANGUAGE,
  LOCALE_TO_TMDB_LANG,
  SUPPORTED_LOCALES,
  parseLocale,
  parseLocaleFromRequest,
  type Locale,
} from './locale';

describe('SUPPORTED_LOCALES', () => {
  it('contains en, ru, fi', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('ru');
    expect(SUPPORTED_LOCALES).toContain('fi');
  });
});

describe('LOCALE_LANGUAGE', () => {
  it('covers every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_LANGUAGE[locale as Locale]).toBeDefined();
    }
  });
});

describe('LOCALE_TO_TMDB_LANG', () => {
  it('covers every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_TO_TMDB_LANG[locale as Locale]).toBeDefined();
    }
  });

  it('maps en to en-US', () => {
    expect(LOCALE_TO_TMDB_LANG['en']).toBe('en-US');
  });
});

describe('parseLocale', () => {
  it('parses simple locale codes', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('ru')).toBe('ru');
    expect(parseLocale('fi')).toBe('fi');
  });

  it('parses real-world Accept-Language header with quality values', () => {
    expect(parseLocale('ru-RU,ru;q=0.9,en-US;q=0.8')).toBe('ru');
    expect(parseLocale('en-US,en;q=0.9')).toBe('en');
    expect(parseLocale('fi-FI,fi;q=0.9')).toBe('fi');
  });

  it('falls back to en for unsupported locales', () => {
    expect(parseLocale('de')).toBe('en');
    expect(parseLocale('fr-FR,fr;q=0.9')).toBe('en');
    expect(parseLocale('zh-CN')).toBe('en');
  });

  it('falls back to en for an empty string', () => {
    expect(parseLocale('')).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(parseLocale('EN')).toBe('en');
    expect(parseLocale('RU-RU,RU;q=0.9')).toBe('ru');
  });
});

describe('parseLocaleFromRequest', () => {
  function makeRequest(acceptLanguage: string | null): Request {
    const headers: Record<string, string> = {};
    if (acceptLanguage !== null) {
      headers['accept-language'] = acceptLanguage;
    }
    return new Request('http://localhost/api/test', { headers });
  }

  it('reads the Accept-Language header and returns a locale', () => {
    expect(parseLocaleFromRequest(makeRequest('ru-RU,ru;q=0.9') as never)).toBe('ru');
    expect(parseLocaleFromRequest(makeRequest('fi') as never)).toBe('fi');
  });

  it('falls back to en when the header is absent', () => {
    expect(parseLocaleFromRequest(makeRequest(null) as never)).toBe('en');
  });

  it('falls back to en for an unsupported language', () => {
    expect(parseLocaleFromRequest(makeRequest('de') as never)).toBe('en');
  });
});
