'use client';

import { ChevronDown } from 'lucide-react';
import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from 'react';

import { type Locale, useLanguage } from '@/i18n';

type LocaleOption = { code: Locale; label: string; native: string };

const LOCALES: LocaleOption[] = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'ru', label: 'RU', native: 'Русский' },
  { code: 'fi', label: 'FI', native: 'Suomi' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  useOutsideClose(ref, open, () => setOpen(false));

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <LanguageToggleButton
        current={current}
        label={t.nav.switchLanguage}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      />

      {open && (
        <LanguageMenu
          activeLocale={locale}
          label={t.nav.switchLanguage}
          onSelect={(code) => {
            setLocale(code);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function useOutsideClose(
  ref: RefObject<HTMLDivElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, open, ref]);
}

function LanguageToggleButton({
  current,
  label,
  onToggle,
  open,
}: {
  current: LocaleOption;
  label: string;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
      style={getToggleButtonStyle(open)}
    >
      {current.label}
      <ChevronDown size={12} style={getChevronStyle(open)} />
    </button>
  );
}

function LanguageMenu({
  activeLocale,
  label,
  onSelect,
}: {
  activeLocale: Locale;
  label: string;
  onSelect: (code: Locale) => void;
}) {
  return (
    <div
      role="menu"
      aria-label={label}
      className="absolute right-0 mt-1.5 min-w-[120px] rounded-xl overflow-hidden z-50"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      {LOCALES.map((option) => (
        <LanguageMenuItem
          key={option.code}
          active={option.code === activeLocale}
          option={option}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function LanguageMenuItem({
  active,
  option,
  onSelect,
}: {
  active: boolean;
  option: LocaleOption;
  onSelect: (code: Locale) => void;
}) {
  const styles = getLanguageMenuItemStyles(active);

  return (
    <button
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(option.code)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors duration-100"
      style={styles.button}
    >
      <span className="w-6 text-center font-semibold" style={styles.label}>
        {option.label}
      </span>
      <span>{option.native}</span>
    </button>
  );
}

function getChevronStyle(open: boolean) {
  return {
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.15s ease',
  };
}

function getToggleButtonStyle(open: boolean) {
  return {
    background: getActiveValue(open, 'var(--pc-gold-subtle)', 'transparent'),
    border: getActiveValue(open, '1px solid var(--pc-gold-bd-subtle)', '1px solid var(--pc-bd1)'),
    color: getActiveValue(open, 'var(--pc-gold-text)', 'var(--pc-t3)'),
  };
}

function getLanguageMenuItemStyles(active: boolean) {
  return {
    button: {
      background: getActiveValue(active, 'var(--pc-gold-subtle)', 'transparent'),
      color: getActiveValue(active, 'var(--pc-gold-text)', 'var(--pc-t2)'),
      fontWeight: getActiveValue(active, 600, 400),
    },
    label: {
      color: getActiveValue(active, 'var(--pc-gold-text)', 'var(--pc-t4)'),
      fontSize: '0.7rem',
    },
  };
}

function getActiveValue<T>(active: boolean, activeValue: T, inactiveValue: T) {
  return active ? activeValue : inactiveValue;
}
