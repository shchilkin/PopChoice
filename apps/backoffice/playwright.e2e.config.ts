import { defineConfig, devices } from 'playwright/test';
import { fileURLToPath } from 'node:url';

const e2ePort = Number.parseInt(process.env.E2E_BACKOFFICE_PORT ?? '3101', 10);
const baseURL = process.env.E2E_BACKOFFICE_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e';
const redisUrl = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:56379';
const operatorCredentials = Buffer.from('e2e-operator:e2e-operator-secret').toString('base64');
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
      password: 'e2e-operator-secret',
      username: 'e2e-operator',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build --workspace=packages/shared && PORT=${e2ePort} npm run dev --workspace=apps/backoffice -- --hostname 127.0.0.1`,
    cwd: repoRoot,
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BULL_BOARD_URL: '',
      DATABASE_URL: databaseUrl,
      OPERATOR_AUTH_PASSWORD: 'e2e-operator-secret',
      OPERATOR_AUTH_REQUIRED: '1',
      OPERATOR_AUTH_USERNAME: 'e2e-operator',
      REDIS_URL: redisUrl,
      RESEND_API_KEY: '',
      TMDB_API_KEY: '',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
