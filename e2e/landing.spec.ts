import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/PopChoice/);
  });

  test('renders PopChoice heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'PopChoice' })).toBeVisible();
  });

  test('"Find My Movie" CTA button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Find My Movie' })).toBeVisible();
  });

  test('"How it works" secondary button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'How it works' })).toBeVisible();
  });

  test('clicking "Find My Movie" navigates to /quiz', async ({ page }) => {
    await page.getByRole('button', { name: 'Find My Movie' }).click();
    await expect(page).toHaveURL('/quiz');
  });

  test('clicking "How it works" navigates to /about', async ({ page }) => {
    await page.getByRole('button', { name: 'How it works' }).click();
    await expect(page).toHaveURL('/about');
  });

  test('FeaturesSection is visible on the page', async ({ page }) => {
    await expect(page.getByText('Movie night, sorted.')).toBeVisible();
  });

  test('CtaSection is visible on the page', async ({ page }) => {
    await expect(page.getByText('Your next favorite film is one quiz away')).toBeVisible();
  });
});
