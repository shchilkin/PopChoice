import { StarRating } from './StarRating';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof StarRating> = {
  title: 'Results/StarRating',
  component: StarRating,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a 5-star rating mapped from a 0–10 score. Stars are filled with gold (#F5C518) based on the rounded score.',
      },
    },
  },
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
      description: 'Movie score on a 0–10 scale',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const Perfect: Story = {
  args: { score: 10 },
};

export const High: Story = {
  args: { score: 8 },
};

export const Medium: Story = {
  args: { score: 5 },
};

export const Low: Story = {
  args: { score: 2 },
};

export const Zero: Story = {
  args: { score: 0 },
};
