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
function getRatingColorClasses(rating: AgeRating): {
  background: string;
  text: string;
} {
  const normalizedRating = rating.toUpperCase().trim();

  switch (normalizedRating) {
    // Safe content - Green (G rating)
    case 'G':
      return {
        background: 'bg-[var(--rating-safe-bg)]',
        text: 'text-[var(--rating-safe-text)]',
      };

    // Caution content - Blue (PG, 12+ ratings)
    case 'PG':
    case '12+':
      return {
        background: 'bg-[var(--rating-caution-bg)]',
        text: 'text-[var(--rating-caution-text)]',
      };

    // Teen content - Orange (PG-13 rating)
    case 'PG-13':
      return {
        background: 'bg-[var(--rating-teen-bg)]',
        text: 'text-[var(--rating-teen-text)]',
      };

    // Mature content - Red (R, 15, 16+, 18+ ratings)
    case 'R':
    case '15':
    case '16+':
    case '18+':
      return {
        background: 'bg-[var(--rating-mature-bg)]',
        text: 'text-[var(--rating-mature-text)]',
      };

    // Unknown/Unrated - Gray (NR, NOT RATED)
    case 'NR':
    case 'NOT RATED':
    default:
      return {
        background: 'bg-[var(--rating-unknown-bg)]',
        text: 'text-[var(--rating-unknown-text)]',
      };
  }
}

/**
 * Gets size-specific classes for the chip
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'px-4 py-0.5 text-xs';
    case 'lg':
      return 'px-4 py-2 text-base';
    case 'md':
    default:
      return 'px-4 py-1 text-sm';
  }
}

/**
 * AgeRatingChip - A reusable component for displaying movie age ratings
 *
 * Uses semantic color tokens that work across light and dark themes:
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
        ${colorClasses.background}
        ${colorClasses.text}
        ${sizeClasses}
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
      role="img"
      aria-label={`Age rating: ${rating}`}
      title={`Age rating: ${rating}`}
    >
      {rating}
    </span>
  );
};
