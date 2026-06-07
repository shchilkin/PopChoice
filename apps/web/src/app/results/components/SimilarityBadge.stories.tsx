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
          'A colored badge showing a calibrated qualitative match tier without exposing raw experimental similarity percentages.',
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

export const Strong: Story = {
  args: { similarity: 0.97 },
};

export const Good: Story = {
  args: { similarity: 0.44 },
};

export const Possible: Story = {
  args: { similarity: 0.32 },
};

export const Wildcard: Story = {
  args: { similarity: 0.18 },
};
