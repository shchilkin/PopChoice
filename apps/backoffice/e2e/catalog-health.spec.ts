import { expect, test } from 'playwright/test';

import { backofficeBaseUrl, operatorHeaders } from './helpers';

test('renders deterministic catalog health data without desktop overflow', async ({ page }) => {
  await page.setExtraHTTPHeaders(operatorHeaders());
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Catalog Health' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Backoffice sections' })).toBeVisible();
  await expect(page.locator('#issue-missing_poster_url')).toContainText('Missing poster_url');
  await expect(page.locator('#issue-missing_poster_url')).toContainText(
    'PopChoice E2E Space Opera',
  );
  await expect(page.locator('#issue-missing_tmdb_id')).toContainText('Healthy');
  await expect(page.locator('#issue-missing_tmdb_id')).not.toContainText(
    'PopChoice E2E Space Opera',
  );

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
});

test('queues a focused catalog repair through the enhanced form path', async ({ page }) => {
  await page.setExtraHTTPHeaders(operatorHeaders());
  await page.goto('/?issue=missing_poster_url');

  const row = page.locator('[data-repair-row][data-issue-key="missing_poster_url"]').first();
  await expect(row).toContainText('PopChoice E2E Space Opera');

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/catalog-health/actions') && response.request().method() === 'POST',
  );
  await row.getByRole('button', { name: 'Queue backfill' }).click();

  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  await expect(row.locator('[data-repair-message]')).toContainText('Accepted for worker', {
    timeout: 3_000,
  });
});

test('does not redirect action responses to a bind-address host', async ({ request }) => {
  const baseURL = backofficeBaseUrl();
  const bindOrigin = `http://0.0.0.0:${new URL(baseURL).port}`;
  const response = await request.post('/catalog-health/actions', {
    form: {
      action: 'enqueue_backfill',
      issue_key: 'missing_poster_url',
      movie_id: '1',
    },
    headers: {
      ...operatorHeaders(),
      accept: 'text/html',
      host: new URL(bindOrigin).host,
      origin: bindOrigin,
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers().location).toBeTruthy();
  expect(response.headers().location).not.toContain('0.0.0.0');
});
