'use client';

import { type Locale, useLanguage } from '@/i18n';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'fi', label: 'FI' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="flex items-center gap-0.5">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          aria-label={`${t.nav.toggleTheme} — ${label}`}
          aria-pressed={locale === code}
          className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors duration-150"
          style={{
            background: locale === code ? 'var(--pc-gold-subtle)' : 'transparent',
            color: locale === code ? 'var(--pc-gold)' : 'var(--pc-t4)',
            border: locale === code ? '1px solid var(--pc-gold-bd-subtle)' : '1px solid transparent',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
