import { ProgressDots } from './ProgressDots';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof ProgressDots> = {
  title: 'Components/ProgressDots',
  component: ProgressDots,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A progress indicator using dots with a sliding active state. The current step is shown as an elongated gold gradient dot.',
      },
    },
  },
  argTypes: {
    current: {
      control: { type: 'range', min: 0, max: 9 },
      description: 'Zero-based index of the current step',
    },
    total: {
      control: { type: 'range', min: 1, max: 10 },
      description: 'Total number of steps',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressDots>;

export const Default: Story = {
  args: { current: 0, total: 5 },
};

export const MiddleStep: Story = {
  args: { current: 2, total: 5 },
};

export const LastStep: Story = {
  args: { current: 4, total: 5 },
};

export const ThreeSteps: Story = {
  args: { current: 1, total: 3 },
};
