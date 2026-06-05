export type MovieMemoryDeckAction = 'watched' | 'not_seen' | 'unsure';

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

type KeyboardEventLike = {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
};

const DECK_CARD_IDLE_ANIMATE = { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 };
const DECK_CARD_REDUCED_EXIT_ANIMATE = { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.98 };
const DECK_CARD_EXIT_ANIMATE_BY_ACTION = {
  watched: { opacity: 0, x: 520, y: 8, rotate: 8, scale: 0.98 },
  not_seen: { opacity: 0, x: -520, y: 8, rotate: -8, scale: 0.98 },
  unsure: { opacity: 0, x: 0, y: 150, rotate: 0, scale: 0.95 },
} satisfies Record<MovieMemoryDeckAction, typeof DECK_CARD_IDLE_ANIMATE>;

const KEYBOARD_ACTION_BY_KEY: Partial<Record<string, MovieMemoryDeckAction>> = {
  ArrowLeft: 'not_seen',
  ArrowRight: 'watched',
  ArrowDown: 'unsure',
};

const DURATION_LABELS_BY_LOCALE = {
  en: { hour: 'h', minute: 'm', separator: ' ' },
  fi: { hour: 't', minute: 'min', separator: ' ' },
  ru: { hour: 'ч', minute: 'мин', separator: ' ' },
} as const;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

export function getDeckKeyboardAction(event: KeyboardEventLike): MovieMemoryDeckAction | null {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    isEditableKeyboardTarget(event.target)
  ) {
    return null;
  }

  return KEYBOARD_ACTION_BY_KEY[event.key] ?? null;
}

export function getDeckCardAnimate(action: MovieMemoryDeckAction | null, reducedMotion: boolean) {
  if (!action) return DECK_CARD_IDLE_ANIMATE;
  return reducedMotion ? DECK_CARD_REDUCED_EXIT_ANIMATE : DECK_CARD_EXIT_ANIMATE_BY_ACTION[action];
}

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
