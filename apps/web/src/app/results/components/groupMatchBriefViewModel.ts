import type {
  GroupParticipantProfile,
  GroupResultInsights,
} from '@/features/recommendation/groupResultInsights';
import type { Translations } from '@/i18n/locales/en';

type TranslationCopy = Translations;

export interface GroupParticipantSignalViewModel {
  eraValue: string;
  favoriteMovie: string | null;
  key: string;
  moodValue: string;
  name: string;
  toneValue: string;
}

export interface GroupMatchBriefViewModel {
  actorsText: string | null;
  eras: string;
  hasActors: boolean;
  hasParticipantSignals: boolean;
  participants: GroupParticipantSignalViewModel[];
  peopleValue: string;
  sharedMoods: string;
  tones: string;
}

const MOOD_ALIASES: Record<string, keyof TranslationCopy['genres']> = {
  action: 'action',
  adventure: 'adventure',
  animation: 'animation',
  comedy: 'comedy',
  documentary: 'documentary',
  drama: 'drama',
  horror: 'horror',
  romance: 'romance',
  scifi: 'scifi',
  sciencefiction: 'scifi',
  thriller: 'thriller',
};

const TONE_ALIASES: Record<string, keyof TranslationCopy['tones']> = {
  balanced: 'balanced',
  dark: 'dark',
  'dark and intense': 'dark',
  light: 'light',
  'light and fun': 'light',
  serious: 'serious',
  'serious and thought provoking': 'serious',
};

const ERA_ALIASES: Record<string, keyof Omit<TranslationCopy['quiz']['era'], 'title'>> = {
  both: 'both',
  'both new and classic': 'both',
  classic: 'classic',
  'timeless classics': 'classic',
  new: 'new',
  'new releases': 'new',
};

export function buildGroupMatchBriefViewModel(
  insights: GroupResultInsights,
  t: TranslationCopy,
  locale: string,
): GroupMatchBriefViewModel {
  const names = joinList(insights.participantNames, locale);
  const actors = optionalJoinedValue(insights.favoriteActors, locale);

  return {
    actorsText: actors ? t.results.groupBriefActors.replace('{actors}', actors) : null,
    eras: translatedOrFallback(
      insights.eraPreferences,
      locale,
      t.results.groupBriefMixedSignals,
      (era) => translateEra(era, t),
    ),
    hasActors: Boolean(actors),
    hasParticipantSignals: insights.participantProfiles.length > 0,
    participants: insights.participantProfiles.map((profile, index) =>
      buildParticipantSignalViewModel(profile, index, t, locale),
    ),
    peopleValue: t.results.groupBriefPeopleValue
      .replace('{count}', new Intl.NumberFormat(locale).format(insights.participantNames.length))
      .replace('{names}', names),
    sharedMoods: translatedOrFallback(
      insights.sharedMoods,
      locale,
      t.results.groupBriefNoSharedMoods,
      (mood) => translateMood(mood, t),
    ),
    tones: translatedOrFallback(
      insights.tonePreferences,
      locale,
      t.results.groupBriefMixedSignals,
      (tone) => translateTone(tone, t),
    ),
  };
}

function buildParticipantSignalViewModel(
  profile: GroupParticipantProfile,
  index: number,
  t: TranslationCopy,
  locale: string,
): GroupParticipantSignalViewModel {
  return {
    eraValue: optionalTranslatedValue(
      profile.eraPreference,
      t.results.groupBriefMissingSignal,
      (era) => translateEra(era, t),
    ),
    favoriteMovie: profile.favoriteMovie,
    key: `${profile.name}-${profile.favoriteMovie ?? profile.tonePreference ?? ''}-${index}`,
    moodValue: translatedOrFallback(
      profile.moodPreferences,
      locale,
      t.results.groupBriefMissingSignal,
      (mood) => translateMood(mood, t),
    ),
    name: profile.name,
    toneValue: optionalTranslatedValue(
      profile.tonePreference,
      t.results.groupBriefMissingSignal,
      (tone) => translateTone(tone, t),
    ),
  };
}

function joinList(values: string[], locale: string): string {
  return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(values);
}

function translatedOrFallback(
  values: string[],
  locale: string,
  fallback: string,
  translate: (value: string) => string,
): string {
  return values.length > 0 ? joinList(values.map(translate), locale) : fallback;
}

function optionalJoinedValue(values: string[], locale: string): string | null {
  return values.length > 0 ? joinList(values, locale) : null;
}

function optionalTranslatedValue(
  value: string | null,
  fallback: string,
  translate: (value: string) => string,
): string {
  return value ? translate(value) : fallback;
}

function normalizeChoice(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateMood(value: string, t: TranslationCopy): string {
  const key = MOOD_ALIASES[normalizeChoice(value).replace(/\s+/g, '')];
  return key ? t.genres[key] : value;
}

function translateTone(value: string, t: TranslationCopy): string {
  const key = TONE_ALIASES[normalizeChoice(value)];
  return key ? t.tones[key].label : value;
}

function translateEra(value: string, t: TranslationCopy): string {
  const key = ERA_ALIASES[normalizeChoice(value)];
  return key ? t.quiz.era[key].title : value;
}
