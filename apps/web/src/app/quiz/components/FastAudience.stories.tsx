import { FastAudience } from './FastAudience';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof FastAudience> = {
  title: 'Quiz/AudienceChoice',
  component: FastAudience,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Audience selection screen shown after users choose Fast Pick or Normal Match depth.',
      },
    },
  },
  args: {
    flow: 'fast',
    onBack: () => {},
    onStartSolo: () => {},
    onStartDuo: () => {},
    onStartGroup: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FastAudience>;

export const FastPick: Story = {};

export const NormalMatch: Story = {
  args: { flow: 'normal' },
};
