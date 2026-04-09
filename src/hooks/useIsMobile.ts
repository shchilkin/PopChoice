'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind `sm` breakpoint

/**
 * Returns true when the viewport is narrower than the Tailwind `sm` breakpoint (640 px),
 * false when it is wider, and null before the first client-side measurement is available
 * (i.e., during SSR and before hydration).  Consumers should render nothing or a neutral
 * skeleton while the value is null to avoid a layout flash caused by serving the wrong
 * layout to mobile visitors.
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
