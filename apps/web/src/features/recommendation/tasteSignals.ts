import { getMovieIdentityKey } from '@/lib/movieIdentity';
import { getAvoidSignalsFromReason } from '@/utils/tasteSignals';

import type { PersonFormData } from './types';
import type {
  RecommendationFeedbackKind,
  UserMovieInteractionKind,
  UserRecommendationMemoryKind,
} from '@/lib/db/recommendations';

export type TasteSignalSource = 'quiz' | 'feedback' | 'movie-memory' | 'recommendation-history';

export type TasteSignalType =
  | 'liked_movie'
  | 'seen_movie'
  | 'not_interested_movie'
  | 'wrong_mood_movie'
  | 'desired_trait'
  | 'avoid_trait'
  | 'constraint';

export type MovieTasteSignal = {
  type: Extract<
    TasteSignalType,
    'liked_movie' | 'seen_movie' | 'not_interested_movie' | 'wrong_mood_movie'
  >;
  source: TasteSignalSource;
  title: string;
  year?: number | null;
  tmdbId?: number | null;
  movieKey?: string | null;
  participantName?: string;
  weight: number;
};

export type TraitTasteSignal = {
  type: Extract<TasteSignalType, 'desired_trait' | 'avoid_trait' | 'constraint'>;
  source: TasteSignalSource;
  value: string;
  participantName?: string;
  weight: number;
};

export type TasteSignal = MovieTasteSignal | TraitTasteSignal;

export type FeedbackTastePreference = {
  kind: RecommendationFeedbackKind | UserMovieInteractionKind | UserRecommendationMemoryKind;
  movieKey?: string | null;
  tmdbId?: number | null;
  movieName: string;
  movieYear?: number | null;
};

export type TasteSignalSummary = Partial<Record<TasteSignalType, number>>;

const QUIZ_REFERENCE_MOVIE_WEIGHT = 0.7;
const QUIZ_DESIRED_TRAIT_WEIGHT = 0.55;
const QUIZ_CONSTRAINT_WEIGHT = 0.5;
const QUIZ_AVOID_TRAIT_WEIGHT = 0.75;
const FEEDBACK_SIGNAL_WEIGHT = 1;
const RECENT_RECOMMENDATION_WEIGHT = 0.55;
const MOVIE_SIGNAL_TYPES = {
  already_watched: 'seen_movie',
  close: null,
  liked: 'liked_movie',
  not_interested: 'not_interested_movie',
  not_for_me: 'not_interested_movie',
  not_seen: null,
  recently_recommended: 'seen_movie',
  too_obscure: 'not_interested_movie',
  too_obvious: 'not_interested_movie',
  useful: 'liked_movie',
  watched: 'seen_movie',
  wrong_mood: 'wrong_mood_movie',
} satisfies Record<FeedbackTastePreference['kind'], MovieTasteSignal['type'] | null>;

function cleanSignalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

function getParticipantName(person: PersonFormData): string | undefined {
  return cleanSignalString(person.name) ?? undefined;
}

function addTraitSignal(
  signals: TasteSignal[],
  input: {
    participantName?: string;
    source: TasteSignalSource;
    type: TraitTasteSignal['type'];
    value: unknown;
    weight: number;
  },
): void {
  const value = cleanSignalString(input.value);
  if (!value) return;

  signals.push({
    type: input.type,
    source: input.source,
    value,
    weight: input.weight,
    ...(input.participantName ? { participantName: input.participantName } : {}),
  });
}

export function getTasteSignalsFromQuiz(people: PersonFormData[]): TasteSignal[] {
  const signals: TasteSignal[] = [];

  for (const person of people) {
    const participantName = getParticipantName(person);
    const favoriteMovie = cleanSignalString(person.favoriteMovie);

    if (favoriteMovie) {
      signals.push({
        type: 'liked_movie',
        source: 'quiz',
        title: favoriteMovie,
        weight: QUIZ_REFERENCE_MOVIE_WEIGHT,
        ...(participantName ? { participantName } : {}),
      });
    }

    addTraitSignal(signals, {
      participantName,
      source: 'quiz',
      type: 'constraint',
      value: person.newVsClassic,
      weight: QUIZ_CONSTRAINT_WEIGHT,
    });
    addTraitSignal(signals, {
      participantName,
      source: 'quiz',
      type: 'desired_trait',
      value: person.tonePreference,
      weight: QUIZ_DESIRED_TRAIT_WEIGHT,
    });
    addTraitSignal(signals, {
      participantName,
      source: 'quiz',
      type: 'desired_trait',
      value: person.favoriteActor,
      weight: QUIZ_DESIRED_TRAIT_WEIGHT,
    });

    for (const mood of person.moodPreference) {
      addTraitSignal(signals, {
        participantName,
        source: 'quiz',
        type: 'desired_trait',
        value: mood,
        weight: QUIZ_DESIRED_TRAIT_WEIGHT,
      });
    }

    for (const avoid of getAvoidSignalsFromReason(person.favoriteMovieWhy)) {
      addTraitSignal(signals, {
        participantName,
        source: 'quiz',
        type: 'avoid_trait',
        value: avoid,
        weight: QUIZ_AVOID_TRAIT_WEIGHT,
      });
    }
  }

  return signals;
}

function getMovieSignalType(
  kind: FeedbackTastePreference['kind'],
): MovieTasteSignal['type'] | null {
  return MOVIE_SIGNAL_TYPES[kind];
}

function getFeedbackSignalSource(kind: FeedbackTastePreference['kind']): TasteSignalSource {
  if (kind === 'recently_recommended') return 'recommendation-history';
  if (kind === 'watched' || kind === 'liked' || kind === 'not_interested' || kind === 'not_seen') {
    return 'movie-memory';
  }
  return 'feedback';
}

function getFeedbackSignalWeight(kind: FeedbackTastePreference['kind']): number {
  return kind === 'recently_recommended' ? RECENT_RECOMMENDATION_WEIGHT : FEEDBACK_SIGNAL_WEIGHT;
}

export function getTasteSignalsFromFeedbackPreferences(
  preferences: FeedbackTastePreference[],
): TasteSignal[] {
  return preferences.flatMap((preference) => {
    const signalType = getMovieSignalType(preference.kind);
    const title = cleanSignalString(preference.movieName);
    if (!signalType || !title) return [];

    return [
      {
        type: signalType,
        source: getFeedbackSignalSource(preference.kind),
        title,
        year: preference.movieYear ?? null,
        tmdbId: preference.tmdbId ?? null,
        movieKey:
          preference.movieKey ??
          getMovieIdentityKey({
            tmdbId: preference.tmdbId,
            title,
            year: preference.movieYear ?? null,
          }),
        weight: getFeedbackSignalWeight(preference.kind),
      },
    ];
  });
}

export function summarizeTasteSignals(signals: TasteSignal[]): TasteSignalSummary {
  return signals.reduce<TasteSignalSummary>((summary, signal) => {
    summary[signal.type] = (summary[signal.type] ?? 0) + 1;
    return summary;
  }, {});
}
