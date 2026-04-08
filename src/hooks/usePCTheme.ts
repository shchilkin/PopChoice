'use client';

import { useTheme } from 'next-themes';

export function usePCTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return { theme: resolvedTheme as 'dark' | 'light', isDark, toggle, setTheme };
}
