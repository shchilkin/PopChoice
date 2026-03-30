import { MovieSearch } from './MovieSearch';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MovieSearch> = {
  title: 'Components/MovieSearch',
  component: MovieSearch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A search component for filtering movies by title and release year range with debounced input.',
      },
    },
  },
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Whether the search is in a loading state',
    },
  },
  args: {
    onSearch: () => {},
    onClear: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
