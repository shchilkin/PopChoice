import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { QuestionCard } from './QuestionCard';

import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';

const fixedWidthDecorator: Decorator = (Story) => (
  <div className="max-w-md mx-auto p-6 bg-white rounded-lg ">
    <Story />
  </div>
);

// Decorator to make the component work with controlled state
const withControlledState: Decorator = (Story, context) => {
  const [value, setValue] = useState(context.args.value || '');

  return (
    <Story
      args={{
        ...context.args,
        value,
        onChange: setValue,
      }}
    />
  );
};

const meta: Meta = {
  title: 'Components/QuestionCard',
  component: QuestionCard,
  decorators: [fixedWidthDecorator, withControlledState],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyTextArea: Story = {
  args: {
    label: "What's your favorite movie and why?",
    placeholder:
      'Share your thoughts on your favorite movie, including its plot, characters, and what makes it special to you.',
  },
};

export const WithMaxLength: Story = {
  args: {
    label: "What's your favorite movie and why?",
    placeholder:
      'Share your thoughts on your favorite movie, including its plot, characters, and what makes it special to you.',
    maxLength: 322,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Which famous film person would you love to be stranded on an island with and why?',
    placeholder: 'Tom Hanks because he is really funny and can do the voice of Woody',
    maxLength: 150,
    helperText: '(auto-suggest)',
  },
};

export const NearCharacterLimit: Story = {
  args: {
    label: "What's your favorite movie and why?",
    placeholder: 'Share your thoughts...',
    maxLength: 150,
    value:
      'The Shawshank Redemption is my favorite movie because it tells an incredible story of hope, friendship, and perseverance that really resonates with me.',
  },
};

export const FilledTextArea: Story = {
  args: {
    label: "What's your favorite movie and why?",
    placeholder: 'Share your thoughts...',
    maxLength: 200,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByPlaceholderText(/share your thoughts/i);
    const userText =
      'The Shawshank Redemption is my favorite movie because it tells an incredible story of hope, friendship, and perseverance that really resonates with me.';

    // Type the text
    await userEvent.type(textarea, userText, { delay: 20 });

    // Assert that the textarea contains the user-typed value
    expect(textarea).toHaveValue(userText);
  },
};

export const ExpandedTextArea: Story = {
  args: {
    label: 'Describe your most memorable movie experience and why it stood out to you.',
    placeholder: 'Share a detailed story or feeling about a movie that left a lasting impression.',
    maxLength: 300,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByPlaceholderText(/lasting impression/i);
    const longText =
      'I remember watching The Lord of the Rings: The Return of the King in theaters. The epic battles, emotional farewells, and stunning visuals made it unforgettable. I was so immersed that I barely noticed the passage of time.';

    // Type the text
    await userEvent.type(textarea, longText, { delay: 10 });

    // Wait for the textarea to expand and value to match
    await waitFor(() => {
      expect(textarea).toHaveValue(longText);
      // Optionally, check that the textarea height increased (expansion)
      expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight);
    });
  },
};

export const CharacterLimitWarning: Story = {
  args: {
    label: "What's your favorite movie and why?",
    placeholder: 'Share your thoughts...',
    maxLength: 100,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByPlaceholderText(/share your thoughts/i);
    // Type text that approaches the character limit to show warning color
    const nearLimitText =
      'The Shawshank Redemption is my favorite movie because it tells an incredible story of hope and';
    await userEvent.type(textarea, nearLimitText, { delay: 20 });

    // Wait for character counter to update and show warning color
    await waitFor(() => {
      const characterCounter = canvas.getByText(/\d+\/100/);
      expect(characterCounter).toBeInTheDocument();
    });
  },
};
