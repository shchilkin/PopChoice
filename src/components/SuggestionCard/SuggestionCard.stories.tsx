import { SuggestionCard } from './SuggestionCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof SuggestionCard> = {
  title: 'Components/SuggestionCard',
  component: SuggestionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays a movie recommendation with title, AI-generated description, and optional poster image. Used inside the Results page to present each suggested film.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    posterURL: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof SuggestionCard>;

export const WithPoster: Story = {
  args: {
    title: 'Oppenheimer',
    description:
      "If you're in the mood for a gripping and intellectually stimulating film, Oppenheimer is your top pick. Directed by Christopher Nolan, this historical biopic dives deep into the life of J. Robert Oppenheimer — the film combines drama and history, offering a mesmerising journey with intense performances and a thought-provoking narrative.",
    posterURL: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  },
};

export const WithoutPoster: Story = {
  args: {
    title: 'Parasite',
    description:
      "Bong Joon-ho's darkly comic thriller about class, aspiration, and deception is a perfect fit for your taste profile. Rich in subtext and tension, it will keep you guessing right until the final frame.",
    posterURL: '',
  },
  parameters: {
    docs: {
      description: { story: 'Falls back gracefully when no poster URL is available.' },
    },
  },
};

export const ShortDescription: Story = {
  args: {
    title: 'The Matrix',
    description: 'A mind-bending sci-fi classic that defined a generation.',
    posterURL: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Everything Everywhere All at Once',
    description:
      'An absurdist multiverse epic that somehow manages to be deeply humanist. Perfectly matched to your love of films with both emotional depth and visual invention.',
    posterURL: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
  },
};
