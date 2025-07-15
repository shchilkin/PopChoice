import { http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import QuestionsPage from './page';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof QuestionsPage> = {
  title: 'Pages/Questions Page',
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
          await new Promise((res) => setTimeout(res, 2000));
          return HttpResponse.json({});
        }),
      ],
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // Fill out the favorite movie field
    await userEvent.type(
      canvas.getByPlaceholderText(/favorite movie/i),
      'Inception – because it masterfully blends mind-bending storytelling, emotional depth, and stunning visuals. The concept of dreams within dreams keeps me thinking long after watching.',
      {
        delay: 40,
      },
    );
    await new Promise((res) => setTimeout(res, 500));
    // // Fill out the mood preference field
    await userEvent.type(canvas.getByPlaceholderText(/a new release/i), 'Classic', {
      delay: 100,
    });
    await new Promise((res) => setTimeout(res, 500));
    // // Fill out the tone preference field
    await userEvent.type(canvas.getByPlaceholderText(/tone you\'re looking/i), 'Fun', {
      delay: 100,
    });
    await new Promise((res) => setTimeout(res, 800));
    // // Submit the form
    await userEvent.click(canvas.getByRole('button', { name: /find me a movie/i }));
    // Wait for a loading indicator or result
    await waitFor(() => {
      expect(canvas.queryByText(/Finding/i)).toBeInTheDocument();
      // or expect(canvas.queryByText(/result/i)).toBeInTheDocument();
    });
  },
};
