import React from 'react';

import Mascot from './Maskot';

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
  title: 'Mascot/Popcorn',
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

export const CustomStripes: Story = {
  args: {
    firstStripeColor: '#0070f3',
    secondStripeColor: '#ffe600',
  },
};

export const Scheme1: Story = {
  args: {
    firstStripeColor: '#e63946',
    secondStripeColor: '#f1faee',
  },
};

export const Scheme2: Story = {
  args: {
    firstStripeColor: '#ff4500',
    secondStripeColor: '#00bfff',
  },
};

export const Scheme3: Story = {
  args: {
    firstStripeColor: '#8a2be2',
    secondStripeColor: '#ffff00',
  },
};

export const Scheme4: Story = {
  args: {
    firstStripeColor: '#ff1493',
    secondStripeColor: '#00fa9a',
  },
};

export const Scheme5: Story = {
  args: {
    firstStripeColor: '#ff6347',
    secondStripeColor: '#40e0d0',
  },
};

export const Scheme6: Story = {
  args: {
    firstStripeColor: '#9932cc',
    secondStripeColor: '#ffd700',
  },
};

export const Scheme7: Story = {
  args: {
    firstStripeColor: '#dc143c',
    secondStripeColor: '#00ced1',
  },
};

export const Scheme8: Story = {
  args: {
    firstStripeColor: '#ff4500',
    secondStripeColor: '#32cd32',
  },
};

export const Scheme9: Story = {
  args: {
    firstStripeColor: '#8b00ff',
    secondStripeColor: '#ff8c00',
  },
};

export const Scheme10: Story = {
  args: {
    firstStripeColor: '#e91e63',
    secondStripeColor: '#00e676',
  },
};
