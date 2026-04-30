'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

const TECH_GROUPS = [
  {
    label: 'Frontend',
    items: [
      {
        name: 'Next.js 15 + React 19',
        why: 'App Router, server components, full-stack TypeScript in a single repo',
      },
      {
        name: 'Tailwind CSS 4',
        why: 'Utility-first styling driven by CSS custom property design tokens',
      },
    ],
  },
  {
    label: 'AI + Data',
    items: [
      {
        name: 'OpenAI API',
        why: 'Embeddings encode taste profiles; GPT generates personalized recommendation explanations',
      },
      {
        name: 'pgvector (PostgreSQL)',
        why: 'Self-hosted vector similarity search — no external vector DB, just a PostgreSQL extension',
      },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      {
        name: 'Redis + BullMQ',
        why: 'Background job queue for the movie data backfill and discovery pipeline',
      },
      {
        name: 'Turborepo',
        why: 'Monorepo spanning the web app, shared packages, and worker services',
      },
      {
        name: 'Docker',
        why: 'Containerized deployment across all services',
      },
    ],
  },
] as const;

export function TechStackSection() {
  return (
    <section className="mb-16">
      <h2
        className="mb-8"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '1.6rem',
          letterSpacing: '0.05em',
          color: 'var(--pc-t1)',
        }}
      >
        Under the hood
      </h2>

      <div className="flex flex-col gap-10">
        {TECH_GROUPS.map((group, gi) => (
          <div key={group.label}>
            <p
              className="mb-3"
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
            <div
              style={{
                borderTop: '1px solid var(--pc-bd1)',
              }}
            >
              {group.items.map((item, ii) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: gi * 0.05 + ii * 0.06 }}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-3.5"
                  style={{ borderBottom: '1px solid var(--pc-bd1)' }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      color: 'var(--pc-t1)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      minWidth: '14rem',
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {item.why}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/tech-stack"
          className="inline-flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--pc-t3)', fontSize: '0.835rem' }}
        >
          Full stack breakdown →
        </Link>
      </div>
    </section>
  );
}
