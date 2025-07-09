import { SuggestionCard } from './SuggestionCard';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof SuggestionCard> = {
  title: 'Components/SuggestionCard',
  component: SuggestionCard,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SuggestionCard>;

export const Default: Story = {
  args: {
    title: 'Inception',
    description: 'A mind-bending thriller by Christopher Nolan about dreams within dreams.',
  },
};

export const ShortDescription: Story = {
  args: {
    title: 'Up',
    description: 'Adventure awaits!',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'The Lord of the Rings',
    description:
      'An epic fantasy adventure that follows Frodo Baggins and the Fellowship as they journey to destroy the One Ring in the fires of Mount Doom.',
  },
};
