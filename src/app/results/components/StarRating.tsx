import { Star } from 'lucide-react';

import { palette } from '@/styles/designTokens';

export function StarRating({ score }: { score: number }) {
  const stars = 5;
  const filled = Math.round((score / 10) * stars);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < filled ? palette.gold : 'none'}
          stroke={i < filled ? palette.gold : 'var(--pc-t4)'}
        />
      ))}
    </div>
  );
}
