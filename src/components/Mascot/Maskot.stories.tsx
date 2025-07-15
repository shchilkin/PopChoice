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
    firstStripeColor: '#ff595e',
    secondStripeColor: '#ffca3a',
  },
};

export const Scheme3: Story = {
  args: {
    firstStripeColor: '#d7263d',
    secondStripeColor: '#f46036',
  },
};

export const Scheme4: Story = {
  args: {
    firstStripeColor: '#720026',
    secondStripeColor: '#ce4257',
  },
};

export const Scheme5: Story = {
  args: {
    firstStripeColor: '#ffb4a2',
    secondStripeColor: '#ffe5d9',
  },
};

export const Scheme6: Story = {
  args: {
    firstStripeColor: '#ff006e',
    secondStripeColor: '#fbb13c',
  },
};

export const Scheme7: Story = {
  args: {
    firstStripeColor: '#c9184a',
    secondStripeColor: '#ffb700',
  },
};

export const Scheme8: Story = {
  args: {
    firstStripeColor: '#6a4c93',
    secondStripeColor: '#f6e27a',
  },
};

export const Scheme9: Story = {
  args: {
    firstStripeColor: '#ff1654',
    secondStripeColor: '#f9dc5c',
  },
};

export const Scheme10: Story = {
  args: {
    firstStripeColor: '#ff6f61',
    secondStripeColor: '#f7cac9',
  },
};
