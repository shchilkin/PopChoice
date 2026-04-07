import { TMDBAttribution } from './TMDBAttribution';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof TMDBAttribution> = {
  title: 'Components/TMDBAttribution',
  component: TMDBAttribution,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Attribution component for The Movie Database (TMDB). Displays the TMDB logo, a disclaimer that PopChoice is not endorsed by TMDB, and a link to the TMDB website.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof TMDBAttribution>;

export const Default: Story = {};
