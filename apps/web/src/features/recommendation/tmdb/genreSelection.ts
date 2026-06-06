import { GENRE_LABEL_TO_TMDB_ID, normalizeGenreLabel } from '@/lib/tmdb';

function incrementCount<TKey>(counts: Map<TKey, number>, key: TKey) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function getTopTMDBGenreIds(
  moodPreferences: string[],
  options: { withoutGenreIds?: ReadonlySet<number> } = {},
): number[] {
  const moodCounts = new Map<string, number>();
  for (const mood of moodPreferences) incrementCount(moodCounts, normalizeGenreLabel(mood));

  return Array.from(moodCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => GENRE_LABEL_TO_TMDB_ID[key])
    .filter((id): id is number => id !== undefined && !(options.withoutGenreIds?.has(id) ?? false));
}
