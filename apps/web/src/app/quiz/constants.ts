import {
  Clock,
  CloudSun,
  Compass,
  Film,
  FlaskConical,
  Ghost,
  Globe,
  Heart,
  Laugh,
  Moon,
  Mountain,
  Popcorn,
  ShieldCheck,
  Skull,
  Smile,
  Star,
  Sun,
  TimerOff,
  Zap,
} from 'lucide-react';

import { PARTICIPANT_NAME_MAX_LENGTH } from '@/features/recommendation/limits';
import { palette } from '@/styles/designTokens';

import type { FastAvoid, FastDiscovery, FastIntent, PersonAnswers, Tone } from './types';

export const STEP_KEYS = [
  'favoriteMovie',
  'era',
  'mood',
  'tone',
  'avoids',
  'favoriteActor',
] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const FAST_STEP_KEYS = ['intent', 'avoids', 'discovery'] as const;
export type FastStepKey = (typeof FAST_STEP_KEYS)[number];

export const GENRES = [
  { id: 'action', label: 'Action', icon: Zap, color: palette.amber },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: palette.gold },
  { id: 'drama', label: 'Drama', icon: Film, color: palette.purple },
  { id: 'scifi', label: 'Sci-Fi', icon: FlaskConical, color: palette.teal },
  { id: 'thriller', label: 'Thriller', icon: Ghost, color: palette.red },
  { id: 'romance', label: 'Romance', icon: Heart, color: palette.pink },
  { id: 'horror', label: 'Horror', icon: Skull, color: palette.gray },
  { id: 'adventure', label: 'Adventure', icon: Globe, color: palette.green },
  { id: 'animation', label: 'Animation', icon: Star, color: palette.purpleLight },
  { id: 'documentary', label: 'Documentary', icon: Clock, color: palette.blue },
];

export const TONES: {
  id: Tone;
  label: string;
  desc: string;
  icon: typeof Sun;
  color: string;
  grad: string;
}[] = [
  {
    id: 'light',
    label: 'Light & Fun',
    desc: 'Easy going, uplifting',
    icon: Sun,
    color: palette.gold,
    grad: `linear-gradient(135deg, ${palette.gold}18, ${palette.amber}18)`,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Mix of everything',
    icon: CloudSun,
    color: palette.teal,
    grad: `linear-gradient(135deg, ${palette.teal}18, ${palette.blue}18)`,
  },
  {
    id: 'serious',
    label: 'Serious',
    desc: 'Thought-provoking',
    icon: Star,
    color: palette.purple,
    grad: `linear-gradient(135deg, ${palette.purple}18, ${palette.purpleLight}18)`,
  },
  {
    id: 'dark',
    label: 'Dark & Intense',
    desc: 'Gripping, complex',
    icon: Moon,
    color: palette.red,
    grad: `linear-gradient(135deg, ${palette.red}18, ${palette.gray}18)`,
  },
];

export const FAST_INTENTS: {
  id: FastIntent;
  icon: typeof Sun;
  color: string;
}[] = [
  { id: 'easy', icon: Sun, color: palette.gold },
  { id: 'funny', icon: Laugh, color: palette.amber },
  { id: 'gripping', icon: Zap, color: palette.red },
  { id: 'emotional', icon: Heart, color: palette.pink },
  { id: 'weird', icon: FlaskConical, color: palette.purple },
  { id: 'cozy', icon: Popcorn, color: palette.green },
  { id: 'dark', icon: Moon, color: palette.gray },
];

export const FAST_AVOIDS: {
  id: FastAvoid;
  icon: typeof Sun;
  color: string;
}[] = [
  { id: 'horror', icon: Skull, color: palette.gray },
  { id: 'gore', icon: Ghost, color: palette.red },
  { id: 'slow', icon: TimerOff, color: palette.amber },
  { id: 'subtitles', icon: Globe, color: palette.blue },
  { id: 'long', icon: Clock, color: palette.teal },
  { id: 'obvious', icon: Star, color: palette.gold },
  { id: 'obscure', icon: Compass, color: palette.green },
  { id: 'alreadySeen', icon: Film, color: palette.purple },
];

export const FAST_DISCOVERY_OPTIONS: {
  id: FastDiscovery;
  icon: typeof Sun;
  color: string;
}[] = [
  { id: 'safe', icon: ShieldCheck, color: palette.gold },
  { id: 'balanced', icon: Compass, color: palette.teal },
  { id: 'surprise', icon: Mountain, color: palette.purple },
];

