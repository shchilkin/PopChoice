export type Era = 'new' | 'classic' | 'both';
export type Tone = 'light' | 'balanced' | 'serious' | 'dark';

export interface PersonAnswers {
  name: string;
  favoriteMovie: string;
  favoriteMovieWhy: string;
  era: Era | '';
  moods: string[];
  dislikedGenres: string[];
  tone: Tone | '';
  favoriteActor: string;
}

export type Phase = 'intro' | 'group-setup' | 'questions' | 'between-persons';
