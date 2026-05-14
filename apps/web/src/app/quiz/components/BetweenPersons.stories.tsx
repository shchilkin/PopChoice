import { BetweenPersons } from './BetweenPersons';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof BetweenPersons> = {
  title: 'Quiz/BetweenPersons',
  component: BetweenPersons,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Transition screen shown between people during group quiz mode. Prompts handing over the device.',
      },
    },
  },
  args: {
    completedCount: 1,
    totalPeople: 3,
    onNext: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof BetweenPersons>;

export const Default: Story = {
  args: {
    currentPersonName: 'Alice',
    nextPersonName: 'Bob',
  },
};
