import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';

import { disableE2EMotion, readSession, registerUser, uniqueEmail } from '../e2e/helpers';

const BLOCKING_IMPACTS = new Set(['critical', 'serious']);
const A11Y_RENDER_STABILIZER_CSS = `
  [style*="opacity: 0"][style*="transform"],
  [style*="opacity:0"][style*="transform"] {
    opacity: 1 !important;
    transform: none !important;
  }
`;

const MOCK_POSTERS = Array.from({ length: 8 }, (_, index) => {
  const color = ['1a1a2e', '16213e', '0f3460', '533483', '2c003e', '1b1b2f', '0d1117', '0a0a14'][
    index
  ];

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect width="300" height="450" fill="#${color}"/></svg>`,
  )}`;
});

async function mockPosterApi(page: Page) {
  await page.route('**/api/poster-urls', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ posters: MOCK_POSTERS }),
      contentType: 'application/json',
    });
  });
}

async function expectNoBlockingA11yViolations(page: Page, scanName: string) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready.then(() => undefined)).catch(() => undefined);
  await page.addStyleTag({ content: A11Y_RENDER_STABILIZER_CSS });
  await page.waitForTimeout(250);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const blockingViolations = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? ''),
  );

  expect(blockingViolations, formatViolations(scanName, blockingViolations)).toEqual([]);
}

function formatViolations(
  scanName: string,
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  if (violations.length === 0) return `${scanName}: no blocking accessibility violations`;

  return [
    `${scanName}: ${violations.length} blocking accessibility violation(s)`,
    ...violations.map((violation) => {
      const nodes = violation.nodes
        .slice(0, 4)
        .map((node) => `  - ${node.target.join(' ')}: ${node.failureSummary ?? violation.help}`)
        .join('\n');
      return `${violation.id} [${violation.impact}]: ${violation.help}\n${nodes}`;
    }),
  ].join('\n\n');
}

async function completeFastPickSolo(page: Page) {
  await page.goto('/quiz');
  await page.getByRole('button', { name: /Fast Pick/ }).click();
  await page.getByRole('button', { name: /Just me/ }).click();
  await page.getByRole('button', { name: /Funny/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Long runtime/ }).click();
  await page.getByRole('button', { name: /Too obvious/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Balanced/ }).click();
  await page.getByRole('button', { name: /Find My Movie/ }).click();

  await expect(page).toHaveURL(/\/results\/[A-Za-z0-9_-]+/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await disableE2EMotion(page);
});

test('public entrypoints have no blocking axe violations', async ({ page }) => {
  await mockPosterApi(page);

  for (const route of ['/', '/about', '/login', '/register', '/quiz']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expectNoBlockingA11yViolations(page, route);
  }
});

test('catalog page has no blocking axe violations with real fixtures', async ({ page }) => {
  await page.goto('/available-movies');

  await expect(page.getByRole('heading', { name: 'Available Movies' })).toBeVisible();
  await expect(page.getByText('The Matrix')).toBeVisible();
  await expectNoBlockingA11yViolations(page, '/available-movies');
});

test('authenticated results flow has no blocking axe violations', async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo.title);

  await registerUser(page, email, 'E2E-password-475!');
  await expect.poll(() => readSession(page)).toMatchObject({ authenticated: true });

  await completeFastPickSolo(page);
  await expectNoBlockingA11yViolations(page, '/results/[id]');
});
