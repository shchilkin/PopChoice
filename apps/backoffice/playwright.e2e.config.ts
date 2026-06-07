import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from 'playwright/test';

const e2ePort = Number.parseInt(process.env.E2E_BACKOFFICE_PORT ?? '3104', 10);
const baseURL = process.env.E2E_BACKOFFICE_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e';
const redisUrl = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:56379';
const operatorUsername = process.env.E2E_BACKOFFICE_OPERATOR_USERNAME ?? 'e2e-operator';
const operatorPassword = process.env.E2E_BACKOFFICE_OPERATOR_PASSWORD ?? 'e2e-password';
const operatorCredentials = Buffer.from(`${operatorUsername}:${operatorPassword}`).toString(
  'base64',
);
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: {
      Authorization: `Basic ${operatorCredentials}`,
    },
    httpCredentials: {
      password: operatorPassword,
      username: operatorUsername,
    },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { height: 1000, width: 1440 },
  },
  webServer: {
    command: `npm run build --workspace=packages/shared && PORT=${e2ePort} npm run dev --workspace=apps/backoffice -- --hostname 127.0.0.1`,
    cwd: repoRoot,
    env: {
      BULL_BOARD_URL: '',
      CATALOG_HEALTH_SAMPLE_LIMIT: '5',
      DATABASE_URL: databaseUrl,
      OPERATOR_AUTH_PASSWORD: operatorPassword,
      OPERATOR_AUTH_REQUIRED: '1',
      OPERATOR_AUTH_USERNAME: operatorUsername,
      REDIS_URL: redisUrl,
      RESEND_API_KEY: '',
      TMDB_API_KEY: '',
      TMDB_LANGUAGE: 'en-US',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
