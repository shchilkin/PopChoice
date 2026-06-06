export interface MovieRecord {
  name: string;
  year: number;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  original_title?: string | null;
  original_language?: string | null;
  release_date?: string | null;
  vote_count?: number | null;
  popularity?: number | null;
  metadata_quality_score?: number | null;
  metadata_quality_flags?: string[] | Record<string, unknown> | null;
  poster_url?: string | null;
  localized_name?: string | null;
  tmdb_id?: number | null;
  tmdb_match_confidence?: number | null;
  tmdb_match_source?: 'tmdb_discovery' | 'backfill_auto' | 'manual' | null;
  tmdb_metadata?: Record<string, unknown>;
  tmdb_metadata_refreshed_at?: string | Date | null;
  embedding: number[];
}

export type CatalogMetadataSource = 'tmdb' | 'manual';
export type MoviePersonRole = 'cast' | 'director';

export interface CatalogPersonRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  profile_path: string | null;
  popularity: number | null;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogGenreRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogKeywordRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  raw_metadata: Record<string, unknown>;
}

export interface MoviePersonCreditRecord {
  id: string;
  movie_id: string;
  person_id: string;
  tmdb_credit_id: string | null;
  role: MoviePersonRole;
  character_name: string | null;
  job: string | null;
  department: string | null;
  billing_order: number | null;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogPersonInput {
  tmdbId: number;
  name: string;
  profilePath?: string | null;
  popularity?: number | null;
  rawMetadata?: Record<string, unknown>;
}

export interface CatalogGenreInput {
  tmdbId: number;
  name: string;
  rawMetadata?: Record<string, unknown>;
}

export interface CatalogKeywordInput {
  tmdbId: number;
  name: string;
  rawMetadata?: Record<string, unknown>;
}

export type WatchProviderAvailabilityType = 'flatrate' | 'rent' | 'buy' | 'ads' | 'free';

export interface MovieWatchProviderInput {
  providerId: number;
  providerName: string;
  logoPath?: string | null;
  displayPriority?: number | null;
  region: string;
  availabilityType: WatchProviderAvailabilityType;
  link?: string | null;
  rawMetadata?: Record<string, unknown>;
}

export interface MoviePersonCreditInput extends CatalogPersonInput {
  creditId: string;
  role: MoviePersonRole;
  characterName?: string | null;
  job?: string | null;
  department?: string | null;
  billingOrder?: number | null;
}

export interface MovieCatalogMetadataInput {
  movieId: string | number;
  tmdbMetadata?: Record<string, unknown>;
  people?: MoviePersonCreditInput[];
  genres?: CatalogGenreInput[];
  keywords?: CatalogKeywordInput[];
  providers?: MovieWatchProviderInput[];
  source?: CatalogMetadataSource;
}

export interface InsertedMovieRecord {
  id: string;
  tmdb_id: number | null;
}

export interface CatalogMetadataRefreshPlan {
  movieId: string;
  source: CatalogMetadataSource;
  shouldRefreshPeople: boolean;
  shouldRefreshGenres: boolean;
  shouldRefreshKeywords: boolean;
  shouldRefreshProviders: boolean;
  people: MoviePersonCreditInput[];
  genres: CatalogGenreInput[];
  keywords: CatalogKeywordInput[];
  providers: MovieWatchProviderInput[];
}
