import { emptyPerson } from '../../constants';

import { ToneStep } from './ToneStep';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof ToneStep> = {
  title: 'Quiz/Steps/ToneStep',
  component: ToneStep,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Step 4 — tone preference selector. Four gradient cards: Light & Fun, Balanced, Serious, Dark & Intense.',
      },
    },
  },
  args: {
    onUpdate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ToneStep>;

export const NoneSelected: Story = {
  args: { person: emptyPerson('You') },
};

export const LightSelected: Story = {
  args: { person: { ...emptyPerson('You'), tone: 'light' } },
};

export const DarkSelected: Story = {
  args: { person: { ...emptyPerson('You'), tone: 'dark' } },
};
