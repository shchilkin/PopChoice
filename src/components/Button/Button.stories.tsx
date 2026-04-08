import { Button } from './Button';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';


const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'General-purpose button with three variants: `default` (accent fill), `cta` (gold gradient — primary call-to-action), and `ghost` (transparent + border). All variants respect the active theme tokens.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'cta', 'ghost'],
      description: 'Visual style of the button',
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Find My Movie', variant: 'default' },
};

export const CTA: Story = {
  args: { children: '▶ Find My Movie', variant: 'cta' },
  parameters: {
    docs: {
      description: { story: 'Primary call-to-action using the gold gradient from `--pc-cta`.' },
    },
  },
};

export const Ghost: Story = {
  args: { children: 'How it works', variant: 'ghost' },
  parameters: {
    docs: {
      description: { story: 'Subtle secondary action — transparent with a soft border.' },
    },
  },
};

export const Disabled: Story = {
  args: { children: 'Continue', variant: 'cta', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-xs">
      <Button variant="cta">▶ Find My Movie</Button>
      <Button variant="default">Submit</Button>
      <Button variant="ghost">How it works</Button>
      <Button variant="cta" disabled>
        Loading…
      </Button>
    </div>
  ),
  parameters: { controls: { disable: true } },
};
