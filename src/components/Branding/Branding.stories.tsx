import { Branding } from './Branding';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof Branding> = {
  title: 'Components/Branding',
  component: Branding,
  tags: ['autodocs'],
  argTypes: {
    firstStripeColor: {
      control: 'color',
      description: 'Primary stripe color for the mascot popcorn',
    },
    secondStripeColor: {
      control: 'color',
      description: 'Secondary stripe color for the mascot popcorn',
    },
    mascotSize: {
      control: { type: 'range', min: 60, max: 300, step: 10 },
      description: 'Width and height of the mascot in pixels',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Branding>;

export const Default: Story = {};

export const CustomColors: Story = {
  args: {
    firstStripeColor: '#0066cc',
    secondStripeColor: '#ffeb3b',
  },
};

export const LargeSize: Story = {
  args: {
    mascotSize: 240,
  },
};

export const SmallSize: Story = {
  args: {
    mascotSize: 100,
  },
};
