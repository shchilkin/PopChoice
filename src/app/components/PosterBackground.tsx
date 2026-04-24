'use client';

import { motion } from 'motion/react';

import { useIsMobile } from '@/hooks/useIsMobile';
import { usePosterPosters } from '@/hooks/usePosterPosters';

// 8 cols × 5 rows = 40 cells on desktop (5 rows covers tall viewports after scale).
// Mobile uses 5 columns so 40 cells = 8 rows — more than enough coverage.
const CELL_COUNT = 40;

interface PosterBackgroundProps {
  /** Pre-fetched poster URLs for SSR hydration (optional). */
  posters?: string[];
}

/**
 * Full-viewport movie poster grid for the hero section background.
 *
 * Two absolutely-positioned layers:
 *  1. Grid layer  — blurred/dimmed poster grid with a slow motion drift.
 *  2. Overlay div — radial gradient (dark edges); no filter applied to it.
 */
export function PosterBackground({ posters: initialPosters }: PosterBackgroundProps) {
  const posters = usePosterPosters(initialPosters);
  const isMobile = useIsMobile();
  // Treat null (pre-measurement) as desktop to avoid rotation flash on mobile
  const mobile = isMobile === true;

  const cells = Array.from({ length: CELL_COUNT }, (_, i) => posters[i % posters.length]);

  return (
    <>
      {/* Layer 1: filter applied to this wrapper only, not the overlay */}
      <div
        aria-hidden="true"
        className={[
          'absolute -inset-5 pointer-events-none',
          // Mobile: softer blur, desaturated to match cream palette
          'blur-[1px] brightness-[0.8] saturate-[0.9]',
          // Desktop: sharper and more vivid
          'sm:blur-[2px]',
          // Dark mode overrides
          'dark:brightness-[0.65] dark:saturate-[1.3]',
        ].join(' ')}
      >
        <motion.div
          className="w-full grid grid-cols-5 sm:grid-cols-8"
          style={{
            rotate: mobile ? 0 : -4,
            scale: mobile ? 1 : 1.15,
          }}
          animate={{ y: -20 }}
          transition={{
            duration: 30,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'mirror',
          }}
        >
          {cells.map((src, i) => (
            <div key={i} className="overflow-hidden aspect-2/3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Layer 2: radial gradient overlay — separate div, intentionally no filter */}
      <div
        aria-hidden="true"
        className={[
          'absolute inset-0 pointer-events-none',
          // Light mode: fade edges to cream background colour
          'bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(247,245,238,0.05)_0%,rgba(247,245,238,0.82)_100%)]',
          // Dark mode: fade edges to dark background colour
          'dark:bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(9,9,15,0.05)_0%,rgba(9,9,15,0.70)_100%)]',
        ].join(' ')}
      />
    </>
  );
}
