import React from 'react';
import { userEvent, within } from 'storybook/test';

import { Mascot } from './Maskot';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const fixedSizeDecorator = (Story: React.ComponentType) => (
  <div
    style={{
      width: 320,
      height: 320,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 16,
    }}
  >
    <Story />
  </div>
);

const meta: Meta<typeof Mascot> = {
  title: 'Maskot/Popcorn',
  component: Mascot,
  argTypes: {
    firstStripeColor: { control: 'color' },
    secondStripeColor: { control: 'color' },
  },
  decorators: [fixedSizeDecorator],
};

export default meta;

type Story = StoryObj<typeof Mascot>;

export const Default: Story = {
  args: {},
};

export const ConfettiInteraction: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mascot = canvas.getByRole('button');

    // Click on the mascot to trigger confetti
    await userEvent.click(mascot);
    await userEvent.click(mascot);
    await userEvent.click(mascot);

    // Wait a bit and click again to show multiple confetti bursts
    await new Promise((resolve) => setTimeout(resolve, 500));
    await userEvent.click(mascot);
  },
};

export const CustomStripes: Story = {
  args: {
    firstStripeColor: '#0070f3',
    secondStripeColor: '#ffe600',
  },
};
