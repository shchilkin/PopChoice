import { expect } from 'playwright/test';

import type { Page } from 'playwright/test';

export function uniqueEmail(testTitle: string): string {
  const slug = testTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `e2e-${slug}-${Date.now()}@example.com`;
}

export async function disableE2EMotion(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const styleId = '__popchoice-e2e-disable-motion';
    const css = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 1ms !important;
      }
    `;

    const install = () => {
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;
      (document.head ?? document.documentElement).appendChild(style);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
      install();
    }
  });
}

export async function registerUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Account created!' })).toBeVisible();
}

export async function readSession(page: Page): Promise<{
  authenticated?: boolean;
  userId?: string;
}> {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    return response.json() as Promise<{ authenticated?: boolean; userId?: string }>;
  });
}
