import { SimilarityBadge } from './SimilarityBadge';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof SimilarityBadge> = {
  title: 'Results/SimilarityBadge',
  component: SimilarityBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A colored badge showing the match percentage. Color changes based on similarity: teal (95%+), gold (90%+), amber (85%+), or purple (below 85%).',
      },
    },
  },
  argTypes: {
    similarity: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Similarity score between 0 and 1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimilarityBadge>;

export const Excellent: Story = {
  args: { similarity: 0.97 },
};

export const Great: Story = {
  args: { similarity: 0.92 },
};

export const Good: Story = {
  args: { similarity: 0.87 },
};

export const Moderate: Story = {
  args: { similarity: 0.78 },
};
