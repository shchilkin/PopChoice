import {
  Clock,
  CloudSun,
  Film,
  FlaskConical,
  Ghost,
  Globe,
  Heart,
  Moon,
  Skull,
  Smile,
  Star,
  Sun,
  Zap,
} from 'lucide-react';

import { PARTICIPANT_NAME_MAX_LENGTH } from '@/features/recommendation/limits';
import { palette } from '@/styles/designTokens';

import type { PersonAnswers, Tone } from './types';

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

export const QUESTION_LABELS = [
  'Favorite film',
  'Old or new?',
  'Your mood',
  'Pick a tone',
  'Favorite actor',
];

export function emptyPerson(name = ''): PersonAnswers {
  return {
    name,
    favoriteMovie: '',
    favoriteMovieWhy: '',
    era: '',
    moods: [],
    tone: '',
    favoriteActor: '',
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
  return {
    ...(trimmedName && { name: trimmedName }),
    favoriteMovie: person.favoriteMovie,
    ...(person.favoriteMovieWhy.trim() && { favoriteMovieWhy: person.favoriteMovieWhy.trim() }),
    newVsClassic: eraMap[person.era] || person.era,
    moodPreference: person.moods.map((m) => GENRES.find((g) => g.id === m)?.label || m),
    tonePreference: toneMap[person.tone] || person.tone,
    ...(person.favoriteActor.trim() && { favoriteActor: person.favoriteActor.trim() }),
  };
}

export const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};
