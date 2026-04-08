import { TopNavigation } from './TopNavigation';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof TopNavigation> = {
  title: 'Components/TopNavigation',
  component: TopNavigation,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '**Legacy navigation bar** used on `/movie-questionnaire`, `/movie-suggestion`, and `/available-movies`. New pages (`/`, `/quiz`, `/results`, `/about`) use `PCLayout` instead. Still maintained for the legacy routes.',
      },
    },
  },
  argTypes: {
    minimizeMode: {
      control: 'boolean',
      description: 'Hide navigation links and show only logo/brand',
    },
    logoSize: {
      control: { type: 'range', min: 40, max: 100, step: 10 },
      description: 'Size of the logo in pixels',
    },
    firstStripeColor: {
      control: 'color',
      description: 'Primary colour for the mascot cup stripes',
    },
    secondStripeColor: {
      control: 'color',
      description: 'Secondary colour for the mascot cup stripes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TopNavigation>;

export const Default: Story = {
  args: { firstStripeColor: '#f20000', secondStripeColor: '#fff', logoSize: 60 },
};

export const WithNavigation: Story = {
  args: {
    firstStripeColor: '#f20000',
    secondStripeColor: '#fff',
    logoSize: 60,
    minimizeMode: false,
  },
};

export const MinimizeMode: Story = {
  args: {
    firstStripeColor: '#f20000',
    secondStripeColor: '#fff',
    logoSize: 60,
    minimizeMode: true,
  },
  parameters: {
    docs: {
      description: { story: 'Used on the `/movie-suggestion` results page — hides nav links.' },
    },
  },
};

export const LargeLogoSize: Story = {
  args: { firstStripeColor: '#f20000', secondStripeColor: '#fff', logoSize: 80 },
};

export const SmallLogoSize: Story = {
  args: { firstStripeColor: '#f20000', secondStripeColor: '#fff', logoSize: 40 },
};

export const MobileView: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <TopNavigation {...args} />
    </div>
  ),
  args: { firstStripeColor: '#f20000', secondStripeColor: '#fff', logoSize: 60 },
};
