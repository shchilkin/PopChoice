'use client';

import { useTheme } from 'next-themes';

export function usePCTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const theme = (resolvedTheme ?? 'dark') as 'dark' | 'light';
  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return { theme, isDark, toggle, setTheme };
}
