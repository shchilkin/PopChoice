import type { AccountResponse, MovieMemoryPageResponse, PosterLookupResult } from './accountTypes';
import type { MissingPosterItem } from './accountViewModel';

export async function fetchAccount(signal: AbortSignal): Promise<AccountResponse> {
  const response = await fetch('/api/account', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load account');
  }

  return (await response.json()) as AccountResponse;
}

export async function fetchMovieMemoryPosters(
  locale: string,
  missingPosterItems: MissingPosterItem[],
): Promise<PosterLookupResult[]> {
  const response = await fetch('/api/movie-posters', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locale,
      movies: missingPosterItems.map(({ item, index }) => ({
        id: index,
        name: item.movieName,
        year: item.movieYear ?? undefined,
        tmdbId: item.tmdbId ?? undefined,
      })),
    }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { results?: PosterLookupResult[] };
  return Array.isArray(data.results) ? data.results : [];
}

export async function fetchMovieMemoryPage(
  offset: number,
  limit: number,
): Promise<MovieMemoryPageResponse> {
  const response = await fetch(
    `/api/account/movie-memory?mode=list&offset=${offset}&limit=${limit}`,
    {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load movie memory page');
  }

  return (await response.json()) as MovieMemoryPageResponse;
}

export async function deleteMovieMemory(movieKey: string, csrfToken: string): Promise<void> {
  const response = await fetch('/api/account/movie-memory', {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ movieKey }),
  });

  if (!response.ok) {
    throw new Error('Failed to forget movie memory');
  }
}
