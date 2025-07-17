import { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { QuestionsForm } from '@/components';

// Test data constants
const TEST_RESPONSES = {
  favoriteMovie:
    'The Shawshank Redemption – A powerful story about hope, friendship, and resilience that shows how the human spirit can triumph even in the darkest circumstances.',
  famousFilmPerson:
    'Meryl Streep because she has incredible storytelling abilities and could probably entertain me with behind-the-scenes stories from decades of filmmaking.',
} as const;

const MOCK_API_RESPONSE = {
  title: 'The Godfather',
  description: 'A masterpiece of cinema that explores themes of family, power, and loyalty.',
  posterURL: 'https://example.com/godfather-poster.jpg',
} as const;

// TODO: Different interaction delays for local and CI environments
// Timing constants for realistic user interactions
const INTERACTION_DELAYS = {
  typing: 25, // Increased from 10ms to prevent character corruption
  typingLong: 30, // Increased from 15ms
  thinking: 50, // Reduced from 80ms
  reading: 50, // Reduced from 100ms
  decision: 30, // Reduced from 40ms
  apiResponse: 200,
} as const;

// Helper functions for common interactions
const fillTextInput = async (
  canvas: ReturnType<typeof within>,
  placeholder: RegExp,
  text: string,
  delay: number = INTERACTION_DELAYS.typing,
) => {
  const input = canvas.getByPlaceholderText(placeholder);
  await userEvent.type(input, text, { delay });
  await waitFor(() => expect(input).toHaveValue(text));
};

const waitForDelay = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

const expectButtonState = async (
  canvas: ReturnType<typeof within>,
  buttonName: RegExp,
  shouldBeDisabled: boolean,
) => {
  await waitFor(() => {
    const button = canvas.getByRole('button', { name: buttonName });
    if (shouldBeDisabled) {
      expect(button).toBeDisabled();
    } else {
      expect(button).not.toBeDisabled();
    }
  });
};

const meta: Meta = {
  title: 'Components/QuestionsForm',
  component: QuestionsForm,
  parameters: {
    msw: {
      handlers: [
        http.post('/api/movie-recommendation', async () => {
          await waitForDelay(INTERACTION_DELAYS.apiResponse);
          return HttpResponse.json(MOCK_API_RESPONSE);
        }),
      ],
      options: {
        onUnhandledRequest: 'bypass',
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => console.log('Router.push called - would navigate to /movie-suggestion'),
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyForm: Story = {};

export const FillingForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Fill Favorite movie
    await fillTextInput(canvas, /Share your thoughts/i, TEST_RESPONSES.favoriteMovie);
    // 1.1. Check that form cannot be submitted
    await expectButtonState(canvas, /Find me a movie/i, true);

    // 2. Select new in new or classic radio group
    const newMoodOption = canvas.getByLabelText(/New?/i);
    await userEvent.click(newMoodOption);
    // 2.1. Check that form cannot be submitted
    await expectButtonState(canvas, /Find me a movie/i, true);

    // 3. Select Fun and Inspiring options in mood / vibe
    const funOption = canvas.getByLabelText(/Fun?/i);
    await userEvent.click(funOption, { delay: INTERACTION_DELAYS.typing });
    const inspiringOption = canvas.getByLabelText(/Inspiring/i);
    await userEvent.click(inspiringOption, { delay: INTERACTION_DELAYS.typing });
    // 3.1. Check that form cannot be submitted
    await expectButtonState(canvas, /Find me a movie/i, true);

    // 4. Fill famous film person text area
    await fillTextInput(
      canvas,
      /Tom Hanks because he is really funny/i,
      TEST_RESPONSES.famousFilmPerson,
    );
    //4.1 Check that after all fields were filled form can be submited
    await expectButtonState(canvas, /Find me a movie/i, false);
  },
};
