'use client';

import dynamic from 'next/dynamic';
import { createElement } from 'react';

// Rendered client-side only: next-themes requires DOM to resolve the theme,
// so skipping SSR avoids hydration mismatches without a mounted-state guard.
export const ThemeToggle = dynamic(
  () => import('./ThemeToggle').then((mod) => ({ default: mod.ThemeToggle })),
  { ssr: false, loading: () => createElement('div', { className: 'w-9 h-9' }) },
);
