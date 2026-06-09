export type BackofficeRecoveryGuide = {
  diagnostic: string | null;
  eyebrow: string;
  isLocalSetup: boolean;
  primaryCommand: RecoveryCommand | null;
  secondaryCommand: RecoveryCommand | null;
  steps: string[];
  summary: string;
  title: string;
};

export type RecoveryCommand = {
  command: string;
  helper: string;
  label: string;
};

export const SEEDED_LOCAL_COMMANDS: RecoveryCommand[] = [
  {
    command: 'npm run setup:backoffice:local-data',
    helper:
      'Creates local PostgreSQL and Redis, syncs env files, then seeds the real local catalog.',
    label: 'Set up seeded local data',
  },
  {
    command: 'npm run dev:backoffice',
    helper: 'Starts backoffice with the synced local env instead of the sample stack.',
    label: 'Open backoffice on seeded local data',
  },
];

export function getBackofficeRecoveryGuide(
  error: unknown,
  options: { nodeEnv?: string } = {},
): BackofficeRecoveryGuide {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const message = errorMessage(error);
  const code = errorCode(error);

  if (nodeEnv === 'production') {
    return {
      diagnostic: null,
      eyebrow: 'Operator error',
      isLocalSetup: false,
      primaryCommand: null,
      secondaryCommand: null,
      steps: ['Retry the request.', 'Check backoffice service logs if the problem continues.'],
      summary: 'Backoffice could not load this report.',
      title: 'Backoffice unavailable',
    };
  }

  if (
    message.includes('Backoffice runtime config is invalid') &&
    message.includes('DATABASE_URL')
  ) {
    return {
      diagnostic: message,
      eyebrow: 'Local preflight',
      isLocalSetup: true,
      primaryCommand: {
        command: 'npm run setup:backoffice:fixtures',
        helper: 'Starts clean PostgreSQL and Redis fixtures, then seeds a sample catalog.',
        label: 'Create the sample stack',
      },
      secondaryCommand: {
        command: 'npm run dev:backoffice:fixtures',
        helper: 'Stop the current dev server first, then reopen this console on sample data.',
        label: 'Run backoffice locally',
      },
      steps: [
        'Run `npm run setup:backoffice:fixtures` to start/reset deterministic PostgreSQL and Redis fixtures.',
        'Run `npm run dev:backoffice:fixtures` to open the backoffice against those fixtures.',
        'For seeded local data, run `npm run setup:backoffice:local-data`, then `npm run dev:backoffice`.',
      ],
      summary: 'DATABASE_URL is empty.',
      title: 'Wire local data',
    };
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  ) {
    return {
      diagnostic: message,
      eyebrow: 'Local preflight',
      isLocalSetup: true,
      primaryCommand: {
        command: 'npm run setup:backoffice:fixtures',
        helper: 'Refreshes the local PostgreSQL and Redis sample stack.',
        label: 'Refresh the sample stack',
      },
      secondaryCommand: {
        command: 'npm run dev:backoffice:fixtures',
        helper: 'Reopen the console after the services are healthy.',
        label: 'Run backoffice locally',
      },
      steps: [
        'Run `npm run setup:backoffice:fixtures` to bring up the deterministic local services.',
        'Then restart with `npm run dev:backoffice:fixtures`.',
      ],
      summary: 'Local data services are offline.',
      title: 'Local services offline',
    };
  }

  if (code === '42P01' || message.includes('relation') || message.includes('does not exist')) {
    return {
      diagnostic: message,
      eyebrow: 'Local preflight',
      isLocalSetup: true,
      primaryCommand: {
        command: 'npm run setup:backoffice:fixtures',
        helper: 'Reapplies migrations and sample data for the local console.',
        label: 'Rebuild the sample stack',
      },
      secondaryCommand: {
        command: 'npm run dev:backoffice:fixtures',
        helper: 'Reopen the console after migrations finish.',
        label: 'Run backoffice locally',
      },
      steps: [
        'Run `npm run setup:backoffice:fixtures` to reapply migrations and fixtures.',
        'For seeded local data, run `npm run migrate:db` after `npm run setup:backoffice:local-data`.',
      ],
      summary: 'Local schema is not ready.',
      title: 'Database schema required',
    };
  }

  return {
    diagnostic: message,
    eyebrow: 'Local preflight',
    isLocalSetup: true,
    primaryCommand: {
      command: 'npm run setup:backoffice:fixtures',
      helper: 'Refreshes local services and sample data.',
      label: 'Refresh the sample stack',
    },
    secondaryCommand: {
      command: 'npm run dev:backoffice:fixtures',
      helper: 'Reopen the console on the local sample environment.',
      label: 'Run backoffice locally',
    },
    steps: [
      'Retry the request.',
      'Run `npm run setup:backoffice:fixtures` and `npm run dev:backoffice:fixtures` for the deterministic local path.',
      'Check the terminal running backoffice for the full stack trace.',
    ],
    summary: 'Backoffice could not load this report.',
    title: 'Backoffice needs attention',
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown backoffice error.';
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
