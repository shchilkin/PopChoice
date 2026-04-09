'use client';

import { useTheme } from 'next-themes';

export function usePCTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const theme: 'dark' | 'light' = resolvedTheme === 'light' ? 'light' : 'dark';
  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return { theme, isDark, toggle, setTheme };
}
