import { expect, test } from 'playwright/test';

test('serves the app against isolated e2e Postgres and Redis', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);

  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.checks).toMatchObject({
    postgres: 'ok',
    redis: 'ok',
  });
});

test('renders seeded catalog data and filters it through the real movies API', async ({ page }) => {
  await page.goto('/available-movies');

  await expect(page.getByRole('heading', { name: 'Available Movies' })).toBeVisible();
  await expect(page.getByText(/Showing 1.7 of 7 movies/)).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera')).toBeVisible();
  await expect(page.getByText('PopChoice E2E Short Comedy')).toBeVisible();

  await page.locator('select').first().selectOption('over-120');
  await page.locator('select').nth(1).selectOption('8');
  await page.locator('fieldset input[type="checkbox"]').nth(2).check();

  await expect(page.getByText(/Showing 1.1 of 1 movies/)).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera')).toBeVisible();
  await expect(page.getByText('PopChoice E2E Short Comedy')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Age rating: PG-13' })).toBeVisible();
  await expect(page.getByText('8.7')).toBeVisible();
});

test('searches seeded actor, director, and genre metadata through the real movies API', async ({
  request,
}) => {
  for (const query of ['Astra Fixture', 'Moonlit Director', 'Nebula Noir']) {
    const response = await request.get(`/api/movies?query=${encodeURIComponent(query)}`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.totalCount).toBe(1);
    expect(body.movies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'PopChoice E2E Space Opera' })]),
    );
  }
});

test('shows a useful empty state when catalog filters match nothing', async ({ page }) => {
  await page.goto('/available-movies');

  await expect(page.getByRole('heading', { name: 'Available Movies' })).toBeVisible();
  await expect(page.getByText(/Showing 1.7 of 7 movies/)).toBeVisible();

  await page.getByPlaceholder('Title, actor, director, or genre').fill('No Such PopChoice Fixture');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByText('No movies found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No matches for this search' })).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera')).toHaveCount(0);

  await page.locator('form').getByRole('button', { name: 'Clear' }).click();

  await expect(page.getByText(/Showing 1.7 of 7 movies/)).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera')).toBeVisible();
});
