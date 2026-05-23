import { expect, test } from 'playwright/test';

import { readSession, registerUser, uniqueEmail } from './helpers';

test('registers, persists a session, logs out, and logs back in', async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo.title);
  const password = 'E2E-password-475!';

  await registerUser(page, email, password);
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: true });
  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: false });
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Signed in!' })).toBeVisible();
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: true });
  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
});
