import { Clapperboard, Play, Smile, Sparkles, Zap } from 'lucide-react';

import { palette } from '@/styles/designTokens';

import type { Movie } from '@/app/api/movies/route';
import type { MovieRecommendation } from '@/utils/client';

export const MOCK_TABLE_MOVIES: Movie[] = [
  { id: 1, name: 'Inception', year: 2010, age_rating: 'PG-13', duration: 148, score_rating: 8.8 },
  {
    id: 2,
    name: 'Interstellar',
    year: 2014,
    age_rating: 'PG-13',
    duration: 169,
    score_rating: 8.6,
  },
  {
    id: 3,
    name: 'The Dark Knight',
    year: 2008,
    age_rating: 'PG-13',
    duration: 152,
    score_rating: 9.0,
  },
  { id: 4, name: 'Parasite', year: 2019, age_rating: 'R', duration: 132, score_rating: 8.5 },
  {
    id: 5,
    name: 'The Grand Budapest Hotel',
    year: 2014,
    age_rating: 'R',
    duration: 99,
    score_rating: 8.1,
  },
];

export const MOCK_MOVIES: MovieRecommendation[] = [
  {
    id: 1,
    name: 'Inception',
    year: 2010,
    similarity: 0.97,
    score_rating: 8.8,
    age_rating: 'PG-13',
    duration: 148,
  },
  {
    id: 2,
    name: 'Interstellar',
    year: 2014,
    similarity: 0.94,
    score_rating: 8.6,
    age_rating: 'PG-13',
    duration: 169,
  },
  {
    id: 3,
    name: 'The Dark Knight',
    year: 2008,
    similarity: 0.91,
    score_rating: 9.0,
    age_rating: 'PG-13',
    duration: 152,
  },
];

export const GENRES = [
  { id: 'action', label: 'Action', icon: Zap, color: palette.amber },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: palette.gold },
  { id: 'drama', label: 'Drama', icon: Play, color: palette.purple },
  { id: 'scifi', label: 'Sci-Fi', icon: Sparkles, color: palette.teal },
];

export const TONES = [
  {
    id: 'light',
    label: 'Light & Fun',
    desc: 'Easy going, uplifting',
    icon: Sparkles,
    color: palette.gold,
    grad: `linear-gradient(135deg, ${palette.gold}18, ${palette.amber}18)`,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Mix of everything',
    icon: Play,
    color: palette.teal,
    grad: `linear-gradient(135deg, ${palette.teal}18, ${palette.blue}18)`,
  },
  {
    id: 'serious',
    label: 'Serious',
    desc: 'Deep and meaningful',
    icon: Play,
    color: palette.purple,
    grad: `linear-gradient(135deg, ${palette.purple}18, ${palette.purpleLight}18)`,
  },
  {
    id: 'dark',
    label: 'Dark',
    desc: 'Intense and gritty',
    icon: Clapperboard,
    color: palette.gray,
    grad: `linear-gradient(135deg, ${palette.gray}18, ${palette.red}18)`,
  },
];

export const ERAS = [
  { id: 'new', emoji: '✨', title: 'New Releases', desc: 'Post-2010', color: palette.teal },
  { id: 'classic', emoji: '🎞️', title: 'Classics', desc: 'Pre-2000', color: palette.gold },
  { id: 'both', emoji: '🎬', title: 'Any Era', desc: 'No preference', color: palette.purple },
];
