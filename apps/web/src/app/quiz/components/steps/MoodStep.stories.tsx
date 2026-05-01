import { emptyPerson } from '../../constants';

import { MoodStep } from './MoodStep';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MoodStep> = {
  title: 'Quiz/Steps/MoodStep',
  component: MoodStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Step 3 — genre/mood multi-select grid. Users pick one or more genres from a 2-column grid of icon cards.',
      },
    },
  },
  args: {
    onUpdate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof MoodStep>;

export const NoneSelected: Story = {
  args: { person: emptyPerson('You') },
};

export const TwoSelected: Story = {
  args: {
    person: { ...emptyPerson('You'), moods: ['action', 'scifi'] },
  },
};

export const ManySelected: Story = {
  args: {
    person: { ...emptyPerson('You'), moods: ['comedy', 'drama', 'romance', 'adventure'] },
  },
};
