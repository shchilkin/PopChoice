'use client';

import { Sparkles } from 'lucide-react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';
import { scaleSimilarity } from '@/utils/ui';

export function SimilarityBadge({ similarity }: { similarity: number }) {
  const { t } = useLanguage();
  const pct = scaleSimilarity(similarity);
  const color =
    pct >= 95
      ? palette.teal
      : pct >= 90
        ? palette.gold
        : pct >= 85
          ? palette.amber
          : palette.purple;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}35`,
        color,
      }}
    >
      <Sparkles size={10} />
      {pct}% {t.results.match}
    </div>
  );
}
