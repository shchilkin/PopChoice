export type MovieIdentityInput = {
  tmdbId?: number | string | null;
  title?: string | null;
  year?: number | string | null;
};

export function normalizeMovieTitle(title: string): string {
  return title
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
}

export function getMovieTitleKey(title: string | null | undefined): string | null {
  if (!title) return null;
  const normalized = normalizeMovieTitle(title);
  return normalized.length > 0 ? normalized : null;
}

export function getMovieIdentityKey(input: MovieIdentityInput): string | null {
  const tmdbId =
    typeof input.tmdbId === 'string' ? Number.parseInt(input.tmdbId, 10) : input.tmdbId;
  if (typeof tmdbId === 'number' && Number.isFinite(tmdbId) && tmdbId > 0) {
    return `tmdb:${Math.trunc(tmdbId)}`;
  }

  const titleKey = getMovieTitleKey(input.title);
  if (!titleKey) return null;

  const parsedYear = typeof input.year === 'string' ? Number.parseInt(input.year, 10) : input.year;
  const yearKey =
    typeof parsedYear === 'number' && Number.isFinite(parsedYear) ? Math.trunc(parsedYear) : 'na';
  return `title:${titleKey}:${yearKey}`;
}

export function getYearFromReleaseDate(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}
