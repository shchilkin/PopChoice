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

import type { PersonAnswers, Tone } from './types';

export const GENRES = [
  { id: 'action', label: 'Action', icon: Zap, color: '#FF9F1C' },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: '#F5C518' },
  { id: 'drama', label: 'Drama', icon: Film, color: '#8B5CF6' },
  { id: 'scifi', label: 'Sci-Fi', icon: FlaskConical, color: '#14B8A6' },
  { id: 'thriller', label: 'Thriller', icon: Ghost, color: '#EF4444' },
  { id: 'romance', label: 'Romance', icon: Heart, color: '#EC4899' },
  { id: 'horror', label: 'Horror', icon: Skull, color: '#6B7280' },
  { id: 'adventure', label: 'Adventure', icon: Globe, color: '#10B981' },
  { id: 'animation', label: 'Animation', icon: Star, color: '#A78BFA' },
  { id: 'documentary', label: 'Documentary', icon: Clock, color: '#60A5FA' },
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
    color: '#F5C518',
    grad: 'linear-gradient(135deg, #F5C51818, #FF9F1C18)',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Mix of everything',
    icon: CloudSun,
    color: '#14B8A6',
    grad: 'linear-gradient(135deg, #14B8A618, #60A5FA18)',
  },
  {
    id: 'serious',
    label: 'Serious',
    desc: 'Thought-provoking',
    icon: Star,
    color: '#8B5CF6',
    grad: 'linear-gradient(135deg, #8B5CF618, #A78BFA18)',
  },
  {
    id: 'dark',
    label: 'Dark & Intense',
    desc: 'Gripping, complex',
    icon: Moon,
    color: '#EF4444',
    grad: 'linear-gradient(135deg, #EF444418, #6B728018)',
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
  return {
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
