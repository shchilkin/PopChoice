import MovieSuggestionPage from './page';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MovieSuggestionPage> = {
  title: 'Pages/Movie Suggestion Page',
  component: MovieSuggestionPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof MovieSuggestionPage>;

export const Default: Story = {};
