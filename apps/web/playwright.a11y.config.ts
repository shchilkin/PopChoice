import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from 'playwright/test';

const a11yPort = Number.parseInt(process.env.A11Y_PORT ?? '3110', 10);
const baseURL = process.env.A11Y_BASE_URL ?? `http://127.0.0.1:${a11yPort}`;
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e';
const redisUrl = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:56379';
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: './a11y',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: 'test-results/a11y',
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-a11y-report' }], ['list']]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-a11y-report' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run build --workspace=packages/shared && npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port ${a11yPort}`,
    cwd: repoRoot,
    env: {
      AUTH_SESSION_SECRET: 'a11y-auth-session-secret',
      DATABASE_URL: databaseUrl,
      E2E_DETERMINISTIC_RECOMMENDATIONS: '1',
      NEXT_PUBLIC_BASE_URL: baseURL,
      REDIS_URL: redisUrl,
      RESEND_API_KEY: '',
      TMDB_API_KEY: '',
      VALID_API_KEYS: '',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
