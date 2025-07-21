import { MovieGrid, type MovieRecommendation } from './MovieGrid';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MovieGrid> = {
  title: 'Components/MovieGrid',
  component: MovieGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title for the movie grid section',
    },
    movies: {
      control: 'object',
      description: 'Array of movie recommendations to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockMovies: MovieRecommendation[] = [
  {
    id: 1,
    name: 'The Matrix',
    year: 1999,
    similarity: 0.95,
    age_rating: 'R',
    duration: 136,
    score_rating: 8.7,
    posterURL: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  },
  {
    id: 2,
    name: 'Blade Runner 2049',
    year: 2017,
    similarity: 0.89,
    age_rating: 'R',
    duration: 164,
    score_rating: 8.0,
    posterURL: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  },
  {
    id: 3,
    name: 'Inception',
    year: 2010,
    similarity: 0.87,
    age_rating: 'PG-13',
    duration: 148,
    score_rating: 8.8,
    posterURL: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  },
];

export const Default: Story = {
  args: {
    title: 'Recommended Movies For You',
    movies: mockMovies,
  },
};

export const SingleMovie: Story = {
  args: {
    title: 'Your Perfect Match',
    movies: [mockMovies[0]],
  },
};

export const EmptyState: Story = {
  args: {
    title: 'Movie Recommendations',
    movies: [],
  },
};

export const WithoutPosters: Story = {
  args: {
    title: 'Movies Without Posters',
    movies: mockMovies.map((movie) => ({ ...movie, posterURL: undefined })),
  },
};

export const ManyMovies: Story = {
  args: {
    title: 'All Your Matches',
    movies: [
      ...mockMovies,
      {
        id: 4,
        name: 'Ex Machina',
        year: 2014,
        similarity: 0.85,
        age_rating: 'R',
        duration: 108,
        score_rating: 7.7,
        posterURL: 'https://image.tmdb.org/t/p/w500/9gWlKzItn3CGg3JWnyJKoEu9VLi.jpg',
      },
      {
        id: 5,
        name: 'Her',
        year: 2013,
        similarity: 0.82,
        age_rating: 'R',
        duration: 126,
        score_rating: 8.0,
        posterURL: 'https://image.tmdb.org/t/p/w500/lEIaL12hSkqqe83kgADkbUqEnvk.jpg',
      },
    ],
  },
};
