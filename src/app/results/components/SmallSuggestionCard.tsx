'use client';

import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { palette } from '@/styles/designTokens';

import type { MovieRecommendation } from '@/utils/client';

interface SmallSuggestionCardProps {
  movie: MovieRecommendation;
  active: boolean;
  onClick: () => void;
}

export function SmallSuggestionCard({ movie, active, onClick }: SmallSuggestionCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const pct = Math.round(movie.similarity * 100);

  return (
    <motion.div
      layout
      onClick={onClick}
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
            <img
              src={movie.posterURL}
              alt={movie.name}
              className="w-full h-full object-cover"
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
        <div className="absolute top-2 right-2">
          <div
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(9,9,15,0.85)',
              border: '1px solid rgba(245,197,24,0.2)',
              color: palette.gold,
              backdropFilter: 'blur(6px)',
            }}
          >
            {pct}%
          </div>
        </div>
      </div>

      <div className="p-3.5">
        <h4
          className="mb-1 truncate"
          style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          {movie.name}
        </h4>
        <div
          className="flex items-center gap-2 mb-2 flex-wrap"
          style={{ color: 'var(--pc-t3)', fontSize: '0.75rem' }}
        >
          <span>{movie.year}</span>
          {movie.age_rating && (
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
          {movie.duration && (
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
