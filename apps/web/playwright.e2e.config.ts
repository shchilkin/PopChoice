import { defineConfig, devices } from 'playwright/test';

const e2ePort = Number.parseInt(process.env.E2E_PORT ?? '3100', 10);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e';
const redisUrl = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:56379';

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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${e2ePort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_SESSION_SECRET: 'e2e-auth-session-secret',
      DATABASE_URL: databaseUrl,
      NEXT_PUBLIC_BASE_URL: baseURL,
      REDIS_URL: redisUrl,
      RESEND_API_KEY: '',
      TMDB_API_KEY: '',
      VALID_API_KEYS: '',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
