import type {
  MovieMemoryCandidateStats,
  MovieMemoryCatalogSearchResult,
  UserMovieInteractionKind,
} from '@/lib/db/recommendations';

export const CANDIDATE_LIMIT = 20;

export type MovieMemoryInteractionKind = Extract<UserMovieInteractionKind, 'watched' | 'not_seen'>;
export type MovieMemoryCandidate = MovieMemoryCatalogSearchResult;
export type MovieMemoryCandidateSource = 'catalog' | 'tmdb';
export type MovieMemoryLogContext = Record<string, unknown>;

export interface MovieMemoryCandidateResult {
  movies: MovieMemoryCandidate[];
  source: MovieMemoryCandidateSource;
  emptyStats?: MovieMemoryCandidateStats;
}
