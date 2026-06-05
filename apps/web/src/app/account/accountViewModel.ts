import type {
  AccountResponse,
  LoadState,
  MovieMemoryFilter,
  MovieMemoryPageResponse,
  MovieMemorySummary,
  PosterLookupResult,
  RecommendationFilter,
  RecommendationSummary,
  UserMovieInteractionKind,
} from './accountTypes';

export type MissingPosterItem = {
  index: number;
  item: MovieMemorySummary;
};

export type AccountAuthStatus = 'unknown' | 'authenticated' | 'anonymous';
export type AccountRenderState = 'loading' | 'signed-out' | 'error' | 'empty' | 'loaded';
type ScrollMetrics = {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
};

type RecommendationSearchLabels = {
  feedback: Record<NonNullable<RecommendationSummary['feedbackKind']>, string>;
  status: Record<RecommendationSummary['status'], string>;
};

const AUTHENTICATED_RENDER_STATE_BY_LOAD_STATE = {
  error: 'error',
  idle: 'loading',
  loaded: 'loaded',
} satisfies Record<LoadState['status'], AccountRenderState>;

const RENDER_STATE_BY_AUTH_STATUS = {
  anonymous: 'signed-out',
  unknown: 'loading',
} satisfies Record<Exclude<AccountAuthStatus, 'authenticated'>, AccountRenderState>;

export function getAccountRenderState(
  authStatus: AccountAuthStatus,
  loadStatus: LoadState['status'],
): AccountRenderState {
  if (authStatus === 'authenticated') {
    return AUTHENTICATED_RENDER_STATE_BY_LOAD_STATE[loadStatus] ?? 'empty';
  }

  return RENDER_STATE_BY_AUTH_STATUS[authStatus] ?? 'signed-out';
}

export function getNextMovieMemoryOffset(
  state: LoadState,
  pageState: { status: string },
): number | null {
  return state.status === 'loaded' && pageState.status !== 'loading'
    ? (state.data.movieMemoryNextOffset ?? null)
    : null;
}

export function shouldLoadMoreMovieMemory(
  node: ScrollMetrics | null,
  hasMoreItems: boolean,
  isLoadingMore: boolean,
  pageState: { status: string },
): boolean {
  const distanceToEnd = getScrollDistanceToEnd(node);
  return hasMoreItems && !isLoadingMore && pageState.status !== 'error' && distanceToEnd <= 520;
}

function getScrollDistanceToEnd(node: ScrollMetrics | null): number {
  return node ? node.scrollHeight - node.scrollTop - node.clientHeight : Number.POSITIVE_INFINITY;
}

type MovieMemorySearchLabels = {
  memoryKind: Record<UserMovieInteractionKind, string>;
};

export function normalizeAccountResponse(data: AccountResponse): AccountResponse {
  const movieMemory = Array.isArray(data.movieMemory) ? data.movieMemory : [];

  return {
    ...data,
    movieMemory,
    movieMemoryTotal:
      typeof data.movieMemoryTotal === 'number' ? data.movieMemoryTotal : movieMemory.length,
    movieMemoryNextOffset: data.movieMemoryNextOffset ?? null,
  };
}

export function getMissingPosterItems(
  movieMemory: MovieMemorySummary[],
  locale: string,
  requestedMovieKeys: ReadonlySet<string>,
): MissingPosterItem[] {
  return movieMemory
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const needsLocalizedName = locale !== 'en' && !item.localizedName;
      return (!item.posterURL || needsLocalizedName) && !requestedMovieKeys.has(item.movieKey);
    });
}

export function mergePosterLookups(
  movieMemory: MovieMemorySummary[],
  results: PosterLookupResult[],
): MovieMemorySummary[] {
  const resultsByIndex = new Map(results.map((result) => [result.id, result]));
  if (resultsByIndex.size === 0) return movieMemory;

  let changed = false;
  const merged = movieMemory.map((item, index) => {
    const result = resultsByIndex.get(index);
    if (!result) return item;

    const posterURL = item.posterURL ?? result.posterURL;
    const localizedName = item.localizedName ?? result.localizedName ?? null;
    if (posterURL === item.posterURL && localizedName === item.localizedName) return item;

    changed = true;
    return { ...item, posterURL, localizedName };
  });

  return changed ? merged : movieMemory;
}

export function mergeMovieMemoryPage(
  account: AccountResponse,
  page: MovieMemoryPageResponse,
): AccountResponse {
  const nextItems = Array.isArray(page.movieMemory) ? page.movieMemory : [];
  const existingKeys = new Set(account.movieMemory.map((item) => item.movieKey));
  const movieMemory = [
    ...account.movieMemory,
    ...nextItems.filter((item) => !existingKeys.has(item.movieKey)),
  ];

  return {
    ...account,
    movieMemory,
    movieMemoryTotal: page.total ?? account.movieMemoryTotal ?? movieMemory.length,
    movieMemoryNextOffset: page.nextOffset ?? null,
  };
}

export function removeMovieMemoryItem(account: AccountResponse, movieKey: string): AccountResponse {
  return {
    ...account,
    movieMemory: account.movieMemory.filter((item) => item.movieKey !== movieKey),
    movieMemoryTotal: Math.max((account.movieMemoryTotal ?? 1) - 1, 0),
  };
}

export function filterRecommendations(
  recommendations: RecommendationSummary[],
  query: string,
  filter: RecommendationFilter,
  labels: RecommendationSearchLabels,
): RecommendationSummary[] {
  const normalizedQuery = normalizeSearch(query);
  return recommendations.filter((recommendation) => {
    if (!matchesRecommendationFilter(recommendation, filter)) return false;
    if (!normalizedQuery) return true;
    return recommendationSearchText(recommendation, labels).includes(normalizedQuery);
  });
}

export function filterMovieMemory(
  items: MovieMemorySummary[],
  query: string,
  filter: MovieMemoryFilter,
  labels: MovieMemorySearchLabels,
): MovieMemorySummary[] {
  const normalizedQuery = normalizeSearch(query);
  return items.filter((item) => {
    if (filter !== 'all' && item.kind !== filter) return false;
    if (!normalizedQuery) return true;
    return movieMemorySearchText(item, labels).includes(normalizedQuery);
  });
}

function matchesRecommendationFilter(
  recommendation: RecommendationSummary,
  filter: RecommendationFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'rated') return Boolean(recommendation.feedbackKind);
  if (filter === 'not_interested') {
    return (
      recommendation.feedbackKind === 'too_obvious' || recommendation.feedbackKind === 'too_obscure'
    );
  }
  return recommendation.feedbackKind === filter;
}

export function isSearchActive(value: string): boolean {
  return normalizeSearch(value).length > 0;
}

function recommendationSearchText(
  recommendation: RecommendationSummary,
  labels: RecommendationSearchLabels,
): string {
  return normalizeSearch(
    [
      recommendation.movieName,
      recommendation.movieYear,
      labels.status[recommendation.status],
      recommendation.feedbackKind ? labels.feedback[recommendation.feedbackKind] : null,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function movieMemorySearchText(item: MovieMemorySummary, labels: MovieMemorySearchLabels): string {
  return normalizeSearch(
    [item.movieName, item.localizedName, item.movieYear, labels.memoryKind[item.kind]]
      .filter(Boolean)
      .join(' '),
  );
}

function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase();
}
