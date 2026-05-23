import { expect, test } from 'playwright/test';

import { readSession, registerUser, uniqueEmail } from './helpers';

import type { Page } from 'playwright/test';

async function readMovieMemory(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/account/movie-memory?mode=list&limit=10', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    return response.json() as Promise<{
      movieMemory?: Array<{ kind: string; movieName: string; movieYear: number | null }>;
      total?: number;
    }>;
  });
}

test('submits the solo quiz, renders deterministic results, and records feedback', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail(testInfo.title);
  const password = 'E2E-password-475!';

  await registerUser(page, email, password);
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: true });

  await page.goto('/quiz');
  await page.getByRole('button', { name: /Just me/ }).click();

  await page.getByRole('button', { name: 'The Matrix' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Open field/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Sci-Fi/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Balanced/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByPlaceholder(/Tom Hanks/).fill('Cillian Murphy');
  await page.getByRole('button', { name: /Find My Movie/ }).click();

  await expect(page).toHaveURL(/\/results\/[A-Za-z0-9_-]+/);
  await expect(page.getByRole('heading', { name: 'We found your perfect film' })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Top Pick$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PopChoice E2E Space Opera' })).toBeVisible();
  await expect(page.getByText(/deterministic top pick/i)).toBeVisible();
  await expect(page.getByText('Was this useful?')).toBeVisible();

  await page.getByRole('button', { name: 'Good pick' }).click();

  await expect(page.getByText('Thanks — saved for future tuning.')).toBeVisible();
  await expect
    .poll(() => readMovieMemory(page))
    .toMatchObject({
      movieMemory: [
        {
          kind: 'liked',
          movieName: 'PopChoice E2E Space Opera',
          movieYear: 2024,
        },
      ],
    });
});
