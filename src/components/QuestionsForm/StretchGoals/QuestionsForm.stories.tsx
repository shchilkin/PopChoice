import { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { QuestionsForm } from './QuestionsForm';

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

// Timing constants for realistic user interactions
const INTERACTION_DELAYS = {
  typing: 50,
  typingLong: 60,
  thinking: 800,
  reading: 1000,
  decision: 400,
  apiResponse: 2000,
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

const selectRadioOption = async (canvas: ReturnType<typeof within>, labelText: string) => {
  await waitFor(() => {
    const option = canvas.getByLabelText(labelText);
    userEvent.click(option);
  });
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
  title: 'Components/Stretch Goals/QuestionsForm',
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

export const EmptyForm: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the initial empty state of the form with all validation disabled.',
      },
    },
  },
};

export const FilledForm: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates a complete user journey through the form with realistic timing and interactions.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Fill favorite movie question
    await fillTextInput(
      canvas,
      /favorite movie/i,
      TEST_RESPONSES.favoriteMovie,
      INTERACTION_DELAYS.typing,
    );

    // Step 2: User thinking time before next field
    await waitForDelay(INTERACTION_DELAYS.thinking);

    // Step 3: Select preference for new vs classic
    await selectRadioOption(canvas, 'Classic');

    // Step 4: Brief pause between selections
    await waitForDelay(INTERACTION_DELAYS.reading);

    // Step 5: Select mood preference
    await selectRadioOption(canvas, 'Inspiring');

    // Step 6: Reading time for longer question
    await waitForDelay(INTERACTION_DELAYS.reading);

    // Step 7: Fill famous film person question
    await fillTextInput(
      canvas,
      /Tom Hanks because he is really funny and can do the voice of Woody/i,
      TEST_RESPONSES.famousFilmPerson,
      INTERACTION_DELAYS.typingLong,
    );

    // Step 8: User review time
    await waitForDelay(INTERACTION_DELAYS.reading);

    // Step 9: Verify form is valid and submit button is enabled
    await expectButtonState(canvas, /Find Me a Movie/i, false);

    // Step 10: Final decision time before submission
    await waitForDelay(INTERACTION_DELAYS.decision);

    // Step 11: Submit form
    await userEvent.click(canvas.getByRole('button', { name: /Find Me a Movie/i }));

    // Step 12: Verify loading state is shown
    await expectButtonState(canvas, /Finding.../i, true);

    // Note: In a real application, navigation to /movie-suggestion would occur here
    // Check browser console for "Router.push called" message
  },
};
