import {
  extractCatalogMetadata,
  extractUSCertification,
  fetchMovieDetails,
  getPosterUrl,
} from '@/features/catalogMaintenance/tmdb';
import { LOCALE_TO_TMDB_LANG } from '@/lib/locale';
import { parseTMDBReleaseYear } from '@/lib/tmdb';

import type { EnhancedMovieMatch } from '../types';
import type { TMDBMovieDetails } from '@/features/catalogMaintenance/tmdb';
import type { Locale } from '@/lib/locale';

const MAX_TMDB_DETAILS_ENRICHMENT = 8;
const MAX_METADATA_QUALITY_SIMILARITY_BOOST = 0.03;

export async function enrichTMDBMatchesWithDetails(
  matches: EnhancedMovieMatch[],
  tmdbApiKey: string,
  locale: Locale,
): Promise<EnhancedMovieMatch[]> {
  const tmdbMatches = matches
    .filter((movie) => movie.tmdbId && movie.id < 0)
    .slice(0, MAX_TMDB_DETAILS_ENRICHMENT);
  if (tmdbMatches.length === 0) return matches;

  const language = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';
  const detailsByTMDBId = await fetchTMDBDetailsById(tmdbMatches, tmdbApiKey, language);
  return matches.map((movie) =>
    enrichTMDBMatchWithDetails(movie, detailsByTMDBId.get(movie.tmdbId ?? 0)),
  );
}

async function fetchTMDBDetailsById(
  tmdbMatches: EnhancedMovieMatch[],
  tmdbApiKey: string,
  language: string,
): Promise<Map<number, TMDBMovieDetails>> {
  const entries = await Promise.all(
    tmdbMatches.map(async (movie) => {
      const tmdbId = movie.tmdbId;
      if (!tmdbId) return null;
      const details = await fetchMovieDetails(tmdbApiKey, tmdbId, language);
      return details ? ([tmdbId, details] as const) : null;
    }),
  );

  return new Map(
    entries.filter((entry): entry is readonly [number, TMDBMovieDetails] => entry !== null),
  );
}

function markMissingTMDBDetails(movie: EnhancedMovieMatch): EnhancedMovieMatch {
  return {
    ...movie,
    metadataQualityFlags: [...(movie.metadataQualityFlags ?? []), 'missing_details'],
    metadataQualityScore: movie.metadataQualityScore ?? 0,
  };
}

function mapTMDBWatchProviders(metadata: ReturnType<typeof extractCatalogMetadata>) {
  return metadata.providers.map(
    ({ availabilityType, displayPriority, providerId, providerName, region }) => ({
      availabilityType,
      displayPriority,
      providerId,
      providerName,
      region,
    }),
  );
}

function shouldEnrichTMDBMatch(movie: EnhancedMovieMatch): boolean {
  return Boolean(movie.tmdbId) && movie.id < 0;
}

function getTMDBDetailsDescription(details: TMDBMovieDetails, movie: EnhancedMovieMatch): string {
  return details.overview || movie.description;
}

function getTMDBDetailsRuntime(details: TMDBMovieDetails, movie: EnhancedMovieMatch): number {
  return details.runtime ?? movie.duration;
}

function getTMDBDetailsScore(details: TMDBMovieDetails, movie: EnhancedMovieMatch): number {
  return Number((details.vote_average ?? movie.score_rating ?? 0).toFixed(1));
}

function buildTMDBDetailsContent(input: {
  title: string;
  releaseYear: number;
  ageRating: string;
  runtime: number;
  scoreRating: number;
  description: string;
}): string {
  const runtimeLabel = input.runtime ? input.runtime : 'unknown';
  const lines = [
    `${input.title} (${input.releaseYear}) | ${input.ageRating}`,
    `Duration: ${runtimeLabel} min | TMDB Score: ${input.scoreRating}/10`,
  ];
  if (input.description) lines.push(input.description);
  return lines.join('\n');
}

function enrichTMDBMatchWithDetails(
  movie: EnhancedMovieMatch,
  details?: TMDBMovieDetails,
): EnhancedMovieMatch {
  if (!shouldEnrichTMDBMatch(movie)) return movie;
  if (!details) return markMissingTMDBDetails(movie);

  const metadata = extractCatalogMetadata(details);
  const ageRating = extractUSCertification(details);
  const runtime = getTMDBDetailsRuntime(details, movie);
  const scoreRating = getTMDBDetailsScore(details, movie);
  const releaseYear = parseTMDBReleaseYear(details.release_date);
  const description = getTMDBDetailsDescription(details, movie);
  const qualityBoost = (metadata.qualityScore / 100) * MAX_METADATA_QUALITY_SIMILARITY_BOOST;

  return {
    ...movie,
    age_rating: ageRating,
    content: buildTMDBDetailsContent({
      title: details.title,
      releaseYear,
      ageRating,
      runtime,
      scoreRating,
      description,
    }),
    description,
    duration: runtime,
    metadataQualityFlags: metadata.qualityFlags,
    metadataQualityScore: metadata.qualityScore,
    name: details.title || movie.name,
    originalLanguage: details.original_language ?? null,
    popularity: details.popularity ?? null,
    posterURL: getPosterUrl(details.poster_path) ?? movie.posterURL,
    score_rating: scoreRating,
    similarity: Number((movie.similarity + qualityBoost).toFixed(6)),
    voteCount: details.vote_count ?? null,
    watchProviders: mapTMDBWatchProviders(metadata),
    year: releaseYear || movie.year,
  };
}
