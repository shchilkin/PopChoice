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
  await expect(page.getByText('The Matrix')).toBeVisible();
  await expect(page.getByText('Paddington 2')).toBeVisible();

  await page.getByRole('button', { name: 'Filters' }).click();
  await page.locator('select[name="duration"]').selectOption('over-120');
  await page.locator('select[name="minScore"]').selectOption('8');
  await page.locator('input[name="ageRating-R"]').check();

  await expect(page.getByText(/Showing 1.2 of 2 movies/)).toBeVisible();
  await expect(page.getByText('The Matrix')).toBeVisible();
  await expect(page.getByText('Parasite')).toBeVisible();
  await expect(page.getByText('Paddington 2')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Age rating: R' })).toHaveCount(2);
  await expect(page.getByText('8.2')).toBeVisible();
});

test('searches seeded actor, director, and genre metadata through the real movies API', async ({
  request,
}) => {
  for (const query of ['Keanu Reeves', 'Lana Wachowski', 'Science Fiction']) {
    const response = await request.get(`/api/movies?query=${encodeURIComponent(query)}`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.totalCount).toBe(1);
    expect(body.movies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'The Matrix' })]),
    );
  }
});

test('shows a useful empty state when catalog filters match nothing', async ({ page }) => {
  await page.goto('/available-movies');

  await expect(page.getByRole('heading', { name: 'Available Movies' })).toBeVisible();
  await expect(page.getByText(/Showing 1.7 of 7 movies/)).toBeVisible();

  await page.getByPlaceholder('Try Parasite, Nolan, thriller…').fill('No Such E2E Movie');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('No movies found')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '0 movies for "No Such E2E Movie"' }),
  ).toBeVisible();
  await expect(page.getByText('The Matrix')).toHaveCount(0);

  await page.locator('form').getByRole('button', { name: 'Clear all' }).click();

  await expect(page.getByText(/Showing 1.7 of 7 movies/)).toBeVisible();
  await expect(page.getByText('The Matrix')).toBeVisible();
});
