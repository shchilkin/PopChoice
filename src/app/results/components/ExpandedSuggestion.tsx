'use client';

import { Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

import { palette } from '@/styles/designTokens';

import { SimilarityBadge } from './SimilarityBadge';
import { StarRating } from './StarRating';

import type { MovieRecommendation } from '@/utils/client';

export function ExpandedSuggestion({ movie }: { movie: MovieRecommendation }) {
  const score = movie.score_rating ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden"
    >
      <div
        className="p-5 rounded-2xl mt-3"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid',
          borderColor: 'var(--pc-ai-bd)',
        }}
      >
        <div className="flex items-start gap-4">
          {movie.posterURL && (
            <div className="relative shrink-0 w-20 h-28 rounded-xl overflow-hidden">
              <Image
                src={movie.posterURL}
                alt={movie.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '1.3rem',
                    letterSpacing: '0.03em',
                    color: 'var(--pc-t1)',
                  }}
                >
                  {movie.name}
                </h3>
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}
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
                </div>
              </div>
              <SimilarityBadge similarity={movie.similarity} />
            </div>
            {score > 0 && <StarRating score={score} />}
          </div>
        </div>

        {movie.description && (
          <div
            className="mt-4 p-3.5 rounded-xl"
            style={{
              background: 'var(--pc-ai-bg)',
              border: '1px solid',
              borderColor: 'var(--pc-ai-bd)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={11} style={{ color: 'var(--pc-gold)' }} />
              <span
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold)', fontSize: '0.62rem' }}
              >
                Why this film
              </span>
            </div>
            <p
              style={{
                color: 'var(--pc-t2)',
                fontSize: '0.82rem',
                lineHeight: 1.7,
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
