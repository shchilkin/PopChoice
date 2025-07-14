import { QuestionCard } from './QuestionCard';
import type { Meta, StoryObj, Decorator } from '@storybook/nextjs-vite';
import { userEvent, within, expect, waitFor } from 'storybook/test';

const fixedWidthDecorator: Decorator = (Story) => (
  <div className="max-w-md mx-auto p-6 bg-white rounded-lg ">
    <Story />
  </div>
);

const meta: Meta = {
  title: 'Components/QuestionCard',
  component: QuestionCard,
  decorators: [fixedWidthDecorator],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyTextArea: Story = {
  args: {
    label: 'Sample Question',
    placeholder: 'This is a sample description for the question.',
  },
};

export const FilledTextArea: Story = {
  args: {
    label: 'Sample Question',
    placeholder: 'This is a sample description for the question.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Simulate user typing in the input field
    const input = canvas.getByPlaceholderText(/sample description/i);
    const userText = 'This is my answer to the question.';
    await userEvent.type(input, userText, { delay: 80 });
    // Assert that the input contains the user-typed value
    expect(input).toHaveValue(userText);
  },
};

export const ExpandedTextArea: Story = {
  args: {
    label: 'Describe your most memorable movie experience and why it stood out to you.',
    placeholder: 'Share a detailed story or feeling about a movie that left a lasting impression.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText(/lasting impression/i);
    const longText = `I remember watching "The Lord of the Rings: The Return of the King" in theaters. The epic battles, emotional farewells, and stunning visuals made it unforgettable. I was so immersed that I barely noticed the passage of time. The experience was heightened by the reactions of the audience—cheers, tears, and applause. It felt like a shared journey, and the story’s themes of hope and friendship resonated deeply with me. This movie set a new standard for what I expect from cinema, and I still revisit it whenever I need inspiration or comfort. The sheer length of my answer should cause the textarea to expand as I type.`;
    await userEvent.type(input, longText, { delay: 10 });
    // Wait for the textarea to expand
    await waitFor(() => {
      // Check that the textarea height increased (expansion)
      expect(input.scrollHeight).toBeGreaterThan(input.clientHeight);
      // Optionally, check that the value matches
      expect(input).toHaveValue(longText);
    });
  },
};
