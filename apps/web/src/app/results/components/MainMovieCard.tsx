'use client';

import { Clapperboard, Clock, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';
import { scaleSimilarity } from '@/utils/ui';

import { AgeRatingPill } from './AgeRatingPill';
import { MarkdownText } from './MarkdownText';
import { SimilarityBadge } from './SimilarityBadge';
import { StarRating } from './StarRating';

import type { MovieRecommendation } from '@/utils/client';

export function MainMovieCard({ movie }: { movie: MovieRecommendation }) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const score = movie.score_rating ?? 0;
  const pct = scaleSimilarity(movie.similarity);
  const hasRating = !!movie.age_rating && movie.age_rating !== 'NR';

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
          <Image
            src={movie.posterURL}
            alt={movie.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover transition-opacity duration-700"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'var(--pc-poster-grad)',
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
                background: 'var(--pc-overlay-bg)',
                border: `1px solid ${palette.gold}40`,
                color: 'var(--pc-gold-text)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={10} />
              {t.results.aiPick}
            </div>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h2
              className="mb-1"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontWeight: '600',
                textTransform: 'uppercase',
                fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                letterSpacing: '0.04em',
                color: 'var(--pc-overlay-text)',
                lineHeight: 1,
                textShadow: 'var(--pc-overlay-shadow)',
              }}
            >
              {movie.localizedName ?? movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {hasRating && (
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
              {(movie.duration ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {movie.duration} {t.results.minUnit}
                  </span>
                </>
              )}
              {score > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Star size={11} fill={palette.gold} stroke="none" />
                    <span style={{ color: 'var(--pc-gold-text)' }}>{score}</span>/10
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
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontWeight: '600',
                textTransform: 'uppercase',
                fontSize: '2rem',
                letterSpacing: '0.04em',
                color: 'var(--pc-t1)',
              }}
            >
              {movie.localizedName ?? movie.name}
            </h2>
            <div
              className="flex items-center gap-3 flex-wrap mt-1"
              style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
            >
              <span>{movie.year}</span>
              {hasRating && (
                <>
                  <span>·</span>
                  <span>{movie.age_rating}</span>
                </>
              )}
              {(movie.duration ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {movie.duration} {t.results.minUnit}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clapperboard size={13} style={{ color: 'var(--pc-t3)' }} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
              {movie.year} · {pct}% {t.results.match}
            </span>
          </div>
          {hasRating && <AgeRatingPill label={movie.age_rating!} />}
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
              background: 'var(--pc-ai-bg)',
              border: '1px solid',
              borderColor: 'var(--pc-ai-bd)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} style={{ color: 'var(--pc-gold-text)' }} />
              <span
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold-text)', fontSize: '0.65rem' }}
              >
                {t.results.whyThisFilmForYou}
              </span>
            </div>
            <p
              style={{
                color: 'var(--pc-t2)',
                fontSize: '0.88rem',
                lineHeight: 1.75,
              }}
            >
              <MarkdownText text={movie.description ?? ''} />
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
