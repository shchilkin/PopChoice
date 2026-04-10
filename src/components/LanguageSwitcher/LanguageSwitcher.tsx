'use client';

import { ChevronDown } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { type Locale, useLanguage } from '@/i18n';

const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'ru', label: 'RU', native: 'Русский' },
  { code: 'fi', label: 'FI', native: 'Suomi' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.switchLanguage}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
        style={{
          background: open ? 'var(--pc-gold-subtle)' : 'transparent',
          color: open ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
          border: open ? '1px solid var(--pc-gold-bd-subtle)' : '1px solid var(--pc-bd1)',
        }}
      >
        {current.label}
        <ChevronDown
          size={12}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.nav.switchLanguage}
          className="absolute right-0 mt-1.5 min-w-[120px] rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {LOCALES.map(({ code, label, native }) => {
            const isActive = code === locale;
            return (
              <button
                key={code}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors duration-100"
                style={{
                  background: isActive ? 'var(--pc-gold-subtle)' : 'transparent',
                  color: isActive ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span
                  className="w-6 text-center font-semibold"
                  style={{
                    color: isActive ? 'var(--pc-gold-text)' : 'var(--pc-t4)',
                    fontSize: '0.7rem',
                  }}
                >
                  {label}
                </span>
                <span>{native}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
