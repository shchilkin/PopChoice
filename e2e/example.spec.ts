import { test, expect } from '@playwright/test';

test('home page has PopChoice title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/PopChoice/);
});

test('home page shows Find My Movie button in hero section', async ({ page }) => {
  await page.goto('/');

  const ctaButton = page.getByRole('button', { name: 'Find My Movie' });
  await expect(ctaButton).toBeVisible();
});

test('clicking Find My Movie navigates to quiz page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Find My Movie' }).click();

  await expect(page).toHaveURL(/\/quiz/);
});
