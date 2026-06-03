import { SmallSuggestionCard } from './SmallSuggestionCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const mockMovie = {
  id: 1,
  name: 'Inception',
  year: 2010,
  similarity: 0.94,
  age_rating: 'PG-13',
  duration: 148,
  score_rating: 8.8,
  posterURL: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
  description: 'A mind-bending heist film set within the architecture of dreams.',
};

const meta: Meta<typeof SmallSuggestionCard> = {
  title: 'Results/SmallSuggestionCard',
  component: SmallSuggestionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact movie suggestion card used in the horizontal carousel. Shows poster, title, metadata, and a match tier with exact score in the tooltip.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SmallSuggestionCard>;

export const Default: Story = {
  args: {
    movie: mockMovie,
    active: false,
    onClick: () => {},
  },
};

export const Active: Story = {
  args: {
    movie: mockMovie,
    active: true,
    onClick: () => {},
  },
};

export const NoPoster: Story = {
  args: {
    movie: { ...mockMovie, posterURL: undefined },
    active: false,
    onClick: () => {},
  },
};

export const HighMatch: Story = {
  args: {
    movie: { ...mockMovie, similarity: 0.98 },
    active: false,
    onClick: () => {},
  },
};

export const NoRating: Story = {
  args: {
    movie: { ...mockMovie, score_rating: undefined, age_rating: undefined },
    active: false,
    onClick: () => {},
  },
};
