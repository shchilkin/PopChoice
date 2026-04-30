import { Breadcrumbs } from './Breadcrumbs';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Navigation trail showing the current page hierarchy. Non-last items with an `href` render as links; the last item renders as plain text (current page).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const SingleItem: Story = {
  args: {
    items: [{ label: 'About' }],
  },
  parameters: {
    docs: {
      description: { story: 'Top-level page with no parent.' },
    },
  },
};

export const TwoLevels: Story = {
  args: {
    items: [{ href: '/about', label: 'About' }, { label: 'Stack' }],
  },
  parameters: {
    docs: {
      description: { story: 'Child page — first item links to parent, last item is current.' },
    },
  },
};

export const ThreeLevels: Story = {
  args: {
    items: [
      { href: '/', label: 'Home' },
      { href: '/style-guide', label: 'Style Guide' },
      { label: 'Components' },
    ],
  },
};
