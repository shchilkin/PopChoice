export interface Movie {
  id: number;
  name: string;
  localized_name?: string | null;
  poster_url?: string | null;
  age_rating: string;
  duration: number;
  score_rating: number;
  year: number;
}

export interface MoviesResponse {
  movies: Movie[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MovieDurationFilter = 'under-90' | '90-120' | 'over-120';

export interface MoviesPageFilters {
  query?: string;
  yearFrom?: number;
  yearTo?: number;
  duration?: MovieDurationFilter;
  minScore?: number;
  ageRatings?: string[];
}

export interface CountRow {
  count: number | string;
}

export interface DurationBounds {
  min?: number;
  max?: number;
}
