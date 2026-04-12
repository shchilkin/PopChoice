import { test, expect } from '@playwright/test';

test('home page has PopChoice title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/PopChoice/);
});

test('home page shows hero section with start button', async ({ page }) => {
  await page.goto('/');

  const startButton = page.getByRole('link', { name: /start|find|get started|pick/i });
  await expect(startButton.first()).toBeVisible();
});

test('navigating to quiz page', async ({ page }) => {
  await page.goto('/quiz');

  await expect(page).toHaveURL(/\/quiz/);
});
