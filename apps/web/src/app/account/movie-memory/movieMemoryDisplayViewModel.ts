type MovieTitleFields = {
  localizedName: string | null;
  movieName: string;
};

type MovieSummaryFields = {
  description: string | null;
  localizedOverview: string | null;
};

type MovieOriginalTitleFields = {
  localizedName: string | null;
  movieName: string;
};

const DURATION_LABELS_BY_LOCALE = {
  en: { hour: 'h', minute: 'm', separator: ' ' },
  fi: { hour: 't', minute: 'min', separator: ' ' },
  ru: { hour: 'ч', minute: 'мин', separator: ' ' },
} as const;

export function getMovieTitle(movie: MovieTitleFields, locale: string): string {
  if (locale !== 'en' && movie.localizedName) return movie.localizedName;
  return movie.movieName;
}

export function getMovieSummary(movie: MovieSummaryFields, locale: string): string | null {
  const summary =
    locale !== 'en' ? movie.localizedOverview || movie.description : movie.description;
  const trimmed = summary?.trim();
  if (!trimmed) return null;
  return trimmed.length > 260 ? `${trimmed.slice(0, 257).trimEnd()}...` : trimmed;
}

export function getOriginalTitle(movie: MovieOriginalTitleFields, locale: string): string | null {
  if (locale === 'en') return null;
  if (!movie.localizedName || movie.localizedName === movie.movieName) return null;
  return movie.movieName;
}

export function formatMovieName(name: string, year: number | null): string {
  return year ? `${name} (${year})` : name;
}

export function formatDuration(duration: number | null, locale: string): string | null {
  if (!duration || duration <= 0) return null;

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const labels =
    DURATION_LABELS_BY_LOCALE[locale as keyof typeof DURATION_LABELS_BY_LOCALE] ??
    DURATION_LABELS_BY_LOCALE.en;

  if (hours === 0) return `${minutes} ${labels.minute}`;
  return minutes
    ? `${hours} ${labels.hour}${labels.separator}${minutes} ${labels.minute}`
    : `${hours} ${labels.hour}`;
}
