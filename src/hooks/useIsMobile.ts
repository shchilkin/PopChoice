'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind `sm` breakpoint

/**
 * Returns true when the viewport is narrower than the Tailwind `sm` breakpoint (640 px).
 * Initialises synchronously to false to avoid layout shift on desktop SSR.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
