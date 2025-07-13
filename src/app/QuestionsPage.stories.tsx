import React from 'react';
import { http, HttpResponse } from 'msw';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import QuestionsPage from './page';

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
        http.post('/api/movie-recommendation', () => {
          return HttpResponse.json({});
        }),
      ],
    },
  },
  // TODO: Mock request with MSW
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // Fill out the favorite movie field
    await userEvent.type(canvas.getByPlaceholderText(/favorite movie/i), 'Inception', {
      delay: 100,
    });
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
  },
};
