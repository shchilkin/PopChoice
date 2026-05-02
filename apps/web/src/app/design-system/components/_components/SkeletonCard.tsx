import { SmallSuggestionCard } from '@/app/results/components/SmallSuggestionCard';

import type { MovieRecommendation } from '@/utils/client';

export function SkeletonCard({
  loading,
  movie,
}: {
  loading: boolean;
  movie?: MovieRecommendation;
}) {
  if (!loading && movie) {
    return <SmallSuggestionCard movie={movie} active={false} onClick={() => {}} />;
  }
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)', width: 220 }}
    >
      <div className="h-32 animate-pulse" style={{ background: 'var(--pc-surface-deep)' }} />
      <div className="p-3 space-y-2">
        <div
          className="h-3 rounded animate-pulse"
          style={{ width: '70%', background: 'var(--pc-bd2)' }}
        />
        <div
          className="h-2.5 rounded animate-pulse"
          style={{ width: '40%', background: 'var(--pc-bd1)' }}
        />
        <div className="flex gap-2 mt-1">
          <div
            className="h-2.5 rounded-full animate-pulse"
            style={{ width: 48, background: 'var(--pc-bd2)' }}
          />
          <div
            className="h-2.5 rounded-full animate-pulse"
            style={{ width: 32, background: 'var(--pc-bd1)' }}
          />
        </div>
      </div>
    </div>
  );
}
