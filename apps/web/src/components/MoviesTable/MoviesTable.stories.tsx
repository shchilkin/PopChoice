import { MoviesTable } from './MoviesTable';

import type { Movie } from '@/features/movies/catalog';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MoviesTable> = {
  title: 'Components/MoviesTable',
  component: MoviesTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A table component for displaying paginated movie data with age ratings, duration, and scores.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof MoviesTable>;

// Sample movie data for stories
const sampleMovies: Movie[] = [
  {
    id: 1,
    name: 'Casablanca',
    age_rating: 'PG',
    duration: 102,
    score_rating: 8.5,
    year: 1942,
  },
  {
    id: 2,
    name: 'Seven Samurai',
    age_rating: 'NR',
    duration: 207,
    score_rating: 8.6,
    year: 1954,
  },
  {
    id: 3,
    name: 'The Godfather',
    age_rating: 'R',
    duration: 175,
    score_rating: 9.2,
    year: 1972,
  },
  {
    id: 4,
    name: "One Flew Over the Cuckoo's Nest",
    age_rating: '15',
    duration: 133,
    score_rating: 8.7,
    year: 1975,
  },
  {
    id: 5,
    name: 'Star Wars: Episode IV - A New Hope',
    age_rating: 'G',
    duration: 125,
    score_rating: 8.6,
    year: 1977,
  },
  {
    id: 6,
    name: 'Blade Runner',
    age_rating: '16+',
    duration: 117,
    score_rating: 8.1,
    year: 1982,
  },
  {
    id: 7,
    name: 'E.T. the Extra-Terrestrial',
    age_rating: 'PG-13',
    duration: 115,
    score_rating: 7.9,
    year: 1982,
  },
  {
    id: 8,
    name: 'Pulp Fiction',
    age_rating: '18+',
    duration: 154,
    score_rating: 8.9,
    year: 1994,
  },
  {
    id: 9,
    name: 'Toy Story',
    age_rating: '12+',
    duration: 81,
    score_rating: 8.3,
    year: 1995,
  },
];

export const Default: Story = {
  args: {
    movies: sampleMovies,
  },
};

export const EmptyTable: Story = {
  args: {
    movies: [],
  },
};

export const SingleMovie: Story = {
  args: {
    movies: [sampleMovies[0]],
  },
};

export const VariousRatings: Story = {
  args: {
    movies: sampleMovies.slice(0, 5),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows movies with different age ratings using the AgeRatingChip component: PG (caution), NR (unknown), R (mature), 15 (mature), G (safe). Each rating uses semantic color tokens.',
      },
    },
  },
};

export const LongDurations: Story = {
  args: {
    movies: [
      {
        id: 10,
        name: 'Lawrence of Arabia',
        age_rating: 'PG',
        duration: 228, // 3h 48m
        score_rating: 8.3,
        year: 1962,
      },
      {
        id: 11,
        name: 'Gone with the Wind',
        age_rating: 'G',
        duration: 238, // 3h 58m
        score_rating: 8.2,
        year: 1939,
      },
      {
        id: 12,
        name: 'Short Film',
        age_rating: 'NR',
        duration: 15, // 15m
        score_rating: 7.0,
        year: 2023,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates duration formatting for various movie lengths: very long (3h 48m, 3h 58m) and short (15m) films.',
      },
    },
  },
};
