'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

import { Breadcrumbs } from '@/components';
import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

const GROUP_COLORS = [palette.gold, palette.purple, palette.teal, palette.amber] as const;

const ITEM_NAMES = [
  ['Next.js 16', 'React 19', 'XState', 'Tailwind CSS 4', 'Motion', 'Lucide React'],
  ['OpenAI text-embedding-3-large', 'gpt-5.4-mini', 'PostgreSQL', 'pgvector'],
  ['Redis', 'BullMQ', 'Railway', 'Turborepo', 'Docker'],
  ['Vitest', 'Playwright', 'Storybook', 'MSW'],
] as const;

export default function TechStackPage() {
  const { t } = useLanguage();
  const { breadcrumbAbout, breadcrumbStack, title, intro, backToAbout, tryQuiz, groups } =
    t.techStackPage;

  return (
    <div className="px-5 py-12 max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <Breadcrumbs
          className="mb-3"
          items={[{ href: '/about', label: breadcrumbAbout }, { label: breadcrumbStack }]}
        />
        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 6vw, 3.2rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <p
          className="max-w-xl"
          style={{ color: 'var(--pc-t2)', lineHeight: 1.75, fontSize: '0.95rem' }}
        >
          {intro}
        </p>
      </motion.div>

      <div className="flex flex-col gap-20">
        {groups.map((group, gi) => {
          const color = GROUP_COLORS[gi];
          return (
            <motion.section
              key={gi}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: gi * 0.05 }}
            >
              <p
                className="mb-4"
                style={{
                  fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.12em',
                  color: 'var(--pc-t3)',
                }}
              >
                {group.label}
              </p>
              <div style={{ borderTop: '1px solid var(--pc-bd1)' }}>
                {group.items.map((item, ii) => (
                  <motion.div
                    key={ii}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: gi * 0.05 + ii * 0.08 }}
                    className="py-7"
                    style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                      <h2 style={{ color: 'var(--pc-t1)', fontWeight: 700, fontSize: '1rem' }}>
                        {ITEM_NAMES[gi]?.[ii]}
                      </h2>
                      <span
                        style={{
                          color,
                          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          fontSize: '0.7rem',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {item.role}
                      </span>
                    </div>
                    <p
                      className="mb-4 max-w-2xl"
                      style={{ color: 'var(--pc-t2)', fontSize: '0.9rem', lineHeight: 1.75 }}
                    >
                      {item.rationale}
                    </p>
                    {item.detail && (
                      <p
                        className="max-w-2xl px-4 py-3 rounded-lg"
                        style={{
                          color: 'var(--pc-t3)',
                          fontSize: '0.835rem',
                          lineHeight: 1.7,
                          background: 'var(--pc-surface-hover)',
                        }}
                      >
                        {item.detail}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mt-16 pt-8 flex flex-wrap items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--pc-bd1)' }}
      >
        <Link
          href="/about"
          className="inline-flex items-center gap-2 transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--pc-t3)', fontSize: '0.875rem' }}
        >
          {backToAbout}
        </Link>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {tryQuiz}
        </Link>
      </motion.div>
    </div>
  );
}
