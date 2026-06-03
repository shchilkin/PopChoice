'use client';

import { Sparkles } from 'lucide-react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';
import { getSimilarityTier } from '@/utils/ui';

export function SimilarityBadge({
  similarity,
  compact = false,
}: {
  similarity: number;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const { pct, tier } = getSimilarityTier(similarity);
  const color =
    tier === 'strong'
      ? palette.teal
      : tier === 'good'
        ? palette.gold
        : tier === 'possible'
          ? palette.amber
          : palette.purple;
  const label = t.results.matchTiers[tier];
  const exactLabel = t.results.matchTierExact.replace('{pct}', String(pct));

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      title={exactLabel}
      aria-label={`${label}. ${exactLabel}`}
      style={{
        background: `${color}18`,
        border: `1px solid ${color}35`,
        color,
      }}
    >
      {!compact && <Sparkles size={10} />}
      {label}
    </div>
  );
}
