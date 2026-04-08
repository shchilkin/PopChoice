'use client';

import { Clapperboard, Clock, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { usePCTheme } from '@/hooks/usePCTheme';

import { GenrePill } from './GenrePill';
import { SimilarityBadge } from './SimilarityBadge';
import { StarRating } from './StarRating';

import type { MovieRecommendation } from '@/utils/client';

export function MainMovieCard({ movie }: { movie: MovieRecommendation }) {
  const { isDark } = usePCTheme();
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const pct = Math.round(movie.similarity * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      {movie.posterURL && (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: imgLoaded ? 0 : 1,
              background: 'var(--pc-surface-deep)',
            }}
          />
          <img
            src={movie.posterURL}
            alt={movie.name}
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(to bottom, rgba(9,9,15,0.2) 0%, rgba(9,9,15,0.7) 60%, #13131F 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.6) 60%, #FFFFFF 100%)',
            }}
          />

          {/* Match badge */}
          <div className="absolute top-4 right-4">
            <SimilarityBadge similarity={movie.similarity} />
          </div>

          {/* AI pick label */}
          <div className="absolute top-4 left-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: isDark ? 'rgba(9,9,15,0.8)' : 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(245,197,24,0.25)',
                color: 'var(--pc-gold)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={10} />
              AI Pick
            </div>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h2
              className="mb-1"
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                letterSpacing: '0.04em',
                color: isDark ? '#FFFFFF' : '#0D0D1A',
                lineHeight: 1,
                textShadow: isDark
                  ? '0 2px 20px rgba(0,0,0,0.8)'
                  : '0 1px 8px rgba(255,255,255,0.8)',
              }}
            >
              {movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {movie.age_rating && (
                <>
                  <span>·</span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      border: '1px solid var(--pc-bd3)',
                      color: 'var(--pc-t2)',
                    }}
                  >
                    {movie.age_rating}
                  </span>
                </>
              )}
              {movie.duration && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {movie.duration} min
                  </span>
                </>
              )}
              {score > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Star size={11} fill="#F5C518" stroke="none" />
                    <span style={{ color: 'var(--pc-gold)' }}>{score}</span>/10
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 pt-4">
        {!movie.posterURL && (
          <div className="mb-4">
            <h2
              style={{
                fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.04em',
                color: 'var(--pc-t1)',
              }}
            >
              {movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap mt-1"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {movie.age_rating && (
                <>
                  <span>·</span>
                  <span>{movie.age_rating}</span>
                </>
              )}
              {movie.duration && (
                <>
                  <span>·</span>
                  <span>{movie.duration} min</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clapperboard size={13} style={{ color: 'var(--pc-t3)' }} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
              {movie.year} · {pct}% match
            </span>
          </div>
          {movie.age_rating && <GenrePill genre={movie.age_rating} />}
        </div>

        {score > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <StarRating score={score} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>{score}/10</span>
          </div>
        )}

        {/* AI description */}
        {movie.description && (
          <div
            className="p-4 rounded-2xl"
            style={{
              background: isDark ? 'rgba(245,197,24,0.05)' : 'rgba(196,149,10,0.05)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(196,149,10,0.15)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} style={{ color: 'var(--pc-gold)' }} />
              <span
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold)', fontSize: '0.65rem' }}
              >
                Why this film for you
              </span>
            </div>
            <p
              style={{
                color: 'var(--pc-t2)',
                fontSize: '0.88rem',
                lineHeight: 1.75,
              }}
            >
              {movie.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
