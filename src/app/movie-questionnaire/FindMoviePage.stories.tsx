import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import QuestionsPage from '../page';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof QuestionsPage> = {
  title: 'Pages/Movie Questionnaire Page',
  component: QuestionsPage,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;

export const EmptyForm = () => <QuestionsPage />;

type Story = StoryObj<typeof meta>;

export const FilledForm: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/api/movie-recommendation', async () => {
          await new Promise((res) => setTimeout(res, 500)); // Reduced from 2000ms
          return HttpResponse.json({
            title: 'The Godfather',
            description: 'A masterpiece of cinema.',
            posterURL: 'https://example.com/poster.jpg',
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    // Fill out the favorite movie field with correct placeholder
    await userEvent.type(
      canvas.getByPlaceholderText(/Share your thoughts on your favorite movie/i),
      'Inception – because it masterfully blends mind-bending storytelling, emotional depth, and stunning visuals.',
      {
        delay: 20, // Reduced delay
      },
    );
    await new Promise((res) => setTimeout(res, 200)); // Reduced delay

    // Select new vs classic option (radio button, not text input)
    await userEvent.click(canvas.getByLabelText('Classic'));
    await new Promise((res) => setTimeout(res, 200));

    // Select mood preference option (radio button, not text input)
    await userEvent.click(canvas.getByLabelText('Fun'));
    await new Promise((res) => setTimeout(res, 200));

    // Fill out the famous film person field with correct placeholder
    await userEvent.type(
      canvas.getByPlaceholderText(/Tom Hanks because he is really funny/i),
      'Meryl Streep because she has incredible storytelling abilities.',
      {
        delay: 20,
      },
    );
    await new Promise((res) => setTimeout(res, 400));

    // Submit the form
    await userEvent.click(canvas.getByRole('button', { name: /find me a movie/i }));

    // Wait for a loading indicator
    await waitFor(
      () => {
        expect(canvas.queryByText(/Finding/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  },
};
