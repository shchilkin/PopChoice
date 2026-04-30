'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

const TECH_GROUPS = [
  {
    label: 'Frontend',
    items: [
      {
        name: 'Next.js 16',
        why: 'App Router and server components for streaming renders and full-stack TypeScript',
      },
      {
        name: 'React 19',
        why: 'Concurrent rendering and Actions for a highly responsive quiz experience',
      },
      {
        name: 'XState',
        why: 'Quiz logic modeled as a formal state machine for predictable flow and zero "if-spaghetti"',
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
        name: 'OpenAI text-embedding-3-large',
        why: 'Taste profile encoding into 3072-dimensional vectors for high-signal semantic search',
      },
      {
        name: 'gpt-5.4-mini',
        why: 'Fast, cost-effective generation of personalized recommendation explanations',
      },
      {
        name: 'PostgreSQL',
        why: 'Primary database for 400+ curated films, metadata, and vectors',
      },
      {
        name: 'pgvector',
        why: 'Self-hosted vector similarity search with automatic fallback to TMDb for broader discovery',
      },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      {
        name: 'Redis',
        why: 'High-performance coordination layer for job queues and API rate limiting',
      },
      {
        name: 'BullMQ',
        why: 'Background job processing for the movie data backfill and discovery pipeline',
      },
      {
        name: 'Railway',
        why: 'Cloud platform hosting containerized web app, worker services, and databases',
      },
      {
        name: 'Turborepo',
        why: 'Monorepo build system with high-performance caching and task orchestration',
      },
      {
        name: 'Docker',
        why: 'Containerized deployment for consistent environments across all services',
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
