'use client';

import { Moon, Sun } from 'lucide-react';

import { usePCTheme } from '@/hooks/usePCTheme';

export function ThemeToggle() {
  const { isDark, toggle } = usePCTheme();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        border: '1px solid var(--pc-bd2)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={15} style={{ color: 'var(--pc-t2)' }} />
      ) : (
        <Moon size={15} style={{ color: 'var(--pc-t2)' }} />
      )}
    </button>
  );
}
