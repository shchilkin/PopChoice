import { Branding } from './Branding';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';


const meta: Meta<typeof Branding> = {
  title: 'Components/Branding',
  component: Branding,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Logo lockup: PopcornMascot + "PopChoice" wordmark in Bebas Neue with gradient text. Mascot stripe colours are configurable for customisation.',
      },
    },
  },
  argTypes: {
    firstStripeColor: { control: 'color', description: 'First stripe colour on the mascot cup' },
    secondStripeColor: { control: 'color', description: 'Second stripe colour on the mascot cup' },
    mascotSize: { control: { type: 'range', min: 60, max: 300, step: 10 }, description: 'Mascot size in px' },
  },
};

export default meta;
type Story = StoryObj<typeof Branding>;

export const Default: Story = {};

export const LargeSize: Story = {
  args: { mascotSize: 240 },
};

export const SmallSize: Story = {
  args: { mascotSize: 80 },
};

export const CustomColors: Story = {
  args: { firstStripeColor: '#8B5CF6', secondStripeColor: '#14B8A6', mascotSize: 160 },
  parameters: {
    docs: {
      description: { story: 'Custom stripe colours for seasonal or branded variants.' },
    },
  },
};

export const GoldBrand: Story = {
  args: { firstStripeColor: '#F5C518', secondStripeColor: '#FF9F1C', mascotSize: 160 },
};
