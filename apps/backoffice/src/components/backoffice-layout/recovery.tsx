import { ButtonLink } from '@pop-choice/ui';

import { CopyCommandButton } from './copyCommandButton';
import {
  getBackofficeRecoveryGuide,
  SEEDED_LOCAL_COMMANDS,
  type BackofficeRecoveryGuide,
  type RecoveryCommand,
} from './recoveryGuide';
import { BackofficeLayout } from './shell';

import type { BackofficeSection } from './types';
import type { ReactNode } from 'react';

function renderRecoveryStep(step: string): ReactNode {
  return step.split(/(`[^`]+`)/).map((part, index) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function RecoveryCommandRow({
  index,
  label,
  recoveryCommand,
}: {
  index: number;
  label: string;
  recoveryCommand: RecoveryCommand;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-start">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgba(245,197,66,0.34)] bg-[rgba(245,197,66,0.1)] text-sm font-black text-[var(--brand)]"
        aria-hidden="true"
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <h3 className="m-0 text-base font-black text-[var(--text)]">{label}</h3>
          <span className="text-xs font-bold text-[var(--subtle)]">{recoveryCommand.helper}</span>
        </div>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-stretch">
          <code className="block flex-1 select-all break-all rounded-md bg-[#0d0f13] px-3 py-2 text-sm font-bold text-[var(--brand)] ring-1 ring-[rgba(245,197,66,0.18)]">
            {recoveryCommand.command}
          </code>
          <CopyCommandButton command={recoveryCommand.command} />
        </div>
      </div>
    </li>
  );
}

function CompactCommandRow({
  index,
  recoveryCommand,
}: {
  index: number;
  recoveryCommand: RecoveryCommand;
}) {
  return (
    <li className="flex flex-col gap-2 py-2 md:flex-row md:items-center">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgba(245,197,66,0.12)] text-xs font-black text-[var(--brand)]"
        aria-hidden="true"
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <h3 className="m-0 text-sm font-black text-[var(--text)]">{recoveryCommand.label}</h3>
          <span className="text-xs font-bold text-[var(--subtle)]">{recoveryCommand.helper}</span>
        </div>
        <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-stretch">
          <code className="block flex-1 select-all break-all rounded-md bg-[#0d0f13] px-3 py-2 text-sm font-bold text-[var(--brand)] ring-1 ring-[rgba(245,197,66,0.18)]">
            {recoveryCommand.command}
          </code>
          <CopyCommandButton command={recoveryCommand.command} />
        </div>
      </div>
    </li>
  );
}

function RecoveryStatusList({ recovery }: { recovery: BackofficeRecoveryGuide }) {
  const checks = recovery.summary.includes('DATABASE_URL')
    ? [
        ['Runtime config', 'Missing DATABASE_URL', 'attention'],
        ['PostgreSQL fixtures', 'Not checked yet', 'pending'],
        ['Redis fixtures', 'Not checked yet', 'pending'],
      ]
    : recovery.summary.includes('offline')
      ? [
          ['Runtime config', 'Ready', 'ok'],
          ['Local services', 'Connection failed', 'attention'],
          ['Next step', 'Reset fixtures', 'pending'],
        ]
      : recovery.summary.includes('schema')
        ? [
            ['Runtime config', 'Ready', 'ok'],
            ['Database schema', 'Needs migrations', 'attention'],
            ['Next step', 'Reapply fixtures', 'pending'],
          ]
        : [
            ['Runtime config', 'Unknown', 'pending'],
            ['Local services', 'Check terminal', 'pending'],
            ['Next step', 'Retry setup', 'pending'],
          ];

  return (
    <div className="py-1">
      <dl className="grid gap-4 md:flex md:gap-5">
        {checks.map(([label, value, state]) => (
          <div className="md:flex-1 md:px-4 md:first:pl-0 md:last:pr-0" key={label}>
            <dt className="text-xs font-bold text-[var(--subtle)]">{label}</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  state === 'ok'
                    ? 'bg-[var(--good)]'
                    : state === 'attention'
                      ? 'bg-[var(--warn)]'
                      : 'bg-[var(--subtle)]',
                ].join(' ')}
                aria-hidden="true"
              />
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-[70ch] text-xs font-bold text-[var(--subtle)]">
        After the sample stack is running, use Check again to confirm this console can reach it.
      </p>
    </div>
  );
}

export function BackofficeErrorPage({
  active = 'health',
  error,
  retryHref = '/',
}: {
  active?: BackofficeSection;
  error: unknown;
  retryHref?: string;
}) {
  const recovery = getBackofficeRecoveryGuide(error);
  const description = recovery.isLocalSetup
    ? 'The console is up. Connect a sample data stack, then keep designing and testing.'
    : 'The backoffice service is running, but the requested report could not be loaded.';

  return (
    <BackofficeLayout
      active={active}
      title={recovery.title}
      eyebrow={recovery.eyebrow}
      description={description}
      compactHeader={recovery.isLocalSetup}
      actions={
        <ButtonLink href={retryHref}>{recovery.isLocalSetup ? 'Check again' : 'Retry'}</ButtonLink>
      }
    >
      <section className="grid gap-5 py-2" aria-labelledby="backoffice-recovery-title">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[70ch]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--brand)]">
              Recovery plan
            </p>
            <h2
              className="mt-1 text-xl font-black text-[var(--text)]"
              id="backoffice-recovery-title"
            >
              {recovery.summary}
            </h2>
          </div>
          {recovery.isLocalSetup ? (
            <span className="w-fit rounded-full bg-[rgba(245,197,66,0.12)] px-3 py-1 text-xs font-black text-[var(--brand)]">
              Local only
            </span>
          ) : null}
        </div>

        {recovery.isLocalSetup ? <RecoveryStatusList recovery={recovery} /> : null}

        {recovery.primaryCommand && recovery.secondaryCommand ? (
          <ol className="m-0 grid list-none gap-6 p-0">
            <RecoveryCommandRow
              index={1}
              label={recovery.primaryCommand.label}
              recoveryCommand={recovery.primaryCommand}
            />
            <RecoveryCommandRow
              index={2}
              label={recovery.secondaryCommand.label}
              recoveryCommand={recovery.secondaryCommand}
            />
          </ol>
        ) : (
          <ol className="recovery-steps">
            {recovery.steps.map((step) => (
              <li key={step}>{renderRecoveryStep(step)}</li>
            ))}
          </ol>
        )}

        {recovery.isLocalSetup ? (
          <details className="pt-1" open>
            <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">
              Use seeded local data instead
            </summary>
            <p className="mt-2 text-sm font-bold text-[var(--muted)]">
              Use this path when you want real seeded catalog data instead of the sample stack.
            </p>
            <ol className="m-0 mt-3 grid list-none gap-3 p-0">
              {SEEDED_LOCAL_COMMANDS.map((command, index) => (
                <CompactCommandRow
                  index={index + 1}
                  key={command.command}
                  recoveryCommand={command}
                />
              ))}
            </ol>
          </details>
        ) : null}

        {recovery.diagnostic ? (
          <details className="diagnostic-details pt-1">
            <summary>Technical diagnostic</summary>
            <pre>{recovery.diagnostic}</pre>
          </details>
        ) : null}
      </section>
    </BackofficeLayout>
  );
}
