import { ExpandedSuggestion } from './ExpandedSuggestion';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const mockMovie = {
  id: 3,
  name: 'Spirited Away',
  year: 2001,
  similarity: 0.92,
  age_rating: 'PG',
  duration: 125,
  score_rating: 8.6,
  posterURL: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  description:
    'Its dreamlike atmosphere and emotional depth align perfectly with your preference for visually stunning storytelling.',
};

const meta: Meta<typeof ExpandedSuggestion> = {
  title: 'Results/ExpandedSuggestion',
  component: ExpandedSuggestion,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'An expandable detail view for a movie suggestion. Shows poster thumbnail, title, metadata, star rating, similarity badge, and an AI-written explanation.',
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
type Story = StoryObj<typeof ExpandedSuggestion>;

export const Default: Story = {
  args: { movie: mockMovie },
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
    movie: { ...mockMovie, similarity: 0.98, score_rating: 9.0 },
  },
};

export const MinimalData: Story = {
  args: {
    movie: {
      id: 4,
      name: 'Blade Runner 2049',
      year: 2017,
      similarity: 0.85,
    },
  },
};
