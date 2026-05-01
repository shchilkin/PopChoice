'use client';

import { motion, useReducedMotion } from 'motion/react';

// App Router template.tsx re-mounts on every navigation (unlike layout.tsx),
// so AnimatePresence / enter animations work correctly here.
export default function StyleGuideTemplate({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
