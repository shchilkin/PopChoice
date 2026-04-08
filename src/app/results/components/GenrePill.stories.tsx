import { GenrePill } from './GenrePill';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof GenrePill> = {
  title: 'Results/GenrePill',
  component: GenrePill,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A small pill-shaped tag used to display genres or age ratings in movie cards.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Text to display inside the pill',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GenrePill>;

export const AgeRating: Story = {
  args: { label: 'PG-13' },
};

export const Genre: Story = {
  args: { label: 'Sci-Fi' },
};

export const Rated: Story = {
  args: { label: 'R' },
};
