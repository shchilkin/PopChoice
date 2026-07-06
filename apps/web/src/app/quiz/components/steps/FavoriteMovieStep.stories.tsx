import { emptyPerson } from '../../constants';

import { FavoriteMovieStep } from './FavoriteMovieStep';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof FavoriteMovieStep> = {
  title: 'Quiz/Steps/FavoriteMovieStep',
  component: FavoriteMovieStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Optional reference-movie step with quick-pick chips and an optional "why" textarea.',
      },
    },
  },
  args: {
    onUpdate: () => {},
    onSubmit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FavoriteMovieStep>;

export const Empty: Story = {
  args: {
    person: emptyPerson('You'),
    canProceed: true,
  },
};

export const Filled: Story = {
  args: {
    person: {
      ...emptyPerson('You'),
      favoriteMovie: 'Inception',
      favoriteMovieWhy: 'Mind-bending plot',
    },
    canProceed: true,
  },
};
