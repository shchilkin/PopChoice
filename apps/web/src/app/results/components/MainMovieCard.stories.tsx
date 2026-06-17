import { expect, userEvent, within } from 'storybook/test';

import { MainMovieCard } from './MainMovieCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const mockMovie = {
  id: 1,
  name: 'Parasite',
  year: 2019,
  similarity: 0.97,
  age_rating: 'R',
  duration: 132,
  score_rating: 8.5,
  posterURL: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  description:
    'This film perfectly matches your taste for dark, genre-bending narratives with sharp social commentary.',
  isMainRecommendation: true,
};

const meta: Meta<typeof MainMovieCard> = {
  title: 'Results/MainMovieCard',
  component: MainMovieCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The hero recommendation card shown for the top match. Displays poster with gradient overlay, title, metadata, score, match tier badge, and AI-generated description.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MainMovieCard>;

export const WithPoster: Story = {
  args: { movie: mockMovie },
};

export const PosterLightboxOpen: Story = {
  args: { movie: mockMovie },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Poster' }));

    const dialog = within(document.body).getByRole('dialog', { name: 'Poster for Parasite' });
    await expect(within(dialog).getByText('Parasite')).toBeVisible();
  },
};

export const NoPoster: Story = {
  args: {
    movie: { ...mockMovie, posterURL: undefined },
  },
};

export const NoDescription: Story = {
  args: {
    movie: { ...mockMovie, description: undefined },
  },
};

export const HighMatch: Story = {
  args: {
    movie: { ...mockMovie, similarity: 0.99, score_rating: 9.2 },
  },
};

export const MinimalData: Story = {
  args: {
    movie: {
      id: 2,
      name: 'The Matrix',
      year: 1999,
      similarity: 0.88,
    },
  },
};
