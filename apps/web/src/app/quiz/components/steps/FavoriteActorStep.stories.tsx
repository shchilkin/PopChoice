import { emptyPerson } from '../../constants';

import { FavoriteActorStep } from './FavoriteActorStep';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof FavoriteActorStep> = {
  title: 'Quiz/Steps/FavoriteActorStep',
  component: FavoriteActorStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Step 5 — optional favorite actor input with quick-pick chips for popular actors.',
      },
    },
  },
  args: {
    onUpdate: () => {},
    onSubmit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FavoriteActorStep>;

export const Empty: Story = {
  args: { person: emptyPerson('You') },
};

export const Filled: Story = {
  args: {
    person: { ...emptyPerson('You'), favoriteActor: 'Tom Hanks' },
  },
};