const FAST_INTENT_API_LABELS: Record<FastIntent, string> = {
  easy: 'Easy',
  funny: 'Funny',
  gripping: 'Gripping',
  emotional: 'Emotional',
  weird: 'Weird',
  cozy: 'Cozy',
  dark: 'Dark',
};

const FAST_AVOID_API_LABELS: Record<FastAvoid, string> = {
  horror: 'horror',
  gore: 'gore',
  slow: 'slow pacing',
  subtitles: 'subtitles',
  long: 'long runtime',
  obvious: 'too obvious',
  obscure: 'too obscure',
  alreadySeen: 'already-seen movies',
};

const FAST_DISCOVERY_API_LABELS: Record<FastDiscovery, string> = {
  safe: 'Safe hit',
  balanced: 'Balanced discovery',
  surprise: 'Surprise me',
};

function getAvoidLabels(person: PersonAnswers) {
  return person.fastAvoids.map((avoid) => FAST_AVOID_API_LABELS[avoid]);
}

export function emptyPerson(name = ''): PersonAnswers {
  return {
    name,
    favoriteMovie: '',
    hasNoReferenceMovie: false,
    favoriteMovieWhy: '',
    era: '',
    moods: [],
    tone: '',
    favoriteActor: '',
    fastIntent: [],
    fastAvoids: [],
    fastDiscovery: '',
  };
}

export function toApiFormat(person: PersonAnswers) {
  const eraMap: Record<string, string> = {
    new: 'New',
    classic: 'Classic',
    both: 'Both new and classic',
  };
  const toneMap: Record<string, string> = {
    light: 'Light and fun',
    balanced: 'Balanced',
    serious: 'Serious and thought-provoking',
    dark: 'Dark and intense',
  };
  const trimmedName = person.name.trim().slice(0, PARTICIPANT_NAME_MAX_LENGTH);
  const favoriteMovie = person.hasNoReferenceMovie ? '' : person.favoriteMovie.trim();
  const avoidLabels = getAvoidLabels(person);
  const favoriteMovieWhy = [
    person.favoriteMovieWhy.trim(),
    avoidLabels.length > 0 ? `Avoid: ${avoidLabels.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 300);
  return {
    ...(trimmedName && { name: trimmedName }),
    favoriteMovie,
    ...(favoriteMovieWhy && { favoriteMovieWhy }),
    newVsClassic: eraMap[person.era] || person.era,
    moodPreference: person.moods.map((m) => GENRES.find((g) => g.id === m)?.label || m),
    tonePreference: toneMap[person.tone] || person.tone,
    ...(person.favoriteActor.trim() && { favoriteActor: person.favoriteActor.trim() }),
  };
}

export function toFastPickApiFormat(person: PersonAnswers) {
  const intentLabels = person.fastIntent.map((intent) => FAST_INTENT_API_LABELS[intent]);
  const avoidLabels = getAvoidLabels(person);
  const discoveryLabel = person.fastDiscovery
    ? FAST_DISCOVERY_API_LABELS[person.fastDiscovery]
    : FAST_DISCOVERY_API_LABELS.balanced;
  const tonePreference = person.fastIntent.some((intent) =>
    ['easy', 'funny', 'cozy'].includes(intent),
  )
    ? 'Light and fun'
    : person.fastIntent.some((intent) => ['gripping', 'dark'].includes(intent))
      ? 'Dark and intense'
      : person.fastIntent.includes('emotional')
        ? 'Serious and thought-provoking'
        : 'Balanced';
  const newVsClassic =
    person.fastDiscovery === 'safe'
      ? 'Proven hits and familiar crowd-pleasers'
      : person.fastDiscovery === 'surprise'
        ? 'Open to newer discoveries and unexpected picks'
        : 'Both new and classic';
  const favoriteMovieWhy = [
    `Fast Pick intent: ${intentLabels.join(', ') || 'Open'}.`,
    avoidLabels.length > 0 ? `Avoid: ${avoidLabels.join(', ')}.` : 'No hard avoids.',
    `Discovery appetite: ${discoveryLabel}.`,
  ]
    .join(' ')
    .slice(0, 300);

  return {
    ...(person.name.trim().slice(0, PARTICIPANT_NAME_MAX_LENGTH) && {
      name: person.name.trim().slice(0, PARTICIPANT_NAME_MAX_LENGTH),
    }),
    favoriteMovie: '',
    favoriteMovieWhy,
    newVsClassic,
    moodPreference: intentLabels.length > 0 ? intentLabels : ['Open'],
    tonePreference,
  };
}

export const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};
