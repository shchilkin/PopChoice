import { expect, test } from 'playwright/test';

test('serves the operator app against isolated e2e Postgres and Redis', async ({
  page,
  request,
}) => {
  const health = await request.get('/healthz');
  expect(health.ok()).toBe(true);
  await expect(health.text()).resolves.toBe('ok');

  await page.goto('/catalog-health');
  await expect(page.getByRole('heading', { name: 'Catalog Health' })).toBeVisible();
  await expect(page.getByText('Catalog maintenance queue')).toBeVisible();
});

test('operator queues a catalog repair and sees the queued job and audit row', async ({ page }) => {
  await page.goto('/catalog-health?issue=missing_poster_url');

  await expect(page.getByRole('heading', { name: 'Catalog Health' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Missing poster_url' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-catalog-repair-enhanced', 'true');
  await expect(
    page
      .locator('#issue-missing_poster_url')
      .getByRole('link', { name: 'PopChoice E2E Space Opera' }),
  ).toBeVisible();

  const queueButton = page
    .locator('#issue-missing_poster_url')
    .getByRole('row', { name: /#1 PopChoice E2E Space Opera/ })
    .getByRole('button', { name: 'Queue backfill' });
  const [actionResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/catalog-health/actions') &&
        response.request().method() === 'POST',
    ),
    queueButton.click(),
  ]);

  expect(actionResponse.ok()).toBe(true);

  await page.goto('/queue?state=waiting&page=1&pageSize=25');

  await expect(page.getByRole('heading', { name: 'Catalog Maintenance Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting jobs' })).toBeVisible();
  const queuedJobRow = page
    .getByRole('row')
    .filter({ hasText: 'backfill-movie' })
    .filter({ hasText: 'Movie: 1' })
    .first();
  await expect(queuedJobRow).toBeVisible();
  await expect(queuedJobRow).toContainText('Reason: missing_metadata');

  await page.goto('/catalog-health#repair-audit');

  await expect(page.getByRole('heading', { name: 'Recent repair actions' })).toBeVisible();
  const auditRow = page
    .locator('#repair-audit')
    .getByRole('row')
    .filter({ hasText: 'Movie #1' })
    .filter({ hasText: 'Enqueue Backfill' })
    .first();
  await expect(auditRow).toBeVisible();
  await expect(auditRow).toContainText('e2e-operator');
  await expect(auditRow).toContainText('Missing Poster Url');
  await expect(auditRow).toContainText(/Accepted|Already queued/);
});

test('operator applies a seeded TMDB review candidate from queue to audit history', async ({
  page,
}) => {
  await page.goto('/tmdb-reviews');

  await expect(page.getByRole('heading', { name: 'TMDB Match Reviews' })).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera', { exact: true })).toBeVisible();
  await expect(
    page.getByText('PopChoice E2E Space Opera Definitive Match', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/Showing 1-1 of 1 reviews/).first()).toBeVisible();

  await page.getByRole('link', { name: '#1' }).click();

  await expect(page.getByRole('heading', { name: 'TMDB Review #1' })).toBeVisible();
  await expect(page.locator('.page-description').getByText('Ambiguous match')).toBeVisible();
  await expect(
    page.getByText('E2E fixture for the backoffice TMDB review decision flow.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Candidates' })).toBeVisible();

  const bestCandidate = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'PopChoice E2E Space Opera Definitive Match' }),
  });
  await bestCandidate
    .getByPlaceholder('Why this candidate is correct')
    .fill('Verified by e2e operator flow.');
  await bestCandidate.getByRole('button', { name: 'Apply candidate' }).click();

  await expect(page.getByRole('heading', { name: 'TMDB Review #1' })).toBeVisible();
  await expect(page.locator('.page-description').getByText('Resolved')).toBeVisible();
  await expect(page.getByText('990001').first()).toBeVisible();
  await expect(page.getByText('apply candidate')).toBeVisible();
  await expect(page.getByText('Verified by e2e operator flow.')).toBeVisible();

  await page.goto('/tmdb-reviews?status=resolved&reason=all&sort=newest&page=1&pageSize=25');

  await expect(page.getByRole('heading', { name: 'TMDB Match Reviews' })).toBeVisible();
  await expect(page.getByText(/Showing 1-1 of 1 reviews/).first()).toBeVisible();
  await expect(page.getByText('PopChoice E2E Space Opera', { exact: true })).toBeVisible();
  await expect(page.locator('.review-table').getByText('Resolved')).toBeVisible();
});
