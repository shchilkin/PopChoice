import { SuggestionCard } from './SuggestionCard';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof SuggestionCard> = {
  title: 'Components/SuggestionCard',
  component: SuggestionCard,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SuggestionCard>;

export const CardWithPoster: Story = {
  args: {
    title: 'Oppenheimer',
    description: `Hey there! If you're in the mood for a gripping and intellectually stimulating film, "Oppenheimer" is your top pick! Directed by Christopher Nolan, this historical biopic dives deep into the life of J. Robert Oppenheimer, the father of the atomic bomb. The film combines drama and history, offering a mesmerizing journey with intense performances and a thought-provoking narrative. It's perfect if you love films that challenge the mind and captivate with their depth.`,
    posterURL: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  },
};
