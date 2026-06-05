import { palette } from '@/styles/designTokens';
import { getSimilarityTier } from '@/utils/ui';

import type { Translations } from '@/i18n/locales/en';
import type { MovieRecommendation } from '@/utils/client';

export type ResultMovieMetaKind = 'text' | 'rating' | 'duration' | 'score';

export interface ResultMovieMetaItem {
  kind: ResultMovieMetaKind;
  label: string;
}

export interface ResultMovieCardViewModel {
  aiPickLabel: string;
  description: string;
  duration: number;
  durationWithUnit: string;
  durationShort: string;
  hasDescription: boolean;
  hasDuration: boolean;
  hasPoster: boolean;
  hasRating: boolean;
  hasScore: boolean;
  matchColor: string;
  matchExactLabel: string;
  matchLabel: string;
  posterUrl?: string;
  rationaleLabel: string;
  score: number;
  title: string;
  year: string | number;
  compactMetaItems: ResultMovieMetaItem[];
  expandedMetaItems: ResultMovieMetaItem[];
  overlayMetaItems: ResultMovieMetaItem[];
  plainMetaItems: ResultMovieMetaItem[];
}

type ResultsCopy = Translations['results'];

export interface ResultMatchViewModel {
  color: string;
  exactLabel: string;
  label: string;
}

const MATCH_TIER_COLORS = {
  strong: palette.teal,
  good: palette.gold,
  possible: palette.amber,
  wildcard: palette.purple,
} as const;

export function buildResultMovieCardViewModel(
  movie: MovieRecommendation,
  copy: ResultsCopy,
  options: { isGroup?: boolean; rationaleVariant?: 'main' | 'expanded' } = {},
): ResultMovieCardViewModel {
  const score = movie.score_rating ?? 0;
  const duration = movie.duration ?? 0;
  const match = buildResultMatchViewModel(movie.similarity, copy);
  const hasRating = Boolean(movie.age_rating && movie.age_rating !== 'NR');
  const hasScore = score > 0;
  const hasDuration = duration > 0;
  const ratingItem = hasRating ? createMetaItem('rating', movie.age_rating!) : undefined;
  const durationShort = `${duration}m`;
  const durationWithUnit = `${duration} ${copy.minUnit}`;
  const scoreShort = String(score);
  const title = movie.localizedName ?? movie.name;

  return {
    aiPickLabel: copy.aiPick,
    description: movie.description ?? '',
    duration,
    durationShort,
    durationWithUnit,
    hasDescription: Boolean(movie.description),
    hasDuration,
    hasPoster: Boolean(movie.posterURL),
    hasRating,
    hasScore,
    matchColor: match.color,
    matchExactLabel: match.exactLabel,
    matchLabel: match.label,
    posterUrl: movie.posterURL,
    rationaleLabel: getRationaleLabel(copy, options),
    score,
    title,
    year: movie.year,
    compactMetaItems: compactMetaItems(
      movie.year,
      ratingItem,
      hasScore,
      scoreShort,
      hasDuration,
      durationShort,
    ),
    expandedMetaItems: compactMetaItems(
      movie.year,
      ratingItem,
      hasScore,
      scoreShort,
      hasDuration,
      durationShort,
    ),
    overlayMetaItems: overlayMetaItems(
      movie.year,
      ratingItem,
      hasDuration,
      durationWithUnit,
      hasScore,
      `${score}/10`,
    ),
    plainMetaItems: plainMetaItems(movie.year, ratingItem, hasDuration, durationWithUnit),
  };
}

export function buildResultMatchViewModel(
  similarity: number,
  copy: ResultsCopy,
): ResultMatchViewModel {
  const { pct, tier } = getSimilarityTier(similarity);
  return {
    color: MATCH_TIER_COLORS[tier],
    exactLabel: copy.matchTierExact.replace('{pct}', String(pct)),
    label: copy.matchTiers[tier],
  };
}

function getRationaleLabel(
  copy: ResultsCopy,
  options: { isGroup?: boolean; rationaleVariant?: 'main' | 'expanded' },
): string {
  if (options.isGroup) return copy.whyThisFilmForGroup;
  return options.rationaleVariant === 'expanded' ? copy.whyThisFilm : copy.whyThisFilmForYou;
}

function createMetaItem(kind: ResultMovieMetaKind, label: string): ResultMovieMetaItem {
  return { kind, label };
}

function compactMetaItems(
  year: string | number,
  ratingItem: ResultMovieMetaItem | undefined,
  hasScore: boolean,
  score: string,
  hasDuration: boolean,
  duration: string,
): ResultMovieMetaItem[] {
  return [
    createMetaItem('text', String(year)),
    ratingItem,
    hasScore ? createMetaItem('score', score) : undefined,
    hasDuration ? createMetaItem('duration', duration) : undefined,
  ].filter(Boolean) as ResultMovieMetaItem[];
}

function overlayMetaItems(
  year: string | number,
  ratingItem: ResultMovieMetaItem | undefined,
  hasDuration: boolean,
  duration: string,
  hasScore: boolean,
  score: string,
): ResultMovieMetaItem[] {
  return [
    createMetaItem('text', String(year)),
    ratingItem,
    hasDuration ? createMetaItem('duration', duration) : undefined,
    hasScore ? createMetaItem('score', score) : undefined,
  ].filter(Boolean) as ResultMovieMetaItem[];
}

function plainMetaItems(
  year: string | number,
  ratingItem: ResultMovieMetaItem | undefined,
  hasDuration: boolean,
  duration: string,
): ResultMovieMetaItem[] {
  return [
    createMetaItem('text', String(year)),
    ratingItem,
    hasDuration ? createMetaItem('duration', duration) : undefined,
  ].filter(Boolean) as ResultMovieMetaItem[];
}
