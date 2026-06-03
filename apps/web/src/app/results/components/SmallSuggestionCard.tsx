'use client';

import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';
import { getSimilarityTier } from '@/utils/ui';

import type { MovieRecommendation } from '@/utils/client';

interface SmallSuggestionCardProps {
  movie: MovieRecommendation;
  active: boolean;
  onClick: () => void;
}

export function SmallSuggestionCard({ movie, active, onClick }: SmallSuggestionCardProps) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const { pct, tier } = getSimilarityTier(movie.similarity);
  const matchLabel = t.results.matchTiers[tier];
  const matchExactLabel = t.results.matchTierExact.replace('{pct}', String(pct));
  const hasRating = !!movie.age_rating && movie.age_rating !== 'NR';

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={active}
      aria-label={movie.name}
      className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300"
      style={{
        background: 'var(--pc-surface)',
        border: active ? '1.5px solid rgba(245,197,24,0.4)' : '1px solid var(--pc-bd2)',
        boxShadow: active ? '0 0 30px rgba(245,197,24,0.1)' : 'none',
        minWidth: '220px',
        maxWidth: '260px',
        flex: '0 0 auto',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="relative h-36 overflow-hidden">
        {movie.posterURL ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: 'var(--pc-surface-deep)',
                opacity: imgLoaded ? 0 : 1,
              }}
            />
            <Image
              src={movie.posterURL}
              alt={movie.name}
              fill
              sizes="260px"
              className="object-cover"
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
            />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: 'var(--pc-surface-deep)' }}
          >
            🎬
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, var(--pc-surface) 100%)',
          }}
        />
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <div
            className="text-xs px-2 py-0.5 rounded-full"
            title={matchExactLabel}
            aria-label={`${matchLabel}. ${matchExactLabel}`}
            style={{
              background: 'rgba(9,9,15,0.85)',
              border: '1px solid rgba(245,197,24,0.2)',
              color: palette.gold,
              backdropFilter: 'blur(6px)',
            }}
          >
            {matchLabel}
          </div>
          {movie.fromTMDB && (
            <div
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(9,9,15,0.85)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--pc-t3)',
                backdropFilter: 'blur(6px)',
              }}
            >
              TMDB
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <h4
          className="mb-1 truncate"
          style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          {movie.localizedName ?? movie.name}
        </h4>
        <div
          className="flex items-center gap-2 mb-2 flex-wrap"
          style={{ color: 'var(--pc-t3)', fontSize: '0.75rem' }}
        >
          <span>{movie.year}</span>
          {hasRating && (
            <>
              <span>·</span>
              <span>{movie.age_rating}</span>
            </>
          )}
          {score > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Star size={10} fill={palette.gold} stroke="none" />
                {score}
              </span>
            </>
          )}
          {(movie.duration ?? 0) > 0 && (
            <>
              <span>·</span>
              <span>{movie.duration}m</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
