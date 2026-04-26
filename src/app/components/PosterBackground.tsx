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
 * Three absolutely-positioned layers:
 *  1. Grid layer   — animated (y drift), no CSS filter (Safari GPU fix).
 *  2. Blur layer   — static backdrop-filter sibling; blurs/dims the grid at
 *                    compositing time so Safari never re-rasterises per frame.
 *  3. Overlay div  — radial gradient; fades edges to background colour.
 */
export function PosterBackground({ posters: initialPosters }: PosterBackgroundProps) {
  const posters = usePosterPosters(initialPosters);
  const isMobile = useIsMobile();
  // Treat null (pre-measurement) as desktop to avoid rotation flash on mobile
  const mobile = isMobile === true;

  const cells = Array.from({ length: CELL_COUNT }, (_, i) => posters[i % posters.length]);

  return (
    <>
      {/* Layer 1: grid — zero CSS filters on the animated element.
          Chrome/Safari can promote this to a GPU layer and move it without
          any per-frame rasterisation. */}
      <div aria-hidden="true" className="absolute -inset-5 pointer-events-none">
        <motion.div
          className="w-full grid grid-cols-5 sm:grid-cols-8"
          style={{
            rotate: mobile ? 0 : -4,
            scale: mobile ? 1 : 1.15,
            willChange: 'transform',
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
                // key change on src remounts the element, resetting opacity-0
                // so the SVG→real-poster swap fades in rather than snapping.
                key={src}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover opacity-0 transition-opacity duration-700"
                onLoad={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '1';
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Layer 2: backdrop-filter blur/dim — static sibling, not a parent/child
          of the animated grid. Applied at GPU compositing time, so Safari never
          has to re-rasterise the filtered content on every animation frame. */}
      <div
        aria-hidden="true"
        className={[
          'absolute -inset-5 pointer-events-none',
          'backdrop-blur-[1px] backdrop-brightness-[0.8] backdrop-saturate-[0.9]',
          'sm:backdrop-blur-[2px]',
          'dark:backdrop-brightness-[0.65] dark:backdrop-saturate-[1.3]',
        ].join(' ')}
      />

      {/* Layer 3: radial gradient overlay — separate div, intentionally no filter */}
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
