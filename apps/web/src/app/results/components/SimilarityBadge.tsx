'use client';

import { Sparkles } from 'lucide-react';

import { useLanguage } from '@/i18n';

import { buildResultMatchViewModel } from './resultMovieCardViewModel';

export function SimilarityBadge({
  tone = 'default',
  similarity,
  compact = false,
}: {
  tone?: 'default' | 'poster';
  similarity: number;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const match = buildResultMatchViewModel(similarity, t.results);
  const style =
    tone === 'poster'
      ? {
          background: 'var(--pc-poster-chip-bg)',
          border: '1px solid var(--pc-poster-chip-bd)',
          color: 'var(--pc-poster-chip-accent)',
          backdropFilter: 'blur(10px)',
        }
      : {
          background: `${match.color}18`,
          border: `1px solid ${match.color}35`,
          color: match.color,
        };

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      title={match.exactLabel}
      aria-label={`${match.label}. ${match.exactLabel}`}
      style={style}
    >
      {!compact && <Sparkles size={10} />}
      {match.label}
    </div>
  );
}
