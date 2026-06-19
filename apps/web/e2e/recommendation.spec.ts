import { expect, test } from 'playwright/test';

import { disableE2EMotion, readSession, registerUser, uniqueEmail } from './helpers';

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

async function expectDeterministicSoloResults(page: Page) {
  await expect(page).toHaveURL(/\/results\/[A-Za-z0-9_-]+/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'We found your perfect film' })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Top Pick$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible();
  await expect(page.getByText(/deterministic top pick/i)).toBeVisible();
}

async function expectDeterministicGroupResults(page: Page) {
  await expect(page).toHaveURL(/\/results\/[A-Za-z0-9_-]+/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'We found your group film' })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Top Pick$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible();
}

async function expectDeterministicDuoResults(page: Page) {
  await expect(page).toHaveURL(/\/results\/[A-Za-z0-9_-]+/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'We found your duo film' })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Top Pick$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible();
}

async function completeNormalSoloQuestions(page: Page, options: { referenceMovie?: string } = {}) {
  if (options.referenceMovie) {
    await page.getByRole('button', { name: options.referenceMovie }).click();
  }
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Open field/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Sci-Fi/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Balanced/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Balanced/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Not too long/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByPlaceholder(/Tom Hanks/).fill('Cillian Murphy');
}

async function completeFastPickQuestions(
  page: Page,
  finalButtonName: string | RegExp = /Find My Movie/,
) {
  await page.getByRole('button', { name: /Funny/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Long runtime/ }).click();
  await page.getByRole('button', { name: /Too obvious/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Balanced/ }).click();
  await page.getByRole('button', { name: finalButtonName }).click();
}

test.beforeEach(async ({ page }) => {
  await disableE2EMotion(page);
});

test('submits the solo quiz, renders deterministic results, and records feedback', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail(testInfo.title);
  const password = 'E2E-password-475!';

  await registerUser(page, email, password);
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: true });

  await page.goto('/quiz');
  await page.getByRole('button', { name: /Normal Match/ }).click();
  await page.getByRole('button', { name: /Just me/ }).click();

  await completeNormalSoloQuestions(page);
  await page.getByRole('button', { name: /Find My Movie/ }).click();

  await expectDeterministicSoloResults(page);
  await expect(page.getByText('Was this useful?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Not for me' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Too obvious' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(page.getByText('Next action')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try another' })).toBeVisible();

  await page.getByRole('button', { name: 'More like this' }).click();

  await expect(page.getByText('Saved — building another batch from this result.')).toBeVisible();
  await expect
    .poll(() => readMovieMemory(page))
    .toMatchObject({
      movieMemory: [
        {
          kind: 'liked',
          movieName: 'The Matrix',
          movieYear: 1999,
        },
      ],
    });
});

test('submits the normal duo quiz and renders deterministic duo results', async ({ page }) => {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Normal Match/ }).click();
  await page.getByRole('button', { name: /Duo night/ }).click();

  const inputs = await page.locator('input').all();
  await inputs[0].fill('Alice');
  await inputs[1].fill('Bob');
  await page.getByRole('button', { name: 'Start Duo' }).click();

  await completeNormalSoloQuestions(page, { referenceMovie: 'The Matrix' });
  await page.getByRole('button', { name: /Hand to Bob/ }).click();
  await page.getByRole('button', { name: /ready, Bob/i }).click();
  await completeNormalSoloQuestions(page, { referenceMovie: 'The Matrix' });
  await page.getByRole('button', { name: /Find My Movie/ }).click();

  await expectDeterministicDuoResults(page);
});

test('submits the normal group quiz and renders deterministic group results', async ({ page }) => {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Normal Match/ }).click();
  await page.getByRole('button', { name: /Group mode/ }).click();

  const inputs = await page.locator('input').all();
  await inputs[0].fill('Alice');
  await inputs[1].fill('Bob');
  await expect(page.getByRole('button', { name: "Let's go!" })).toBeDisabled();
  await inputs[2].fill('Charlie');
  await expect(page.getByRole('button', { name: "Let's go!" })).toBeEnabled();
  await page.getByRole('button', { name: "Let's go!" }).click();

  await completeNormalSoloQuestions(page, { referenceMovie: 'The Matrix' });
  await page.getByRole('button', { name: /Hand to Bob/ }).click();
  await page.getByRole('button', { name: /ready, Bob/i }).click();
  await completeNormalSoloQuestions(page, { referenceMovie: 'The Matrix' });
  await page.getByRole('button', { name: /Hand to Charlie/ }).click();
  await page.getByRole('button', { name: /ready, Charlie/i }).click();
  await completeNormalSoloQuestions(page, { referenceMovie: 'The Matrix' });
  await page.getByRole('button', { name: /Find My Movie/ }).click();

  await expectDeterministicGroupResults(page);
});

test('submits Fast Pick solo and renders deterministic results', async ({ page }) => {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Fast Pick/ }).click();
  await page.getByRole('button', { name: /Just me/ }).click();

  await completeFastPickQuestions(page);

  await expectDeterministicSoloResults(page);
});

test('submits Fast Pick duo and renders deterministic duo results', async ({ page }) => {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Fast Pick/ }).click();
  await page.getByRole('button', { name: /Two people/ }).click();

  const inputs = await page.locator('input').all();
  await inputs[0].fill('Alice');
  await inputs[1].fill('Bob');
  await page.getByRole('button', { name: 'Start Duo' }).click();

  await completeFastPickQuestions(page, /Hand to Bob/);
  await page.getByRole('button', { name: /ready, Bob/i }).click();
  await completeFastPickQuestions(page);

  await expectDeterministicDuoResults(page);
});

test('submits Fast Pick group and renders deterministic group results', async ({ page }) => {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Fast Pick/ }).click();
  await page.getByRole('button', { name: /^Group/ }).click();

  const inputs = await page.locator('input').all();
  await inputs[0].fill('Alice');
  await inputs[1].fill('Bob');
  await expect(page.getByRole('button', { name: "Let's go!" })).toBeDisabled();
  await inputs[2].fill('Charlie');
  await expect(page.getByRole('button', { name: "Let's go!" })).toBeEnabled();
  await page.getByRole('button', { name: "Let's go!" }).click();

  await completeFastPickQuestions(page, /Hand to Bob/);
  await page.getByRole('button', { name: /ready, Bob/i }).click();
  await completeFastPickQuestions(page, /Hand to Charlie/);
  await page.getByRole('button', { name: /ready, Charlie/i }).click();
  await completeFastPickQuestions(page);

  await expectDeterministicGroupResults(page);
});
