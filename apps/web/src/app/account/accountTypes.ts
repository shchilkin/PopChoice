export type RecommendationFeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'not_for_me'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';

export type RecommendationSummary = {
  slug: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: string;
  createdAt: string;
  completedAt: string | null;
  peopleCount: number;
  movieName: string | null;
  movieYear: number | null;
  posterURL: string | null;
  feedbackKind: RecommendationFeedbackKind | null;
};

export type UserMovieInteractionKind =
  'watched' | 'liked' | 'not_interested' | 'wrong_mood' | 'not_seen';

export type MovieMemorySummary = {
  movieKey: string;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  kind: UserMovieInteractionKind;
  updatedAt: string;
};

export type AccountResponse = {
  user: { email: string };
  recommendations: RecommendationSummary[];
  movieMemory: MovieMemorySummary[];
  movieMemoryTotal?: number;
  movieMemoryNextOffset?: number | null;
};

export type PosterLookupResult = {
  id: number;
  posterURL: string | null;
  localizedName?: string | null;
};

export type MovieMemoryPageResponse = {
  movieMemory?: MovieMemorySummary[];
  total?: number;
  nextOffset?: number | null;
};

export type LoadState =
  { status: 'idle' } | { status: 'loaded'; data: AccountResponse } | { status: 'error' };

export type MemoryActionState =
  { status: 'forgetting'; movieKey: string } | { status: 'error'; movieKey: string } | null;

export type MemoryPageState = { status: 'idle' } | { status: 'loading' } | { status: 'error' };

export type RecommendationFilter =
  'all' | 'rated' | 'useful' | 'already_watched' | 'wrong_mood' | 'not_interested';

export type MovieMemoryFilter = 'all' | UserMovieInteractionKind;
