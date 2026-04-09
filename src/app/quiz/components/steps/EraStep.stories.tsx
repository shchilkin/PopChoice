import { emptyPerson } from '../../constants';

import { EraStep } from './EraStep';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof EraStep> = {
  title: 'Quiz/Steps/EraStep',
  component: EraStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Step 2 — new releases vs timeless classics. Three radio-style cards with emoji and descriptions.',
      },
    },
  },
  args: {
    onUpdate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof EraStep>;

export const NoneSelected: Story = {
  args: { person: emptyPerson('You') },
};

export const NewSelected: Story = {
  args: { person: { ...emptyPerson('You'), era: 'new' } },
};

export const ClassicSelected: Story = {
  args: { person: { ...emptyPerson('You'), era: 'classic' } },
};

export const BothSelected: Story = {
  args: { person: { ...emptyPerson('You'), era: 'both' } },
};
