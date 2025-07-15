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

export const Default: Story = {
  decorators: [
    (Story) => {
      // Mock localStorage for the story
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'popchoice_recommendation',
          JSON.stringify({
            title: 'The Godfather',
            description:
              'A masterpiece of cinema that explores themes of family, power, and loyalty.',
            posterURL:
              'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg',
          }),
        );
      }
      return <Story />;
    },
  ],
};

export const WithoutData: Story = {
  decorators: [
    (Story) => {
      // Clear localStorage for this story
      if (typeof window !== 'undefined') {
        localStorage.removeItem('popchoice_recommendation');
      }
      return <Story />;
    },
  ],
};
