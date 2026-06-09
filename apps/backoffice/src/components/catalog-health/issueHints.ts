export function catalogIssueHint(issueKey: string): string {
  return CATALOG_ISSUE_HINTS[issueKey] ?? 'Review affected catalog records.';
}

const CATALOG_ISSUE_HINTS: Record<string, string> = {
  missing_age_rating: 'Age-rating gaps reduce safety and household filtering quality.',
  missing_cast_metadata: 'Cast gaps limit actor-aware recommendation features.',
  missing_director_metadata: 'Director gaps limit creator-aware recommendation features.',
  missing_genre_metadata: 'Genre gaps weaken discovery and future filters.',
  missing_keyword_metadata: 'Keyword gaps reduce nuance for ranking and search.',
  missing_localized_name: 'Localized names improve non-English operator and user views.',
  missing_poster_url: 'Poster coverage affects result cards and catalog browsing.',
  missing_runtime: 'Runtime gaps make fit and pacing recommendations weaker.',
  missing_tmdb_id: 'Identity gaps block richer TMDB refreshes and joins.',
  missing_tmdb_matched_at: 'Matched rows need timestamps for stale-data decisions.',
  stale_tmdb_metadata: 'Refresh candidates through the rate-limited TMDB path.',
};
