'use client';

import { CheckCircle2, ListChecks, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

import { buildResultEvidenceViewModel, type ResultEvidenceItem } from './resultEvidenceViewModel';

import type { RecommendationResultSignals } from '@/lib/db/recommendations';
import type { MovieRecommendation } from '@/utils/client';

function EvidencePill({ item }: { item: ResultEvidenceItem }) {
  return (
    <li
      className="flex min-h-12 items-start gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
      >
        <CheckCircle2 size={12} />
      </span>
      <span className="min-w-0">
        <span
          className="block uppercase tracking-widest"
          style={{ color: 'var(--pc-t4)', fontSize: '0.58rem' }}
        >
          {item.label}
        </span>
        <span className="mt-0.5 block" style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}>
          {item.value}
        </span>
      </span>
    </li>
  );
}

function EvidenceColumn({
  icon,
  items,
  title,
}: {
  icon: 'sparkles' | 'checks';
  items: ResultEvidenceItem[];
  title: string;
}) {
  const Icon = icon === 'sparkles' ? Sparkles : ListChecks;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} style={{ color: 'var(--pc-gold-text)' }} />
        <h3
          className="uppercase tracking-widest"
          style={{ color: 'var(--pc-gold-text)', fontSize: '0.68rem' }}
        >
          {title}
        </h3>
      </div>
      <ul className="grid gap-2">
        {items.map((item) => (
          <EvidencePill key={`${item.label}-${item.value}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

export function ResultEvidencePanel({
  isGroupResult,
  movie,
  resultSignals,
  usedBroaderSearch,
}: {
  isGroupResult: boolean;
  movie: MovieRecommendation;
  resultSignals?: RecommendationResultSignals;
  usedBroaderSearch: boolean;
}) {
  const { t } = useLanguage();
  const view = buildResultEvidenceViewModel({
    copy: t.results,
    isGroupResult,
    movie,
    resultSignals,
    usedBroaderSearch,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
      className="mb-10 rounded-lg p-4 md:p-5"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      <div className="mb-5 flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'var(--pc-gold-subtle)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <SlidersHorizontal size={17} />
        </div>
        <div>
          <p
            className="uppercase tracking-widest"
            style={{ color: 'var(--pc-gold-text)', fontSize: '0.68rem' }}
          >
            {t.results.evidenceKicker}
          </p>
          <p className="mt-1" style={{ color: 'var(--pc-t3)', fontSize: '0.84rem' }}>
            {t.results.evidenceSubtitle}
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <EvidenceColumn
          icon="sparkles"
          items={view.fitSignals}
          title={t.results.evidenceFitTitle}
        />
        <EvidenceColumn
          icon="checks"
          items={view.consideredSignals}
          title={t.results.evidenceConsideredTitle}
        />
      </div>
    </motion.div>
  );
}
