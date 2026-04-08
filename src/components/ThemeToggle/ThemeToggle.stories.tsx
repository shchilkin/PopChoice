import { ThemeToggle } from './ThemeToggle';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';


const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Icon button that toggles between light and dark mode. Shows a Sun icon in dark mode and a Moon icon in light mode. Uses `usePCTheme` backed by `next-themes`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};

export const InNavContext: Story = {
  render: () => (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-xl"
      style={{
        background: 'var(--pc-header-bg)',
        border: '1px solid var(--pc-bd1)',
      }}
    >
      <span style={{ color: 'var(--pc-t2)', fontSize: '0.9rem' }}>PopChoice</span>
      <ThemeToggle />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'As it appears inside the sticky header navigation.' },
    },
  },
};
