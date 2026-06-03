import { FastAudience } from './FastAudience';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof FastAudience> = {
  title: 'Quiz/FastAudience',
  component: FastAudience,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Audience selection screen for Fast Pick before the short question flow starts.',
      },
    },
  },
  args: {
    onBack: () => {},
    onStartSolo: () => {},
    onStartDuo: () => {},
    onStartGroup: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FastAudience>;

export const Default: Story = {};
