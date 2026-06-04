import type { Movie } from '@/features/movies/catalog';
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
