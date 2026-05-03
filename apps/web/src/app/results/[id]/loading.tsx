'use client';

import { FilmReel } from '@/app/loading/components/FilmReel';
import { palette } from '@/styles/designTokens';

/**
 * Suspense fallback for the /results/[id] segment.
 *
 * Next.js wraps the page in <Suspense> with this component as the fallback
 * whenever `cacheComponents` (PPR) is enabled in next.config.ts. Without it,
 * Next.js emits a "Blocking Route" warning because the client component
 * accesses dynamic data (useParams / useQuery) outside of a Suspense boundary.
 */
export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <div className="mb-10">
          <FilmReel />
        </div>

        <div className="w-full max-w-xs">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--pc-bd2)' }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                background: `linear-gradient(90deg, ${palette.gold}, ${palette.amber})`,
                width: '15%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
