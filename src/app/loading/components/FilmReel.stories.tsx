import { FilmReel } from './FilmReel';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof FilmReel> = {
  title: 'Loading/FilmReel',
  component: FilmReel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Animated loading indicator shown while the AI recommendation engine processes quiz data. Features rotating rings and pulsing popcorn kernels.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FilmReel>;

export const Default: Story = {};
