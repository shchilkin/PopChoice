const DEFAULT_MAX_CAST_CREDITS = 12;
const DEFAULT_MAX_KEYWORDS = 20;

export interface TMDBCatalogGenreSource {
  id: number;
  name: string;
}

export interface TMDBCatalogCastCreditSource {
  id: number;
  name: string;
  character?: string | null;
  order?: number | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
}

export interface TMDBCatalogCrewCreditSource {
  id: number;
  name: string;
  job?: string | null;
  department?: string | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
}

export interface TMDBCatalogKeywordSource {
  id: number;
  name: string;
}

export interface TMDBCatalogMovieDetails {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  poster_path?: string | null;
  genres?: TMDBCatalogGenreSource[];
  credits?: {
    cast?: TMDBCatalogCastCreditSource[];
    crew?: TMDBCatalogCrewCreditSource[];
  };
  keywords?: {
    keywords?: TMDBCatalogKeywordSource[];
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
}

export interface TMDBCatalogPersonMetadata {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  popularity: number | null;
  creditId: string;
  role: 'cast' | 'director';
  characterName: string | null;
  job: string | null;
  department: string | null;
  billingOrder: number | null;
  rawMetadata: Record<string, unknown>;
}

export interface TMDBCatalogGenreMetadata {
  tmdbId: number;
  name: string;
  rawMetadata: Record<string, unknown>;
}

export interface TMDBCatalogKeywordMetadata {
  tmdbId: number;
  name: string;
  rawMetadata: Record<string, unknown>;
}

export interface TMDBCatalogMetadataCore {
  people: TMDBCatalogPersonMetadata[];
  genres: TMDBCatalogGenreMetadata[];
  keywords: TMDBCatalogKeywordMetadata[];
  snapshot: {
    id: number;
    title: string;
    release_date: string;
    runtime: number | null;
    vote_average: number;
    poster_path: string | null;
    genres: Array<{ id: number; name: string }>;
    cast: Array<{ id: number; name: string; character: string | null; order: number | null }>;
    directors: Array<{ id: number; name: string; job: string | null }>;
    keywords: Array<{ id: number; name: string }>;
  };
}

export interface ExtractTMDBCatalogMetadataOptions {
  maxCastCredits?: number;
  maxKeywords?: number;
}

export function extractTMDBUSCertification(details: TMDBCatalogMovieDetails): string {
  const usEntry = details.release_dates?.results?.find((entry) => entry.iso_3166_1 === 'US');
  if (!usEntry) return 'NR';

  const theatrical = usEntry.release_dates.find(
    (release) => release.type === 3 && release.certification,
  );
  const any = usEntry.release_dates.find((release) => release.certification);
  return (theatrical ?? any)?.certification || 'NR';
}

export function extractTMDBCatalogMetadataCore(
  details: TMDBCatalogMovieDetails,
  options: ExtractTMDBCatalogMetadataOptions = {},
): TMDBCatalogMetadataCore {
  const maxCastCredits = options.maxCastCredits ?? DEFAULT_MAX_CAST_CREDITS;
  const maxKeywords = options.maxKeywords ?? DEFAULT_MAX_KEYWORDS;

  const genres = (details.genres ?? [])
    .filter((genre) => Number.isFinite(genre.id) && genre.name)
    .map((genre) => ({
      tmdbId: genre.id,
      name: genre.name,
      rawMetadata: genre as unknown as Record<string, unknown>,
    }));

  const cast = (details.credits?.cast ?? [])
    .filter((credit) => Number.isFinite(credit.id) && credit.name && credit.credit_id)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, maxCastCredits)
    .map((credit) => ({
      tmdbId: credit.id,
      name: credit.name,
      profilePath: credit.profile_path ?? null,
      popularity: credit.popularity ?? null,
      creditId: credit.credit_id as string,
      role: 'cast' as const,
      characterName: credit.character ?? null,
      job: null,
      department: null,
      billingOrder: credit.order ?? null,
      rawMetadata: credit as unknown as Record<string, unknown>,
    }));

  const directors = (details.credits?.crew ?? [])
    .filter(
      (credit) =>
        Number.isFinite(credit.id) &&
        credit.name &&
        credit.credit_id &&
        credit.job?.toLowerCase() === 'director',
    )
    .map((credit) => ({
      tmdbId: credit.id,
      name: credit.name,
      profilePath: credit.profile_path ?? null,
      popularity: credit.popularity ?? null,
      creditId: credit.credit_id as string,
      role: 'director' as const,
      characterName: null,
      job: credit.job ?? null,
      department: credit.department ?? null,
      billingOrder: null,
      rawMetadata: credit as unknown as Record<string, unknown>,
    }));

  const keywords = (details.keywords?.keywords ?? [])
    .filter((keyword) => Number.isFinite(keyword.id) && keyword.name)
    .slice(0, maxKeywords)
    .map((keyword) => ({
      tmdbId: keyword.id,
      name: keyword.name,
      rawMetadata: keyword as unknown as Record<string, unknown>,
    }));

  return {
    people: [...cast, ...directors],
    genres,
    keywords,
    snapshot: {
      id: details.id,
      title: details.title,
      release_date: details.release_date,
      runtime: details.runtime,
      vote_average: details.vote_average,
      poster_path: details.poster_path ?? null,
      genres: genres.map(({ tmdbId, name }) => ({ id: tmdbId, name })),
      cast: cast.map(({ tmdbId, name, characterName, billingOrder }) => ({
        id: tmdbId,
        name,
        character: characterName,
        order: billingOrder,
      })),
      directors: directors.map(({ tmdbId, name, job }) => ({ id: tmdbId, name, job })),
      keywords: keywords.map(({ tmdbId, name }) => ({ id: tmdbId, name })),
    },
  };
}
