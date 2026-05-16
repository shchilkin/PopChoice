'use client';

import {
  AlertCircle,
  ArrowRight,
  Clapperboard,
  Film,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

type RecommendationSummary = {
  slug: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: string;
  createdAt: string;
  completedAt: string | null;
  peopleCount: number;
  movieName: string | null;
  movieYear: number | null;
  posterURL: string | null;
};

type AccountResponse = {
  user: { email: string };
  recommendations: RecommendationSummary[];
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loaded'; data: AccountResponse }
  | { status: 'error' };

const ACCOUNT_FETCH_TIMEOUT_MS = 10000;

export default function AccountPage() {
  const { auth } = useAuth();
  const { locale, t } = useLanguage();
  const a = t.account;
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ACCOUNT_FETCH_TIMEOUT_MS);

    async function loadAccount() {
      try {
        const response = await fetch('/api/account', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to load account');
        }

        const data = (await response.json()) as AccountResponse;
        if (!cancelled) {
          setState({ status: 'loaded', data });
        }
      } catch {
        if (!cancelled || timedOut) {
          setState({ status: 'error' });
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [auth.status]);

  if (auth.status === 'unknown' || (auth.status === 'authenticated' && state.status === 'idle')) {
    return (
      <AccountShell>
        <AccountLoadingState label={a.loading} />
      </AccountShell>
    );
  }

  if (auth.status !== 'authenticated') {
    return (
      <AccountShell>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
          >
            <UserRound size={26} />
          </div>
          <div>
            <h1
              className="mb-3 uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontSize: 'clamp(2rem, 8vw, 3.4rem)',
                fontWeight: 600,
                color: 'var(--pc-t1)',
              }}
            >
              {a.signedOutTitle}
            </h1>
            <p style={{ color: 'var(--pc-t2)' }}>{a.signedOutBody}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {t.nav.logIn}
            </Link>
            <Link
              href="/register"
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{
                background: 'var(--pc-ghost)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              {t.nav.signUp}
            </Link>
          </div>
        </motion.section>
      </AccountShell>
    );
  }

  if (state.status === 'error') {
    return (
      <AccountShell>
        <div
          className="mx-auto flex max-w-xl items-start gap-4 rounded-2xl p-5"
          style={{
            background: `${palette.red}14`,
            border: `1px solid ${palette.red}35`,
            color: 'var(--pc-t2)',
          }}
        >
          <AlertCircle size={22} style={{ color: palette.red }} />
          <div>
            <h1 className="mb-1 font-semibold" style={{ color: 'var(--pc-t1)' }}>
              {a.errorTitle}
            </h1>
            <p>{a.errorBody}</p>
          </div>
        </div>
      </AccountShell>
    );
  }

  if (state.status !== 'loaded') {
    return null;
  }

  const { user, recommendations } = state.data;

  return (
    <AccountShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="max-w-3xl">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{
                background: 'var(--pc-gold-subtle)',
                border: '1px solid var(--pc-gold-bd)',
                color: 'var(--pc-gold-text)',
              }}
            >
              <UserRound size={14} />
              {a.badge}
            </div>
            <h1
              className="uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontSize: 'clamp(2.4rem, 8vw, 4.6rem)',
                fontWeight: 600,
                lineHeight: 0.95,
                color: 'var(--pc-t1)',
              }}
            >
              {a.title}
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--pc-t2)' }}>
              {user.email}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/quiz"
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {a.newRecommendation}
            </Link>
            <Link
              href="/delete-account"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
              style={{
                background: 'var(--pc-ghost)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              <Trash2 size={15} />
              {a.deleteAccount}
            </Link>
          </div>
        </div>

        <section className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Sparkles size={18} style={{ color: 'var(--pc-gold-text)' }} />
            <h2
              className="uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                letterSpacing: '0.12em',
                color: 'var(--pc-gold-text)',
              }}
            >
              {a.savedTitle}
            </h2>
          </div>

          {recommendations.length === 0 ? (
            <div
              className="mx-auto rounded-2xl px-6 py-10 text-center md:px-10 md:py-12"
              style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
            >
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
              >
                <Clapperboard size={32} />
              </div>
              <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--pc-t1)' }}>
                {a.emptyTitle}
              </h3>
              <p className="mx-auto max-w-md" style={{ color: 'var(--pc-t2)' }}>
                {a.emptyBody}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recommendations.map((recommendation) => (
                <RecommendationRow
                  key={recommendation.slug}
                  recommendation={recommendation}
                  locale={locale}
                  labels={a}
                />
              ))}
            </div>
          )}
        </section>
      </motion.section>
    </AccountShell>
  );
}

function AccountShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-16">{children}</div>;
}

function AccountLoadingState({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <motion.div
        aria-hidden="true"
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'var(--pc-gold-subtle)',
          border: '1px solid var(--pc-gold-bd)',
          color: 'var(--pc-gold-text)',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Clapperboard size={30} />
      </motion.div>

      <p className="text-lg font-medium" style={{ color: 'var(--pc-t1)' }}>
        {label}
      </p>

      <div className="mt-8 grid w-full gap-3" aria-hidden="true">
        {[0, 1].map((index) => (
          <motion.div
            key={index}
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
            animate={{ opacity: [0.42, 0.72, 0.42] }}
            transition={{ duration: 1.6, delay: index * 0.18, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="h-16 w-12 rounded-xl" style={{ background: 'var(--pc-gold-subtle)' }} />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-3 w-24 rounded-full" style={{ background: 'var(--pc-bd2)' }} />
              <div className="h-4 w-3/4 rounded-full" style={{ background: 'var(--pc-bd2)' }} />
              <div className="h-3 w-1/2 rounded-full" style={{ background: 'var(--pc-bd1)' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecommendationRow({
  recommendation,
  locale,
  labels,
}: {
  recommendation: RecommendationSummary;
  locale: string;
  labels: ReturnType<typeof useLanguage>['t']['account'];
}) {
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(recommendation.createdAt));
  const title =
    recommendation.movieName ??
    (recommendation.status === 'completed' ? labels.untitledCompleted : labels.pendingTitle);
  const statusLabel = labels.status[recommendation.status] ?? recommendation.status;

  return (
    <Link
      href={`/results/${recommendation.slug}`}
      className="grid gap-4 rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 md:grid-cols-[88px_1fr]"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <div
        className="flex aspect-[2/3] w-20 items-center justify-center overflow-hidden rounded-xl md:w-[88px]"
        style={{ background: 'var(--pc-ghost)' }}
      >
        {recommendation.posterURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recommendation.posterURL}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Film size={22} style={{ color: 'var(--pc-t3)' }} />
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: statusBackground(recommendation.status),
              color: statusColor(recommendation.status),
            }}
          >
            {statusLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {date}
          </span>
        </div>
        <h3 className="truncate text-lg font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {title}
          {recommendation.movieYear ? ` (${recommendation.movieYear})` : ''}
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--pc-t3)' }}>
          {labels.peopleCount.replace('{count}', String(recommendation.peopleCount))}
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--pc-gold-text)' }}
        >
          {labels.openResult}
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
}

function statusBackground(status: RecommendationSummary['status']) {
  if (status === 'completed') return `${palette.green}18`;
  if (status === 'failed') return `${palette.red}18`;
  return 'var(--pc-gold-subtle)';
}

function statusColor(status: RecommendationSummary['status']) {
  if (status === 'completed') return palette.green;
  if (status === 'failed') return palette.red;
  return 'var(--pc-gold-text)';
}
