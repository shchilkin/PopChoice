import { FC } from 'react';
import { z } from 'zod';

import { ageRatings } from '../../utils/schemas/movieSchemas';

// Type for age rating values
type AgeRating = z.infer<typeof ageRatings>;

interface AgeRatingChipProps {
  rating: AgeRating;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Maps age ratings to semantic color token classes
 */
type RatingColorClasses = {
  background: string;
  text: string;
  border: string;
};

const RATING_COLOR_BY_GROUP: Record<string, RatingColorClasses> = {
  caution: {
    background: 'bg-[var(--rating-caution-bg)]',
    border: 'border-[var(--rating-caution-border)]',
    text: 'text-[var(--rating-caution-text)]',
  },
  mature: {
    background: 'bg-[var(--rating-mature-bg)]',
    border: 'border-[var(--rating-mature-border)]',
    text: 'text-[var(--rating-mature-text)]',
  },
  safe: {
    background: 'bg-[var(--rating-safe-bg)]',
    border: 'border-[var(--rating-safe-border)]',
    text: 'text-[var(--rating-safe-text)]',
  },
  teen: {
    background: 'bg-[var(--rating-teen-bg)]',
    border: 'border-[var(--rating-teen-border)]',
    text: 'text-[var(--rating-teen-text)]',
  },
  unknown: {
    background: 'bg-[var(--rating-unknown-bg)]',
    border: 'border-[var(--rating-unknown-border)]',
    text: 'text-[var(--rating-unknown-text)]',
  },
};

const RATING_GROUP_BY_VALUE: Record<string, keyof typeof RATING_COLOR_BY_GROUP> = {
  '12+': 'caution',
  '15': 'mature',
  '16+': 'mature',
  '18+': 'mature',
  G: 'safe',
  'NOT RATED': 'unknown',
  NR: 'unknown',
  PG: 'caution',
  'PG-13': 'teen',
  R: 'mature',
};

function getRatingColorClasses(rating: AgeRating): RatingColorClasses {
  const group = RATING_GROUP_BY_VALUE[rating.toUpperCase().trim()] ?? 'unknown';

  return RATING_COLOR_BY_GROUP[group];
}

/**
 * Gets size-specific classes for the chip
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  return SIZE_CLASSES[size];
}

const SIZE_CLASSES = {
  lg: 'px-4 py-2 text-base',
  md: 'px-4 py-1 text-sm',
  sm: 'px-4 py-0.5 text-xs',
};

/**
 * AgeRatingChip - A reusable component for displaying movie age ratings
 *
 * Uses semantic color tokens that work across light and dark themes:
 * - Light mode: Solid fill with no border
 * - Dark mode: Outline style with 1px border
 * - rating-safe-* (G ratings)
 * - rating-caution-* (PG, 12+ ratings)
 * - rating-teen-* (PG-13 ratings)
 * - rating-mature-* (R, 15, 16+, 18+ ratings)
 * - rating-unknown-* (NR, unrated content)
 */
export const AgeRatingChip: FC<AgeRatingChipProps> = ({ rating, size = 'md', className = '' }) => {
  const colorClasses = getRatingColorClasses(rating);
  const sizeClasses = getSizeClasses(size);

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-semibold rounded-full
        transition-colors duration-200
        border-solid
        ${colorClasses.background}
        ${colorClasses.text}
        ${colorClasses.border}
        ${sizeClasses}
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
      style={{
        borderWidth: `calc(var(--rating-border-width) * 1px)`,
      }}
      role="img"
      aria-label={`Age rating: ${rating}`}
      title={`Age rating: ${rating}`}
    >
      {rating}
    </span>
  );
};
