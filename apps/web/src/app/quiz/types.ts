export type Era = 'new' | 'classic' | 'both';
export type Tone = 'light' | 'balanced' | 'serious' | 'dark';
export type FastIntent = 'easy' | 'funny' | 'gripping' | 'emotional' | 'weird' | 'cozy' | 'dark';
export type FastAvoid =
  | 'horror'
  | 'gore'
  | 'slow'
  | 'subtitles'
  | 'long'
  | 'obvious'
  | 'obscure'
  | 'alreadySeen';
export type FastDiscovery = 'safe' | 'balanced' | 'surprise';

export interface PersonAnswers {
  name: string;
  favoriteMovie: string;
  hasNoReferenceMovie: boolean;
  favoriteMovieWhy: string;
  era: Era | '';
  moods: string[];
  tone: Tone | '';
  favoriteActor: string;
  fastIntent: FastIntent[];
  fastAvoids: FastAvoid[];
  fastDiscovery: FastDiscovery | '';
}
