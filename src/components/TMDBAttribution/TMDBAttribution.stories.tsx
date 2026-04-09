import { TMDBAttribution } from './TMDBAttribution';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof TMDBAttribution> = {
  title: 'Components/TMDBAttribution',
  component: TMDBAttribution,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Required TMDB attribution footer. Must be displayed on any page that fetches movie data from The Movie Database API.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TMDBAttribution>;

export const Default: Story = {};

export const InPageFooter: Story = {
  render: () => (
    <div
      className="p-8 rounded-2xl max-w-xl"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
    >
      <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', marginBottom: 20 }}>
        Results are AI-generated based on your taste profile.
      </p>
      <TMDBAttribution />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'As rendered at the bottom of the Results and About pages.' },
    },
  },
};
